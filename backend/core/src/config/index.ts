import { dbConfig } from './db.config';
import { jwtConfig } from './jwt.config';
import { servicesConfig } from './services.config';
import { envSchema, validateEnv } from './env.schema';
// const config = [dbConfig, jwtConfig];
// export { config, envSchema, validateEnv};

export { dbConfig, jwtConfig, servicesConfig, envSchema, validateEnv };
