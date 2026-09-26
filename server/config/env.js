import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config({ quiet: true });

const envSchema = z
  .object({
    PORT: z.coerce.number().int().positive().default(5000),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().startsWith('mysql://', 'DATABASE_URL must be a mysql:// connection string'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
    JWT_EXPIRES_IN: z.string().min(1).default('7d'),
    CLIENT_URL: z.url('CLIENT_URL must be a valid URL').default('http://localhost:5173'),
    // SMTP is optional in development/test (emails are logged to the console instead)
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    MAIL_FROM: z.string().min(1).default('StockSense <noreply@stocksense.com>'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']) {
      if (!env[key]) {
        ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required in production` });
      }
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:');
  parsedEnv.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

export const config = Object.freeze({
  ...parsedEnv.data,
  isSmtpConfigured: Boolean(parsedEnv.data.SMTP_HOST && parsedEnv.data.SMTP_USER),
});
export default config;
