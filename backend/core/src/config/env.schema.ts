import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_TOKEN_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRATION: z.string().default('7d'),
  SCHEDULING_SERVICE_URL: z.string(),
  SCHEDULING_SERVICE_TIMEOUT: z.coerce.number().default(5000),
  PARSING_SERVICE_URL: z.string(),
  PARSING_SERVICE_TIMEOUT: z.coerce.number().default(5000),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsedConfig = envSchema.parse(config);
  return parsedConfig;
}
