import { z } from 'zod';

import { registry } from './registry';

// ── GET /health ──
registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['System Health'],
  summary: 'Liveness, latency, and backing service health check (PostgreSQL & Redis)',
  responses: {
    200: {
      description: 'System healthy',
      content: {
        'application/json': {
          schema: z.object({
            status: z.enum(['OK', 'DEGRADED']),
            timestamp: z.string(),
            latencyMs: z.number(),
            uptimeSeconds: z.number(),
            memory: z.object({
              rssMb: z.number(),
              heapTotalMb: z.number(),
              heapUsedMb: z.number(),
            }),
            services: z.object({
              postgres: z.enum(['UP', 'DOWN']),
              redis: z.enum(['UP', 'DOWN']),
            }),
          }),
        },
      },
    },
    503: {
      description: 'System degraded or unavailable (DB/Redis down)',
    },
  },
});
