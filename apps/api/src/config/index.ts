import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

if (process.env.NODE_ENV !== 'production') {
  dotenvConfig({ path: resolve(__dirname, '../../.env') });
}

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  PORT: z.string().transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-flash-latest'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_ACCOUNTABILITY_PRICE_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const config = {
  database: { url: parsed.data.DATABASE_URL },
  jwt: {
    accessSecret: parsed.data.JWT_ACCESS_SECRET,
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    accessExpiry: parsed.data.ACCESS_TOKEN_EXPIRY,
    refreshExpiry: parsed.data.REFRESH_TOKEN_EXPIRY,
  },
  server: {
    port: parsed.data.PORT,
    nodeEnv: parsed.data.NODE_ENV,
    isProduction: parsed.data.NODE_ENV === 'production',
  },
  cors: { frontendUrl: parsed.data.FRONTEND_URL },
  google: {
    clientId: parsed.data.GOOGLE_CLIENT_ID ?? '',
    clientSecret: parsed.data.GOOGLE_CLIENT_SECRET ?? '',
  },
  gemini: {
    apiKey: parsed.data.GEMINI_API_KEY ?? '',
    model: parsed.data.GEMINI_MODEL,
  },
  stripe: {
    secretKey: parsed.data.STRIPE_SECRET_KEY ?? '',
    webhookSecret: parsed.data.STRIPE_WEBHOOK_SECRET ?? '',
    accountabilityPriceId: parsed.data.STRIPE_ACCOUNTABILITY_PRICE_ID ?? '',
  },
} as const;
