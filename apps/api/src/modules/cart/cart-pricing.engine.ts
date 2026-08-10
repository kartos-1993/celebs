import { Prisma } from '@prisma/client';
import crypto from 'crypto';

export interface PricingItem {
  inventoryId: string;
  sku: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
}

export interface DiscountRule {
  id: string;
  code?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: Prisma.Decimal;
  isExclusive?: boolean;
}

export interface PricingCalculationResult {
  subtotal: Prisma.Decimal;
  totalDiscount: Prisma.Decimal;
  shippingFee: Prisma.Decimal;
  total: Prisma.Decimal;
  itemCount: number;
  appliedDiscounts: Array<{ id: string; code?: string; amount: Prisma.Decimal }>;
  idempotencyKey: string;
}

export class CartPricingEngine {
  /**
   * Calculates exact monetary cart totals using Prisma.Decimal to prevent floating-point precision issues.
   * Enforces exclusive vs combinable discount rules and ensures total never falls below 0.
   */
  static calculateCartTotal(
    items: PricingItem[],
    discounts: DiscountRule[] = [],
    shippingFeeInput: Prisma.Decimal = new Prisma.Decimal(0)
  ): PricingCalculationResult {
    let subtotal = new Prisma.Decimal(0);
    let totalItemCount = 0;

    // Calculate Subtotal using Prisma.Decimal arithmetic
    for (const item of items) {
      const itemQty = new Prisma.Decimal(item.quantity);
      const itemSubtotal = item.unitPrice.mul(itemQty);
      subtotal = subtotal.add(itemSubtotal);
      totalItemCount += item.quantity;
    }

    const shippingFee = shippingFeeInput.gte(0) ? shippingFeeInput : new Prisma.Decimal(0);
    let totalDiscount = new Prisma.Decimal(0);
    const appliedDiscounts: Array<{ id: string; code?: string; amount: Prisma.Decimal }> = [];

    // Filter and apply discounts
    const exclusiveDiscount = discounts.find((d) => d.isExclusive);

    if (exclusiveDiscount) {
      // Exclusive discount rule: ONLY this discount is applied
      const amount = this.calculateDiscountAmount(subtotal, exclusiveDiscount);
      totalDiscount = amount;
      appliedDiscounts.push({
        id: exclusiveDiscount.id,
        code: exclusiveDiscount.code,
        amount,
      });
    } else if (discounts.length > 0) {
      // Combinable discount rules: applied sequentially against remaining subtotal
      let currentSubtotal = subtotal;

      for (const discount of discounts) {
        if (currentSubtotal.lte(0)) break;

        const amount = this.calculateDiscountAmount(currentSubtotal, discount);
        if (amount.gt(0)) {
          totalDiscount = totalDiscount.add(amount);
          currentSubtotal = currentSubtotal.sub(amount);
          appliedDiscounts.push({
            id: discount.id,
            code: discount.code,
            amount,
          });
        }
      }
    }

    // Cap total discount so total never drops below 0
    if (totalDiscount.gt(subtotal)) {
      totalDiscount = subtotal;
    }

    const totalBeforeShipping = subtotal.sub(totalDiscount);
    const finalTotal = totalBeforeShipping.add(shippingFee);
    const cappedTotal = finalTotal.gte(0) ? finalTotal : new Prisma.Decimal(0);

    // Generate deterministic idempotencyKey based on cart state
    const idempotencyKey = this.generateIdempotencyKey(items, appliedDiscounts, cappedTotal);

    return {
      subtotal,
      totalDiscount,
      shippingFee,
      total: cappedTotal,
      itemCount: totalItemCount,
      appliedDiscounts,
      idempotencyKey,
    };
  }

  private static calculateDiscountAmount(base: Prisma.Decimal, discount: DiscountRule): Prisma.Decimal {
    if (base.lte(0)) return new Prisma.Decimal(0);

    if (discount.discountType === 'PERCENTAGE') {
      const percentage = discount.discountValue.div(new Prisma.Decimal(100));
      return base.mul(percentage).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    } else {
      // FIXED_AMOUNT
      return discount.discountValue.gt(base) ? base : discount.discountValue;
    }
  }

  private static generateIdempotencyKey(
    items: PricingItem[],
    discounts: Array<{ id: string; amount: Prisma.Decimal }>,
    total: Prisma.Decimal
  ): string {
    const payload = {
      items: items
        .map((i) => `${i.inventoryId}:${i.quantity}:${i.unitPrice.toString()}`)
        .sort()
        .join('|'),
      discounts: discounts
        .map((d) => `${d.id}:${d.amount.toString()}`)
        .sort()
        .join('|'),
      total: total.toString(),
    };

    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }
}
