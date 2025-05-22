import { registerAs } from '@nestjs/config';

export const servicesConfig = registerAs('services', () => ({
  scheduling_microservice: {
    url: process.env.SCHEDULING_SERVICE_URL,
    timeout: process.env.SCHEDULING_SERVICE_TIMEOUT,
  },
  parsing_microservice: {
    url: process.env.PARSING_SERVICE_URL,
    timeout: process.env.PARSING_SERVICE_TIMEOUT,
  },
}));
