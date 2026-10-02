import { afterAll, beforeEach, vi } from 'vitest';

import prisma from '@/config/db.prisma';

/**
 * Tests must not open broker connections.
 *
 * Every queue and worker is constructed at module scope - importing
 * `queue.service` opens five, and importing a worker opens one that starts
 * consuming jobs - so a spec that imports a module to reach a function beside it
 * leaves a live connection behind. The run then finishes its assertions and hangs
 * instead of exiting, which turned a 27 minute suite into a 10 hour one.
 *
 * Closing them afterwards is worse than useless: BullMQ's ioredis still has
 * commands in flight when the connection goes, so each close raises EPIPE as an
 * unhandled rejection and the suite exits non-zero with every test green. That is
 * the same failure shape as the bug it was meant to fix.
 *
 * So the connection is never made in the first place. Real behaviour is exercised
 * by passing a stub through the module's own injection point, which is what the
 * notification and refund specs do.
 */
vi.mock('bullmq', async () => {
  const actual = await vi.importActual<typeof import('bullmq')>('bullmq');

  class InertQueue {
    add = vi.fn(async () => ({ id: 'stub-job' }));
    getJob = vi.fn(async () => null);
    getJobCounts = vi.fn(async () => ({
      active: 0,
      completed: 0,
      delayed: 0,
      failed: 0,
      paused: 0,
      waiting: 0,
    }));
    remove = vi.fn(async () => 1);
    close = vi.fn(async () => undefined);
    drain = vi.fn(async () => undefined);
    obliterate = vi.fn(async () => undefined);
  }

  class InertWorker {
    on = vi.fn(() => this);
    once = vi.fn(() => this);
    off = vi.fn(() => this);
    run = vi.fn(async () => this);
    pause = vi.fn(async () => undefined);
    resume = vi.fn(async () => undefined);
    close = vi.fn(async () => undefined);
    waitUntilReady = vi.fn(async () => undefined);
  }

  return { ...actual, Queue: InertQueue, Worker: InertWorker };
});

/**
 * The queue dashboard mounts a BullMQ adapter over each queue at startup, and that
 * adapter rejects anything that is not a real BullMQ queue. With the queues
 * inert above, mounting it would throw while the app module is still loading and
 * take down every spec that imports the app. There is nothing to see in a test
 * run, so the router is stubbed to an empty one.
 */
vi.mock('@/common/services/bull-board.service', async () => {
  const { Router } = await vi.importActual<typeof import('express')>('express');
  return { getBullBoardRouter: () => Router() };
});

// TRUNCATE ... CASCADE across every public table contends for the single local test database and
// can exceed vitest's default 10s hookTimeout under parallel load, failing suites for reasons that
// have nothing to do with the code under test. Raise the timeout for this hook only.
const TRUNCATE_HOOK_TIMEOUT_MS = 120_000;

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  try {
    const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations';
    `;

    if (tablenames.length > 0) {
      const names = tablenames.map((t) => `"${t.tablename}"`).join(', ');
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${names} CASCADE;`);
    }
  } catch {
    // Fallback if test DB connection is not available in isolated unit runs
  }
}, TRUNCATE_HOOK_TIMEOUT_MS);
