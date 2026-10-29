import { Request, Response } from 'express';

import {
  codSettlementSchema,
  courierWebhookSchema,
  dispatchOrderSchema,
} from '@celebs/shared-types';
import { asyncHandler, BadRequestException, UnauthorizedException } from '@celebs/shared-utils';

import {
  PATHAO_ECHO_HEADER,
  PATHAO_HANDSHAKE_EVENT,
  PATHAO_SIGNATURE_HEADER,
  readPathaoWebhookSecret,
  verifyPathaoWebhookSignature,
} from './adapters/pathao-webhook.verify';
import {
  type DeliveryLocationRepository,
  deliveryLocationRepository,
} from './delivery-location.repository';
import { type LogisticsService, logisticsService } from './logistics.service';

import { isPlatformActor } from '@/common/context/actor-context';
import { sendSuccess } from '@/common/utils/response.util';

export class LogisticsController {
  private service: LogisticsService;

  constructor(
    service: LogisticsService = logisticsService,
    private readonly locationRepo: DeliveryLocationRepository = deliveryLocationRepository,
  ) {
    this.service = service;
  }

  /**
   * Delivery provinces, districts and areas for the address form.
   *
   * Unauthenticated on purpose: a customer chooses where they live before they
   * have an account, and the payload is place names only.
   */
  public listDeliveryLocations = asyncHandler(async (_req: Request, res: Response) => {
    const locations = await this.locationRepo.listLocations();

    return sendSuccess(res, locations, 'Delivery locations retrieved successfully');
  });

  public dispatchOrder = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const validated = dispatchOrderSchema.parse({
      orderId,
      provider: req.body.provider || 'PATHAO',
      ...req.body,
    });

    // Platform operators dispatch with global scope (null); sellers scope to own store
    const isPlatform = isPlatformActor(req.actor);
    const actorStoreId = isPlatform ? null : (req.store?.id ?? null);
    const result = await this.service.dispatchOrder(validated, actorStoreId);

    return sendSuccess(res, result, 'Order dispatched successfully');
  });

  public settleCod = asyncHandler(async (req: Request, res: Response) => {
    const { orderId } = req.params;
    const validated = codSettlementSchema.parse({
      orderId,
      settlementReference: req.body.reference || req.body.settlementReference,
    });

    const result = await this.service.markCodSettled(
      validated.orderId,
      validated.settlementReference,
    );

    return sendSuccess(res, result, 'COD payment settled successfully');
  });

  public settleConsignmentCod = asyncHandler(async (req: Request, res: Response) => {
    const { trackingNumber } = req.params;
    const settlementReference = String(
      req.body.reference || req.body.settlementReference || '',
    ).trim();

    if (!settlementReference || settlementReference.length < 2) {
      throw new BadRequestException('Settlement reference statement ID is required');
    }

    const result = await this.service.markConsignmentCodSettled(
      String(trackingNumber),
      settlementReference,
    );

    return sendSuccess(res, result, 'Consignment COD payment settled successfully');
  });

  public handleCourierWebhook = asyncHandler(async (req: Request, res: Response) => {
    // The courier proves itself before anything is parsed. Without the secret
    // configured (local development, tests) the route stays open; with it set,
    // a request that does not echo it is refused with a 401 and the body is
    // never trusted. In production or staging, an unconfigured secret fails closed.
    const secret = readPathaoWebhookSecret();
    const isStagingOrProduction =
      process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

    if (isStagingOrProduction && !secret) {
      throw new UnauthorizedException('Courier webhook secret is not configured on the platform');
    }

    if (secret) {
      const signature = req.headers[PATHAO_SIGNATURE_HEADER];
      const ok = verifyPathaoWebhookSignature({
        signature: Array.isArray(signature) ? signature[0] : signature,
        secret,
      });

      if (!ok) {
        throw new UnauthorizedException('Courier webhook signature verification failed');
      }
    }

    // Pathao's integration handshake carries no consignment, so it is answered
    // before validation: it must return 202 with the secret echoed back, or
    // Pathao never activates the endpoint.
    if ((req.body as { event?: unknown } | null)?.event === PATHAO_HANDSHAKE_EVENT) {
      res.setHeader(PATHAO_ECHO_HEADER, secret);
      return sendSuccess(res, { integrated: true }, 'Webhook integration verified', 202);
    }

    // Validated rather than hand-checked, so a malformed delivery is refused
    // through the standard path and answered with the shared error envelope.
    const body = courierWebhookSchema.parse(req.body);

    const result = await this.service.processCourierWebhook({
      consignmentId: body.consignment_id,
      merchantOrderId: body.merchant_order_id,
      event: body.event,
    });

    return sendSuccess(res, result, 'Courier tracking event processed successfully');
  });
}

export const logisticsController = new LogisticsController();
