import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return health check response', () => {
      const result = controller.check();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });
  });

  describe('debugSentry', () => {
    it('should throw an error for Sentry testing', () => {
      expect(() => controller.debugSentry()).toThrow('This should be captured by Sentry');
    });
  });
}); 