import { CommissionScope, Prisma } from '@prisma/client';

import { AppError, ErrorCode, HTTPSTATUS } from '@celebs/shared-utils';

import {
  commissionForLine,
  MAX_COMMISSION_PERCENT,
  sellerNetForLine,
} from './commission-calculator';
import { CommissionRuleRepository } from './commission-rule.repository';

export interface ResolveRateInput {
  categoryId?: string | null;
  subcategoryId?: string | null;
  vendorId?: string | null;
  at?: Date;
}

/**
 * Which rate applies to a sale.
 *
 * Narrowest scope wins: a seller-specific agreement beats a category rate, which
 * beats the marketplace default. That ordering is the whole reason the rules are
 * separate rows rather than one number on a settings table - a seller who has
 * negotiated a rate must not be silently charged the category rate on a line that
 * happens to match both.
 *
 * Only one query, because the checkout path cannot afford three. All scopes come
 * back and the winner is chosen in memory.
 *
 * With no rule configured the rate is zero. Commission that nobody has set is not
 * a licence to invent one, and a seller being charged an unspecified percentage
 * is the fastest way to lose them.
 */
export class CommissionService {
  constructor(private readonly repository: CommissionRuleRepository = commissionRuleRepository) {}

  async resolveRatePercent(input: ResolveRateInput): Promise<Prisma.Decimal> {
    const at = input.at ?? new Date();
    const rules = await this.repository.findCandidates({
      vendorId: input.vendorId ?? undefined,
      categoryIds: [input.categoryId, input.subcategoryId].filter(
        (id): id is string => typeof id === 'string' && id.length > 0,
      ),
      at,
    });

    const ranked = rankByPrecedence(rules, input);
    const winner = ranked[0];

    return winner ? winner.ratePercent : new Prisma.Decimal(0);
  }

  /**
   * Freezes the rate and both amounts onto the order line.
   *
   * `sellerNetAmount` is derived by subtraction, never as
   * `subtotal * (1 - rate)`. That is not a style preference: the two disagree by
   * a paisa on many prices, and a seller whose earnings disagree with the
   * commission recorded beside them has no way to tell which is right.
   */
  async applyToLine(input: {
    lineId: string;
    subtotal: Prisma.Decimal;
    categoryId?: string | null;
    subcategoryId?: string | null;
    vendorId?: string | null;
    at?: Date;
  }): Promise<{
    ratePercent: Prisma.Decimal;
    commissionAmount: Prisma.Decimal;
    sellerNetAmount: Prisma.Decimal;
  }> {
    const ratePercent = await this.resolveRatePercent({
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      vendorId: input.vendorId,
      at: input.at,
    });

    const commissionAmount = commissionForLine(input.subtotal, ratePercent);

    return {
      ratePercent,
      commissionAmount,
      sellerNetAmount: sellerNetForLine(input.subtotal, commissionAmount),
    };
  }

  /**
   * Publishes a rule and closes the one it replaces.
   *
   * Effective dating rather than an in-place edit. Orders already placed keep the
   * rate frozen on their line either way, but rewriting history would make the
   * platform's own record of what it charged disagree with what it charged.
   */
  async setRate(input: {
    scope: CommissionScope;
    ratePercent: Prisma.Decimal;
    categoryId?: string | null;
    vendorId?: string | null;
    label?: string;
    description?: string;
    createdBy?: string;
    at?: Date;
  }) {
    if (input.ratePercent.lessThan(0) || input.ratePercent.greaterThan(MAX_COMMISSION_PERCENT)) {
      throw new AppError(
        `Commission rate must be between 0% and ${MAX_COMMISSION_PERCENT.toFixed(2)}%, got ${input.ratePercent.toFixed(2)}%`,
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    if (input.scope === CommissionScope.CATEGORY && !input.categoryId) {
      throw new AppError(
        'A category commission rule needs a category',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    if (input.scope === CommissionScope.VENDOR && !input.vendorId) {
      throw new AppError(
        'A vendor commission rule needs a vendor',
        HTTPSTATUS.BAD_REQUEST,
        ErrorCode.INVALID_REQUEST,
      );
    }

    const at = input.at ?? new Date();

    return this.repository.publishRule({ ...input, at });
  }

  /**
   * Rates in force right now.
   *
   * Only one GLOBAL rate can be current at a time - publishing a second closes the
   * first - but narrower rules coexist with it, which is the point of having
   * scopes at all.
   */
  async listCurrent() {
    return this.repository.listCurrent();
  }

  /**
   * Every rate ever published, oldest first.
   *
   * Kept because a seller disputing a charge months later needs to be able to
   * see what the rate was on the day, and "we changed it" is not an answer.
   */
  async listHistory() {
    return this.repository.listHistory();
  }
}

const commissionRuleRepository = new CommissionRuleRepository();

/**
 * Orders candidates narrowest-first: VENDOR, then CATEGORY, then GLOBAL.
 *
 * Within CATEGORY, a subcategory beats its parent. A parent category is a wider
 * scope than the subcategory beneath it, so a rate set on the subcategory is the
 * more specific statement of intent.
 */
export function rankByPrecedence(
  rules: ReadonlyArray<{
    scope: CommissionScope;
    categoryId: string | null;
    vendorId: string | null;
    ratePercent: Prisma.Decimal;
  }>,
  input: { categoryId?: string | null; subcategoryId?: string | null; vendorId?: string | null },
): typeof rules {
  const specificity = (rule: (typeof rules)[number]): number => {
    if (rule.scope === CommissionScope.VENDOR) {
      return rule.vendorId === input.vendorId ? 4 : -1;
    }

    if (rule.scope === CommissionScope.CATEGORY) {
      if (rule.categoryId && rule.categoryId === input.subcategoryId) return 3;
      if (rule.categoryId && rule.categoryId === input.categoryId) return 2;
      return -1;
    }

    return 1;
  };

  return [...rules].sort((a, b) => specificity(b) - specificity(a));
}

export const commissionService = new CommissionService();
