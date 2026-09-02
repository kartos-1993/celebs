import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Job, Worker } from 'bullmq';
import sharp from 'sharp';

import { logger } from '@celebs/shared-utils';

import { redisConnection } from '@/common/services/queue.service';
import { buildPublicObjectUrl, s3Client } from '@/common/utils/s3.client';
import { config } from '@/config/app.config';

// Configure Sharp memory limits to prevent V8 heap OOM crashes during heavy multi-image operations
sharp.cache({ memory: 256, items: 100, files: 0 });
sharp.concurrency(1);

export interface AssetJobPayload {
  mediaId?: string;
  key: string;
  originalname?: string;
  mimeType?: string;
  scope?: string;
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

const ALLOWED_IMAGE_WORKER_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

export const assetWorker = new Worker<AssetJobPayload>(
  'asset-processing',
  async (job: Job<AssetJobPayload>) => {
    const { mediaId, key, mimeType, scope } = job.data;
    logger.info(
      { jobId: job.id, mediaId, key, scope, mimeType },
      'Starting asset optimization job',
    );

    // Safety: skip non-PRODUCT or non-image jobs that slipped through (defense in depth)
    if (scope && scope !== 'PRODUCT') {
      logger.info({ jobId: job.id, scope }, 'Skipping asset optimization for non-PRODUCT scope');
      return { skipped: true, reason: 'non-product-scope', scope };
    }
    if (
      mimeType &&
      (mimeType === 'application/pdf' || !ALLOWED_IMAGE_WORKER_MIME.has(mimeType.toLowerCase()))
    ) {
      logger.info({ jobId: job.id, mimeType }, 'Skipping asset optimization for non-image mime');
      return { skipped: true, reason: 'non-image-mime', mimeType };
    }

    try {
      const originalBuffer = await getS3ObjectBuffer(key);

      // Base key without extension
      const baseKey = key.replace(/\.[a-zA-Z0-9]+$/, '');

      // 1. High-Res Zoom (1500x2000px 3:4 Portrait)
      const zoomKey = `${baseKey}-zoom.webp`;
      const zoomBuffer = await sharp(originalBuffer)
        .resize({ width: 1500, height: 2000, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 88 })
        .toBuffer();

      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.S3.BUCKET_NAME,
          Key: zoomKey,
          Body: zoomBuffer,
          ContentType: 'image/webp',
        }),
      );

      // 2. Main Card (750x1000px 3:4 Portrait)
      const cardKey = `${baseKey}-card.webp`;
      const cardBuffer = await sharp(originalBuffer)
        .resize({ width: 750, height: 1000, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.S3.BUCKET_NAME,
          Key: cardKey,
          Body: cardBuffer,
          ContentType: 'image/webp',
        }),
      );

      // 3. Thumbnail (360x480px 3:4 Portrait)
      const thumbKey = `${baseKey}-thumb.webp`;
      const thumbnailBuffer = await sharp(originalBuffer)
        .resize({ width: 360, height: 480, fit: 'cover' })
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

      // 4. Ultra-low Placeholder (30x40px 3:4 Portrait)
      const placeholderKey = `${baseKey}-placeholder.webp`;
      const placeholderBuffer = await sharp(originalBuffer)
        .resize({ width: 30, height: 40, fit: 'inside' })
        .webp({ quality: 60 })
        .toBuffer();

      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.S3.BUCKET_NAME,
          Key: placeholderKey,
          Body: placeholderBuffer,
          ContentType: 'image/webp',
        }),
      );

      const mainUrl = buildPublicObjectUrl(key);
      const zoomUrl = buildPublicObjectUrl(zoomKey);
      const cardUrl = buildPublicObjectUrl(cardKey);
      const thumbUrl = buildPublicObjectUrl(thumbKey);
      const placeholderUrl = buildPublicObjectUrl(placeholderKey);

      logger.info(
        { jobId: job.id, mediaId, mainUrl, zoomUrl, cardUrl, thumbUrl, placeholderUrl },
        'Asset multi-derivative processing completed successfully',
      );

      return {
        mainUrl,
        zoomUrl,
        cardUrl,
        thumbUrl,
        placeholderUrl,
      };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ jobId: job.id, mediaId, error: errMsg }, 'Failed to process asset job');
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
