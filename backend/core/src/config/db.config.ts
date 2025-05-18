import { registerAs } from '@nestjs/config';

export const dbConfig = registerAs<DbConfig>('db', () => ({
  url: process.env.DATABASE_URL!,
  port: parseInt(process.env.DATABASE_PORT!, 10) || 5432,
}));

export type DbConfig = {
  url: string;
  port: number;
};
