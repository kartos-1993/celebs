import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3333),
  BASE_PATH: z.string().default('/api/v1'),
  DATABASE_URL: z.string().min(1, { message: 'DATABASE_URL is required' }),
  JWT_SECRET: z.string().min(32, { message: 'JWT_SECRET must be at least 32 characters long' }),
  JWT_REFRESH_SECRET: z.string().min(32).optional().or(z.literal('')),
  APP_ORIGIN: z
    .string()
    .default('http://localhost:5173,http://localhost:3333')
    .transform((val) =>
      val
        .split(',')
        .map((s) => s.trim().replace(/\/$/, ''))
        .filter(Boolean)
    ),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  S3_REGION: z.string().optional().default('ap-south-1'),
  S3_BUCKET_NAME: z.string().optional().default('celebs'),
  S3_ENDPOINT: z.string().optional().default(''),
  AWS_ACCESS_KEY_ID: z.string().optional().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().optional().default(''),
  MEDIA_PUBLIC_BASE_URL: z.string().optional().default(''),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const validateEnv = (): EnvConfig => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ CRITICAL ENVIRONMENT VALIDATION ERROR: Invalid configuration provided.');
    console.error(JSON.stringify(result.error.format(), null, 2));
    process.exit(1);
  }
  return result.data;
};

export const env = validateEnv();
