import { Worker, Job } from 'bullmq';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { redisConnection } from '@/common/services/queue.service';
import { s3Client, buildPublicObjectUrl } from '@/common/utils/s3.client';
import { config } from '@/config/app.config';
import { MediaModel } from '@/db/models/media.model';
import { logger } from '@celebs/shared-utils';

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
  for await (const chunk of response.Body as any) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export const assetWorker = new Worker<AssetJobPayload>(
  'asset-processing',
  async (job: Job<AssetJobPayload>) => {
    const { mediaId, key, originalname, mimeType } = job.data;
    logger.info({ jobId: job.id, mediaId, key }, 'Processing asset job');

    try {
      const originalBuffer = await getS3ObjectBuffer(key);

      // WebP optimized responsive product image (max 1600px width/height)
      const optimizedMainBuffer = await sharp(originalBuffer)
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      // WebP thumbnail image (max 300px width/height)
      const thumbnailBuffer = await sharp(originalBuffer)
        .resize({ width: 300, height: 300, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();

      // Upload optimized main image back to original S3 key
      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.S3.BUCKET_NAME,
          Key: key,
          Body: optimizedMainBuffer,
          ContentType: 'image/webp',
        }),
      );

      // Upload thumbnail to suffix key
      const thumbKey = `${key}-thumb.webp`;
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

      await MediaModel.findByIdAndUpdate(mediaId, {
        $set: {
          size: optimizedMainBuffer.length,
          mimeType: 'image/webp',
        },
      });

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
    } catch (error: any) {
      logger.error(
        { jobId: job.id, mediaId, error: error?.message || String(error) },
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
