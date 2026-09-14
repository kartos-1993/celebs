import { Request, Response } from 'express';

import { updatePaymentStatusSchema } from '@celebs/shared-types';

import { PaymentService, paymentService } from './payment.service';

import { sendSuccess } from '@/common/utils/response.util';

export class PaymentController {
  constructor(private service: PaymentService = paymentService) {}

  private redirectToApp(
    res: Response,
    params: { status: string; orderId?: string; gateway: string; ref?: string },
  ) {
    const base = process.env.APP_PAYMENT_RESULT_URL || 'celebs://payment-result';
    const query = new URLSearchParams({
      status: params.status,
      gateway: params.gateway,
      ...(params.orderId ? { orderId: params.orderId } : {}),
      ...(params.ref ? { ref: params.ref } : {}),
    });
    return res.redirect(302, `${base}?${query.toString()}`);
  }

  adminUpdatePaymentStatus = async (req: Request, res: Response) => {
    const orderId = req.params.orderId || '';
    const validated = updatePaymentStatusSchema.parse(req.body);
    const actorLabel = req.actor ? `${req.actor.role}:${req.actor.email}` : 'PLATFORM';

    const updated = await this.service.updatePaymentStatus(orderId, validated, actorLabel);
    return sendSuccess(res, updated, 'Order payment status updated successfully');
  };

  esewaSuccess = async (req: Request, res: Response) => {
    const data = req.query.data as string | undefined;
    if (!data) {
      return this.redirectToApp(res, { status: 'FAILED', gateway: 'ESEWA' });
    }
    try {
      const { order, verification } = await this.service.confirmEsewaPayment(data);
      return this.redirectToApp(res, {
        status: verification.status,
        orderId: order?.id,
        gateway: 'ESEWA',
        ref: verification.transactionId,
      });
    } catch {
      return this.redirectToApp(res, { status: 'FAILED', gateway: 'ESEWA' });
    }
  };

  esewaFailure = async (req: Request, res: Response) => {
    const data = req.query.data as string | undefined;
    if (data) {
      try {
        const { order, verification } = await this.service.confirmEsewaPayment(data);
        return this.redirectToApp(res, {
          status: verification.status,
          orderId: order?.id,
          gateway: 'ESEWA',
          ref: verification.transactionId,
        });
      } catch {
        // Fall through to FAILED below.
      }
    }
    return this.redirectToApp(res, { status: 'FAILED', gateway: 'ESEWA' });
  };

  esewaForm = async (req: Request, res: Response) => {
    const orderId = req.params.orderId || '';
    const { actionUrl, fields } = await this.service.getEsewaFormFields(orderId);

    if (actionUrl && actionUrl.includes('bookingId=')) {
      return res.redirect(302, actionUrl);
    }

    try {
      const formData = new URLSearchParams(fields);
      const bookingRes = await fetch(actionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
        redirect: 'manual',
        signal: AbortSignal.timeout(4000),
      });
      const location = bookingRes.headers.get('location');
      if (location && location.startsWith('http')) {
        return res.redirect(302, location);
      }
    } catch {
      // Fall through to HTML bridge
    }

    const escape = (value: string): string =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const inputs = Object.entries(fields)
      .map(([name, value]) => `<input type="hidden" name="${name}" value="${escape(value)}" />`)
      .join('');

    res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Connecting to eSewa...</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0b0f19;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #151d2f;
      border: 1px solid #1e293b;
      border-radius: 20px;
      padding: 36px 28px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
    }
    .badge {
      display: inline-block;
      background: rgba(96, 187, 70, 0.15);
      color: #60bb46;
      font-weight: 700;
      font-size: 13px;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-bottom: 20px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .spinner {
      width: 52px;
      height: 52px;
      border: 4px solid #1e293b;
      border-top-color: #60bb46;
      border-radius: 50%;
      animation: spin 0.9s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite;
      margin: 0 auto 24px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #ffffff; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
    .amount-box {
      background: #0b0f19;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 24px;
    }
    .amount-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .amount-value { font-size: 26px; font-weight: 800; color: #60bb46; margin-top: 4px; }
    .btn {
      display: block;
      width: 100%;
      background: #60bb46;
      color: #ffffff;
      padding: 14px 20px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.1s ease;
    }
    .btn:hover { background: #52a43b; }
    .btn:active { transform: scale(0.98); }
    .hint { font-size: 12px; color: #64748b; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">eSewa ePay v2</div>
    <div class="spinner"></div>
    <h2>Connecting to eSewa</h2>
    <p>Please wait while we redirect you to the official eSewa secure payment portal...</p>
    <div class="amount-box">
      <div class="amount-label">Total to Pay</div>
      <div class="amount-value">NPR ${escape(fields.total_amount || '0.00')}</div>
    </div>
    <form id="esewa-form" action="${escape(actionUrl)}" method="POST">
      ${inputs}
      <button type="submit" class="btn" id="submit-btn">Tap to Continue to eSewa</button>
    </form>
    <div class="hint">Auto-redirecting... If nothing happens, tap the button above.</div>
  </div>
  <script>
    (function() {
      var form = document.getElementById('esewa-form');
      if (form) {
        setTimeout(function() {
          form.submit();
        }, 150);
      }
    })();
  </script>
</body>
</html>`);
  };

  khaltiReturn = async (req: Request, res: Response) => {
    const pidx = req.query.pidx as string | undefined;
    if (!pidx) {
      return this.redirectToApp(res, { status: 'FAILED', gateway: 'KHALTI' });
    }
    try {
      const { order, verification } = await this.service.confirmKhaltiPayment(pidx);
      return this.redirectToApp(res, {
        status: verification.status,
        orderId: order?.id,
        gateway: 'KHALTI',
        ref: verification.transactionId,
      });
    } catch {
      return this.redirectToApp(res, { status: 'FAILED', gateway: 'KHALTI' });
    }
  };
}

export const paymentController = new PaymentController();
