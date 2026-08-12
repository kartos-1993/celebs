import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Job,Worker } from 'bullmq';
import sharp from 'sharp';

import { logger } from '@celebs/shared-utils';

import { redisConnection } from '@/common/services/queue.service';
import { buildPublicObjectUrl,s3Client } from '@/common/utils/s3.client';
import { config } from '@/config/app.config';

// Configure Sharp memory limits to prevent V8 heap OOM crashes during heavy multi-image operations
sharp.cache({ memory: 256, items: 100, files: 0 });
sharp.concurrency(1);

interface AssetJobPayload {
  mediaId: string;
  key: string;
  originalname: string;
  mimeType: string;
}

async function getS3ObjectBuffer(key: string): Promise<Buffer> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: config.S3.BUCKET_NAME,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error(`S3 object body is empty for key: ${key}`);
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export const assetWorker = new Worker<AssetJobPayload>(
  'asset-optimization-queue',
  async (job: Job<AssetJobPayload>) => {
    const { mediaId, key } = job.data;
    logger.info({ jobId: job.id, mediaId, key }, 'Starting asset optimization job');

    try {
      const originalBuffer = await getS3ObjectBuffer(key);

      const optimizedMainBuffer = await sharp(originalBuffer)
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.S3.BUCKET_NAME,
          Key: key,
          Body: optimizedMainBuffer,
          ContentType: 'image/webp',
        }),
      );

      const thumbKey = key.replace(/\.([a-zA-Z0-9]+)$/, '-thumb.webp');
      const thumbnailBuffer = await sharp(originalBuffer)
        .resize({ width: 350, height: 350, fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer();

      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.S3.BUCKET_NAME,
          Key: thumbKey,
          Body: thumbnailBuffer,
          ContentType: 'image/webp',
        }),
      );

      const mainUrl = buildPublicObjectUrl(key);
      const thumbUrl = buildPublicObjectUrl(thumbKey);

      logger.info(
        { jobId: job.id, mediaId, mainUrl, thumbUrl },
        'Asset processing completed successfully',
      );

      return {
        mainUrl,
        thumbUrl,
        mainSize: optimizedMainBuffer.length,
        thumbSize: thumbnailBuffer.length,
      };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error(
        { jobId: job.id, mediaId, error: errMsg },
        'Failed to process asset job',
      );
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
  },
);

assetWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Job completed successfully');
});

assetWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Job failed');
});
