import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env.development') });

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function main() {
  const { prisma } = await import('../apps/api/src/config/db.prisma');
  const bucket = process.env.S3_BUCKET_NAME || 'celebs-media-staging';
  const publicBase = (
    process.env.MEDIA_PUBLIC_BASE_URL || 'https://media.celebs.com.np'
  ).replace(/\/$/, '');

  console.log(`Fetching available image keys from R2 bucket: ${bucket}...`);
  const r2Res = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: 'celebs/products/',
      MaxKeys: 100,
    }),
  );

  const availableKeys = (r2Res.Contents || [])
    .map((c) => c.Key)
    .filter((k): k is string => Boolean(k && k.endsWith('.webp')));

  if (!availableKeys.length) {
    console.error('No images found in R2 bucket to backfill.');
    process.exit(1);
  }

  console.log(`Found ${availableKeys.length} active images in Cloudflare R2.`);

  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      mainImages: true,
    },
  });

  console.log(`Scanning ${products.length} products in database...`);

  let updatedCount = 0;
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const currentImgs = product.mainImages || [];
    const hasValidR2 = currentImgs.some((url) => url.includes('pub-') && !url.includes('127.0.0.1'));

    if (!hasValidR2 || currentImgs.length === 0) {
      // Pick a round-robin valid image from R2
      const chosenKey = availableKeys[i % availableKeys.length];
      const validUrl = `${publicBase}/${chosenKey}`;

      await prisma.product.update({
        where: { id: product.id },
        data: {
          mainImages: [validUrl],
        },
      });

      console.log(`Updated "${product.name}" -> ${validUrl}`);
      updatedCount++;
    }
  }

  console.log(`\nSuccessfully backfilled ${updatedCount} products with live Cloudflare R2 images!`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Backfill error:', err);
  process.exit(1);
});
