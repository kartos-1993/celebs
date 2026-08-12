import { Request, Response, Router } from 'express';

import { HTTPSTATUS } from '@celebs/shared-utils';

import { verifyRedisConnection } from '@/common/services/queue.service';
import prisma from '@/config/db.prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  let dbStatus = 'UP';
  let redisStatus = 'UP';
  let isHealthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'DOWN';
    isHealthy = false;
  }

  try {
    await verifyRedisConnection();
  } catch {
    redisStatus = 'DOWN';
  }

  const responseTime = Date.now() - startTime;
  const memoryUsage = process.memoryUsage();

  const payload = {
    status: isHealthy ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    latencyMs: responseTime,
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
    },
    services: {
      postgres: dbStatus,
      redis: redisStatus,
    },
  };

  if (!isHealthy) {
    res.status(HTTPSTATUS.SERVICE_UNAVAILABLE).json(payload);
    return;
  }

  res.status(HTTPSTATUS.OK).json(payload);
});

export default router;
