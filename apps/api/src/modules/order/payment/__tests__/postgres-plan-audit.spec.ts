import { describe, expect, it } from 'vitest';

import prisma from '@/config/db.prisma';

interface PgExplainRow {
  'QUERY PLAN': string;
}

interface PgIndexRow {
  tablename: string;
  indexname: string;
  indexdef: string;
}

describe('PostgreSQL execution plan and index verification', () => {
  it('verifies that pessimistic locking uses the primary key index scan without table scans', async () => {
    // 1. Audit active index on Order PK
    const pkIndex = await prisma.$queryRawUnsafe<PgIndexRow[]>(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'Order' AND indexname = 'Order_pkey';
    `);
    expect(pkIndex.length).toBe(1);

    // 2. Run EXPLAIN on the exact row lock query used in applyPaymentStatusUpdate
    const planRows = await prisma.$queryRawUnsafe<PgExplainRow[]>(`
      EXPLAIN (VERBOSE)
      SELECT id FROM "Order" WHERE id = '00000000-0000-0000-0000-000000000000' FOR UPDATE;
    `);

    const planOutput = planRows.map((r) => r['QUERY PLAN']).join('\n');

    // Asserts Index Scan using Order_pkey — zero sequential scans
    expect(planOutput).toContain('Order_pkey');
    expect(planOutput).toContain('Index Scan');
    expect(planOutput).not.toContain('Seq Scan');
  });

  it('verifies that batch inventory restoration uses the primary key index scan on ProductInventory', async () => {
    // 1. Audit active index on ProductInventory PK
    const pkIndex = await prisma.$queryRawUnsafe<PgIndexRow[]>(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'ProductInventory' AND indexname = 'ProductInventory_pkey';
    `);
    expect(pkIndex.length).toBe(1);

    // 2. Run EXPLAIN on the exact batch update query used in applyOrderCancellation
    const planRows = await prisma.$queryRawUnsafe<PgExplainRow[]>(`
      EXPLAIN (VERBOSE)
      UPDATE "ProductInventory" AS p
      SET "reserved_quantity" = GREATEST(0, p."reserved_quantity" - u.qty)
      FROM (
        SELECT
          unnest(ARRAY['00000000-0000-0000-0000-000000000000']::text[]) AS id,
          unnest(ARRAY[1]::int[]) AS qty
      ) AS u
      WHERE p.id = u.id;
    `);

    const planOutput = planRows.map((r) => r['QUERY PLAN']).join('\n');

    // Asserts ProductInventory_pkey index lookup
    expect(planOutput).toContain('ProductInventory_pkey');
  });

  it('verifies that Payment records have covering indexes on orderId and userId', async () => {
    const paymentIndexes = await prisma.$queryRawUnsafe<PgIndexRow[]>(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'Payment';
    `);

    const indexDefs = paymentIndexes.map((i) => i.indexdef).join(' ');

    // Covering indexes eliminate table scans during payment reconciliations and user order lookups
    expect(indexDefs).toContain('order_id');
    expect(indexDefs).toContain('user_id');
  });
});
