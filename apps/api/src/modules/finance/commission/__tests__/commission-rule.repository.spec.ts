import { CommissionScope } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { commissionRuleRepository } from '../commission-rule.repository';

import prisma, { Prisma } from '@/config/db.prisma';

describe('CommissionRuleRepository', () => {
  beforeEach(async () => {
    // Clear commission rules and categories between tests to ensure complete test isolation
    await prisma.commissionRule.deleteMany({});
  });

  describe('publishRule', () => {
    it('publishes a new global rule and supersedes the existing rule with effectiveTo', async () => {
      const now = new Date();
      const first = await commissionRuleRepository.publishRule({
        scope: CommissionScope.GLOBAL,
        ratePercent: new Prisma.Decimal('7.50'),
        label: 'Platform Default 7.5%',
        at: now,
      });

      expect(first.scope).toBe(CommissionScope.GLOBAL);
      expect(first.ratePercent.toString()).toBe('7.5');
      expect(first.effectiveTo).toBeNull();

      const later = new Date(now.getTime() + 60_000);
      const second = await commissionRuleRepository.publishRule({
        scope: CommissionScope.GLOBAL,
        ratePercent: new Prisma.Decimal('9.00'),
        label: 'Platform Default 9%',
        at: later,
      });

      expect(second.scope).toBe(CommissionScope.GLOBAL);
      expect(second.ratePercent.toString()).toBe('9');
      expect(second.effectiveTo).toBeNull();

      // Verify the first rule was superseded and has effectiveTo set to later
      const reloadedFirst = await prisma.commissionRule.findUniqueOrThrow({
        where: { id: first.id },
      });
      expect(reloadedFirst.effectiveTo).toEqual(later);

      // Verify listCurrent returns only the single active rule
      const current = await commissionRuleRepository.listCurrent();
      expect(current).toHaveLength(1);
      expect(current[0]?.id).toBe(second.id);
    });

    // Concurrency guard: when two administrators publish a new commission rate
    // simultaneously, only one active rule with effectiveTo: null may remain current.
    // Without transaction serialization or locking, both concurrent transactions
    // read the same superseded set, both update it, and both insert a new rule with
    // effectiveTo: null, leaving multiple 'current' rules in force simultaneously.
    it('ensures only a single active rule remains current when multiple global rates are published concurrently', async () => {
      const at = new Date();

      // Launch two publish operations concurrently
      const [first, second] = await Promise.all([
        commissionRuleRepository.publishRule({
          scope: CommissionScope.GLOBAL,
          ratePercent: new Prisma.Decimal('5.00'),
          label: 'Concurrent Rate A',
          at,
        }),
        commissionRuleRepository.publishRule({
          scope: CommissionScope.GLOBAL,
          ratePercent: new Prisma.Decimal('6.00'),
          label: 'Concurrent Rate B',
          at,
        }),
      ]);

      expect(first).toBeDefined();
      expect(second).toBeDefined();

      // After both concurrent transactions resolve, exactly ONE active global rule must have effectiveTo: null
      const currentRules = await prisma.commissionRule.findMany({
        where: {
          scope: CommissionScope.GLOBAL,
          isActive: true,
          effectiveTo: null,
        },
      });

      expect(currentRules).toHaveLength(1);
    });

    it('ensures only a single active rule remains current when multiple category rates are published concurrently', async () => {
      const category = await prisma.category.create({
        data: {
          name: `Electronics-${Date.now()}`,
          slug: `electronics-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        },
      });

      const at = new Date();

      // Launch two category publish operations concurrently for the same category
      const [first, second] = await Promise.all([
        commissionRuleRepository.publishRule({
          scope: CommissionScope.CATEGORY,
          categoryId: category.id,
          ratePercent: new Prisma.Decimal('12.00'),
          label: 'Electronics Rate 12%',
          at,
        }),
        commissionRuleRepository.publishRule({
          scope: CommissionScope.CATEGORY,
          categoryId: category.id,
          ratePercent: new Prisma.Decimal('15.00'),
          label: 'Electronics Rate 15%',
          at,
        }),
      ]);

      expect(first).toBeDefined();
      expect(second).toBeDefined();

      // Exactly ONE category rule must remain active with effectiveTo: null for this category
      const currentCategoryRules = await prisma.commissionRule.findMany({
        where: {
          scope: CommissionScope.CATEGORY,
          categoryId: category.id,
          isActive: true,
          effectiveTo: null,
        },
      });

      expect(currentCategoryRules).toHaveLength(1);
    });
  });
});
