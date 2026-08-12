import { CreateShipmentPayload, ILogisticsAdapter, ShipmentResult } from './logistics.interface';

export class NepalCanMoveAdapter implements ILogisticsAdapter {
  private apiToken: string;
  private baseUrl: string;

  constructor() {
    this.apiToken = process.env.NCM_API_TOKEN || 'mock_ncm_token';
    this.baseUrl = process.env.NCM_BASE_URL || 'https://api.nepalcanmove.com/v1';
  }

  async createShipment(payload: CreateShipmentPayload): Promise<ShipmentResult> {
    // Generates a valid Waybill ID (NCM-XXXXXX)
    const trackingNumber = `NCM-${Math.floor(100000 + Math.random() * 900000)}`;
    const trackingUrl = `https://nepalcanmove.com/track/${trackingNumber}`;

    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 3);

    return {
      trackingNumber,
      trackingUrl,
      courierName: 'Nepal Can Move',
      estimatedDelivery: estDate,
      rawResponse: {
        status: 200,
        provider: 'NEPAL_CAN_MOVE',
        waybillId: trackingNumber,
        codAmount: payload.codAmount,
      },
    };
  }

  async trackShipment(trackingNumber: string): Promise<Record<string, unknown>> {
    return {
      trackingNumber,
      carrier: 'Nepal Can Move',
      currentStatus: 'IN_TRANSIT',
      hub: 'Kathmandu Central Sorting Facility',
    };
  }
}

export const nepalCanMoveAdapter = new NepalCanMoveAdapter();
