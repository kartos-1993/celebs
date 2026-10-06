import { CommissionRule, CommissionScope, Prisma } from '@prisma/client';

import prisma from '@/config/db.prisma';

export interface FindCandidatesInput {
  vendorId?: string;
  categoryIds: string[];
  at: Date;
}

/**
 * Reads commission rules.
 *
 * All database access for the commission module lives here so the service stays
 * free of Prisma.
 */
export class CommissionRuleRepository {
  /**
   * Every rule that could apply, in one query.
   *
   * A rule is a candidate when it is active, published, not yet superseded, and
   * either the marketplace default or aimed at something on this line. Checkout
   * cannot afford three round trips to decide one percentage.
   *
   * `effective_to IS NULL` is what identifies "current": closing a rule sets it,
   * so superseded rules drop out without being deleted and the history of what we
   * charged stays readable.
   */
  async findCandidates(input: FindCandidatesInput) {
    const scopeFilter: Prisma.CommissionRuleWhereInput = {
      OR: [
        { scope: CommissionScope.GLOBAL },
        ...(input.vendorId ? [{ scope: CommissionScope.VENDOR, vendorId: input.vendorId }] : []),
        ...(input.categoryIds.length > 0
          ? [{ scope: CommissionScope.CATEGORY, categoryId: { in: input.categoryIds } }]
          : []),
      ],
    };

    const rules = await prisma.commissionRule.findMany({
      where: {
        isActive: true,
        effectiveFrom: { lte: input.at },
        effectiveTo: null,
        ...scopeFilter,
      },
      select: {
        id: true,
        scope: true,
        categoryId: true,
        vendorId: true,
        ratePercent: true,
      },
    });

    return rules;
  }

  /**
   * Opens a new rule and closes the one it supersedes, in one transaction.
   *
   * Not an in-place update. An order placed last week must keep the rate it was
   * charged, and while the order line already snapshots that, rewriting the rule
   * would still make the platform's record of its own pricing change retroactively
   * - which is exactly the sort of thing that cannot be explained to a seller.
   *
   * Both writes share a transaction so a rule is never momentarily duplicated or
   * briefly absent.
   */
  async publishRule(input: {
    scope: CommissionScope;
    ratePercent: Prisma.Decimal;
    categoryId?: string | null;
    vendorId?: string | null;
    label?: string;
    description?: string;
    createdBy?: string;
    at: Date;
  }) {
    return prisma.$transaction(async (tx) => {
      const superseded = await tx.commissionRule.findMany({
        where: {
          isActive: true,
          effectiveTo: null,
          effectiveFrom: { lte: input.at },
          scope: input.scope,
          categoryId: input.scope === CommissionScope.GLOBAL ? null : (input.categoryId ?? null),
          vendorId: input.scope === CommissionScope.VENDOR ? input.vendorId : null,
        },
        select: { id: true },
      });

      if (superseded.length > 0) {
        await tx.commissionRule.updateMany({
          where: { id: { in: superseded.map((rule) => rule.id) } },
          data: { effectiveTo: input.at },
        });
      }

      return tx.commissionRule.create({
        data: {
          scope: input.scope,
          ratePercent: input.ratePercent,
          categoryId: input.scope === CommissionScope.CATEGORY ? (input.categoryId ?? null) : null,
          vendorId: input.scope === CommissionScope.VENDOR ? (input.vendorId ?? null) : null,
          label: input.label,
          description: input.description,
          createdBy: input.createdBy,
          // Published immediately: an unpriced sale is worse than a briefly
          // mispriced one, so `effective_from` is now unless a backdate was asked
          // for explicitly.
          effectiveFrom: input.at,
        },
      });
    });
  }

  /** Current rules, for the superadmin list. Closed rules are history. */
  async listCurrent(): Promise<CommissionRule[]> {
    return prisma.commissionRule.findMany({
      where: { effectiveTo: null },
      orderBy: [{ scope: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /** The full rate history, oldest first. */
  async listHistory(): Promise<CommissionRule[]> {
    return prisma.commissionRule.findMany({ orderBy: { effectiveFrom: 'asc' } });
  }
}

export const commissionRuleRepository = new CommissionRuleRepository();
