import { dbConfig } from './db.config';
import { jwtConfig } from './jwt.config';
import { servicesConfig } from './services.config';
import { envSchema, validateEnv } from './env.schema';
import { fileConfig } from './file.config';
// const config = [dbConfig, jwtCo nfig];
// export { config, envSchema, validateEnv};

export {
  dbConfig,
  jwtConfig,
  servicesConfig,
  envSchema,
  validateEnv,
  fileConfig,
};
