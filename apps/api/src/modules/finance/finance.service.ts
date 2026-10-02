import { SettlementService, settlementService } from './settlement/settlement.service';
import { FinanceRepository, financeRepository } from './finance.repository';

/**
 * The finance surface.
 *
 * Reads and writes are separate methods rather than one with a flag, because the
 * permissions guarding them differ: staff may look at a variance, only a finance
 * manager may resolve one. A single method would make it far too easy for the
 * guard to be attached to the wrong thing later.
 */
export class FinanceService {
  constructor(
    private readonly repo: FinanceRepository = financeRepository,
    private readonly settlements: SettlementService = settlementService,
  ) {}

  async listLedger(query: {
    page: number;
    limit: number;
    courier?: string;
    type?: string;
    from?: Date;
    to?: Date;
  }) {
    const { items, total } = await this.repo.listLedgerEntries(query);

    return {
      items: items.map((entry) => FinanceRepository.serialiseEntry(entry)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async listSettlements(query: { page: number; limit: number; courier?: string }) {
    const { items, total } = await this.repo.listSettlementBatches(
      query.page,
      query.limit,
      query.courier,
    );

    return {
      items: items.map((batch) => FinanceRepository.serialiseBatch(batch)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async openBatch(input: { courier: string; periodStart: Date; periodEnd: Date }) {
    return FinanceRepository.serialiseBatch(await this.settlements.openBatch(input));
  }

  async recordStatement(input: {
    batchId: string;
    declaredCollected: number;
    declaredFees: number;
    reference?: string;
    notes?: string;
  }) {
    const batch = await this.settlements.recordStatement(input);
    return FinanceRepository.serialiseBatch(batch);
  }

  async reconcile(batchId: string, reconciledBy: string) {
    return FinanceRepository.serialiseBatch(
      await this.settlements.reconcile({ batchId, reconciledBy }),
    );
  }

  async markPaid(batchId: string, paidBy: string) {
    return FinanceRepository.serialiseBatch(await this.settlements.markPaid({ batchId, paidBy }));
  }
}

export const financeService = new FinanceService();
