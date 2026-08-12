export interface CreateShipmentPayload {
  orderId: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  city: string;
  district: string;
  codAmount: number;
  weightKg?: number;
}

export interface ShipmentResult {
  trackingNumber: string;
  trackingUrl: string;
  courierName: string;
  estimatedDelivery?: Date;
  rawResponse?: Record<string, unknown>;
}

export interface ILogisticsAdapter {
  createShipment(payload: CreateShipmentPayload): Promise<ShipmentResult>;
  trackShipment(trackingNumber: string): Promise<Record<string, unknown>>;
}
