import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32),
  PAYSTACK_SECRET_KEY: z.string().trim().default(''),
  PAYSTACK_LIVE_SECRET_KEY: z.string().trim().default(''),
  PAYSTACK_TEST_SECRET_KEY: z.string().trim().default(''),
  PUBLIC_API_URL: z.union([z.url(),z.literal('')]).default(''),
  GOOGLE_CLIENT_ID: z.string().trim().default(''),
  JWT_EXPIRES_IN: z.string().default('15m'),
  DATABASE_URL: z.string().min(1),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().default('2097152').transform((value) => value.toUpperCase().endsWith('MB') ? Number(value.slice(0, -2)) * 1024 * 1024 : Number(value)),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${z.prettifyError(parsed.error)}`);
}

export const env = Object.freeze({ ...parsed.data, PAYSTACK_SECRET_KEY: parsed.data.PAYSTACK_SECRET_KEY || parsed.data.PAYSTACK_LIVE_SECRET_KEY || parsed.data.PAYSTACK_TEST_SECRET_KEY });
