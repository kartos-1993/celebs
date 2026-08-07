import { Prisma } from '@prisma/client';

export interface CartPricingInputItem {
  id: string;
  unitPrice: number | Prisma.Decimal;
  quantity: number;
  comboBundleId?: string | null;
  comboDiscountType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | null;
  comboDiscountValue?: number | Prisma.Decimal | null;
  festivalDiscountPercent?: number | null;
}

export interface CalculatedLineItem {
  id: string;
  unitPrice: number;
  quantity: number;
  baseSubtotal: number;
  comboDiscount: number;
  festivalDiscount: number;
  finalSubtotal: number;
}

export interface CartPricingSummary {
  items: CalculatedLineItem[];
  subtotal: number;
  totalComboDiscount: number;
  totalFestivalDiscount: number;
  deliveryFee: number;
  codSurcharge: number;
  grandTotal: number;
}

export interface CartPricingOptions {
  deliveryFee?: number;
  isCod?: boolean;
  codSurchargeAmount?: number;
  maxDiscountPercentageCap?: number; // Default 50%
}

export class CartPricingEngine {
  public static calculate(
    rawItems: CartPricingInputItem[],
    options: CartPricingOptions = {}
  ): CartPricingSummary {
    const deliveryFee = options.deliveryFee ?? 150;
    const codSurcharge = options.isCod ? (options.codSurchargeAmount ?? 50) : 0;
    const maxDiscountCap = options.maxDiscountPercentageCap ?? 50;

    let subtotal = 0;
    let totalComboDiscount = 0;
    let totalFestivalDiscount = 0;

    const items: CalculatedLineItem[] = rawItems.map((item) => {
      const unitPrice = Number(item.unitPrice);
      const quantity = Math.max(1, item.quantity);
      const baseSubtotal = unitPrice * quantity;
      subtotal += baseSubtotal;

      let comboDiscount = 0;
      if (item.comboBundleId && item.comboDiscountValue) {
        const val = Number(item.comboDiscountValue);
        if (item.comboDiscountType === 'PERCENTAGE') {
          comboDiscount = (baseSubtotal * val) / 100;
        } else if (item.comboDiscountType === 'FIXED_AMOUNT') {
          // SAFETY GUARD: FIXED_AMOUNT discount cannot exceed base item subtotal
          comboDiscount = Math.min(val, baseSubtotal);
        }
      }

      let remainingAfterCombo = baseSubtotal - comboDiscount;
      let festivalDiscount = 0;

      if (item.festivalDiscountPercent && item.festivalDiscountPercent > 0) {
        festivalDiscount = (remainingAfterCombo * item.festivalDiscountPercent) / 100;
      }

      // Max discount cap safety guard (never exceed e.g. 50% of base item subtotal)
      const maxAllowedDiscount = (baseSubtotal * maxDiscountCap) / 100;
      const combinedDiscount = comboDiscount + festivalDiscount;

      let finalComboDiscount = comboDiscount;
      let finalFestivalDiscount = festivalDiscount;

      if (combinedDiscount > maxAllowedDiscount) {
        // Proportionally scale discounts to fit within cap
        const ratio = maxAllowedDiscount / combinedDiscount;
        finalComboDiscount = Math.round(comboDiscount * ratio * 100) / 100;
        finalFestivalDiscount = Math.round(festivalDiscount * ratio * 100) / 100;
      }

      totalComboDiscount += finalComboDiscount;
      totalFestivalDiscount += finalFestivalDiscount;

      const finalSubtotal = Math.max(0, baseSubtotal - finalComboDiscount - finalFestivalDiscount);

      return {
        id: item.id,
        unitPrice,
        quantity,
        baseSubtotal,
        comboDiscount: Math.round(finalComboDiscount * 100) / 100,
        festivalDiscount: Math.round(finalFestivalDiscount * 100) / 100,
        finalSubtotal: Math.round(finalSubtotal * 100) / 100,
      };
    });

    const netItemTotal = subtotal - totalComboDiscount - totalFestivalDiscount;
    const grandTotal = Math.max(0, netItemTotal + deliveryFee + codSurcharge);

    return {
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      totalComboDiscount: Math.round(totalComboDiscount * 100) / 100,
      totalFestivalDiscount: Math.round(totalFestivalDiscount * 100) / 100,
      deliveryFee,
      codSurcharge,
      grandTotal: Math.round(grandTotal * 100) / 100,
    };
  }
}
