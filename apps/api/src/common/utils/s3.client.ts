import {
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  S3Client,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { config } from '@/config/app.config';
import { logger } from '@celebs/shared-utils';

const isDev = config.NODE_ENV === 'development';

/**
 * AWS SDK v3 S3 client.
 * Development targets local MinIO with path-style addressing.
 * Production/staging use AWS S3 (virtual-host style; no custom endpoint).
 */
export const s3Client = new S3Client({
  region: config.S3.REGION,
  credentials: {
    accessKeyId: config.S3.ACCESS_KEY_ID,
    secretAccessKey: config.S3.SECRET_ACCESS_KEY,
  },
  endpoint: config.S3.ENDPOINT || undefined,
  forcePathStyle: isDev || !!config.S3.ENDPOINT ? true : false,
});

/**
 * Verify S3 connection by running a HeadBucket command
 */
export async function verifyS3Connection(): Promise<void> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: config.S3.BUCKET_NAME }));
    logger.info({ bucket: config.S3.BUCKET_NAME }, 'S3/MinIO Connected and bucket verified successfully');
  } catch (error: any) {
    if (isDev) {
      logger.warn(
        { bucket: config.S3.BUCKET_NAME, error: error?.message || String(error) },
        'S3/MinIO Connection verification failed in development. Server will continue running but S3 uploads will fail.'
      );
      return;
    }
    logger.error(
      { bucket: config.S3.BUCKET_NAME, error: error?.message || String(error) },
      'S3/MinIO Connection verification failed'
    );
    throw error;
  }
}

/**
 * Build a publicly reachable object URL for the current environment.
 * - Prefer MEDIA_PUBLIC_BASE_URL / CloudFront when set
 * - Dev MinIO: path-style http://host:9000/bucket/key
 * - Prod fallback: virtual-host style https://bucket.s3.region.amazonaws.com/key
 */
export function buildPublicObjectUrl(key: string): string {
  const bucket = config.S3.BUCKET_NAME;
  const publicBase = config.S3.PUBLIC_BASE_URL?.replace(/\/$/, '');

  if (publicBase) {
    return `${publicBase}/${key}`;
  }

  if (isDev && config.S3.ENDPOINT) {
    const endpoint = config.S3.ENDPOINT.replace(/\/$/, '');
    return `${endpoint}/${bucket}/${key}`;
  }

  return `https://${bucket}.s3.${config.S3.REGION}.amazonaws.com/${key}`;
}

/** Ensures anonymous GetObject + browser CORS for local MinIO. */
let devBucketReady: Promise<void> | null = null;

export async function ensureDevPublicReadAccess(): Promise<void> {
  if (!isDev) return;

  if (!devBucketReady) {
    devBucketReady = (async () => {
      const bucket = config.S3.BUCKET_NAME;

      // Public read so permanent product URLs work in <img src>
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/*`],
          },
        ],
      };

      try {
        await s3Client.send(
          new PutBucketPolicyCommand({
            Bucket: bucket,
            Policy: JSON.stringify(policy),
          }),
        );
        logger.info({ bucket }, 'MinIO/S3 bucket public-read policy applied (development)');
      } catch (err: any) {
        logger.warn(
          { bucket, err: err?.message || String(err) },
          'Could not apply public-read bucket policy. Browser image URLs may 403.',
        );
      }

      // CORS so browser can PUT presigned uploads from web-admin origin
      const origins = Array.isArray(config.APP_ORIGIN)
        ? config.APP_ORIGIN.filter(Boolean)
        : [];
      const allowedOrigins =
        origins.length > 0
          ? origins
          : ['http://localhost:5173', 'http://127.0.0.1:5173'];

      try {
        await s3Client.send(
          new PutBucketCorsCommand({
            Bucket: bucket,
            CORSConfiguration: {
              CORSRules: [
                {
                  AllowedOrigins: allowedOrigins,
                  AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
                  AllowedHeaders: ['*'],
                  ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
                  MaxAgeSeconds: 3600,
                },
              ],
            },
          }),
        );
        logger.info(
          { bucket, allowedOrigins },
          'MinIO/S3 bucket CORS applied for presigned browser uploads (development)',
        );
      } catch (err: any) {
        logger.warn(
          { bucket, err: err?.message || String(err) },
          'Could not apply bucket CORS. Presigned browser PUT may fail (CORS). ' +
            'In MinIO console: bucket → Access → set CORS for your admin origin.',
        );
      }
    })();
  }

  await devBucketReady;
}
