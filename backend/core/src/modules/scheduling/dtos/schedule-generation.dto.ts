import { IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SchedulingMode {
  QUICK = 'quick', // 30s, small population
  BALANCED = 'balanced', // 60s, medium population
  THOROUGH = 'thorough', // 180s, large population
  CUSTOM = 'custom', // User-defined parameters
}

export enum MutationLevel {
  LOW = 'low', // Conservative mutation rates
  MEDIUM = 'medium', // Balanced mutation rates
  HIGH = 'high', // Aggressive mutation rates
}

export enum StoppingCriteria {
  CONSERVATIVE = 'conservative', // High stagnation thresholds
  BALANCED = 'balanced', // Medium stagnation thresholds
  AGGRESSIVE = 'aggressive', // Low stagnation thresholds
}

export class ScheduleGenerationOptionsDto {
  @ApiPropertyOptional({
    enum: SchedulingMode,
    default: SchedulingMode.BALANCED,
    description: 'Preset scheduling mode or custom for manual parameters',
  })
  @IsOptional()
  @IsEnum(SchedulingMode)
  mode?: SchedulingMode = SchedulingMode.BALANCED;

  // === Time and Generation Controls ===
  @ApiPropertyOptional({
    minimum: 10,
    maximum: 600,
    default: 60,
    description: 'Maximum time in seconds for scheduling (10-600s)',
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(600)
  maxDurationSeconds?: number;

  @ApiPropertyOptional({
    minimum: 100,
    maximum: 50000,
    default: 5000,
    description: 'Maximum number of generations (100-50000)',
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(50000)
  maxGenerations?: number;

  // === Population Controls ===
  @ApiPropertyOptional({
    minimum: 20,
    maximum: 200,
    default: 50,
    description: 'Population size for genetic algorithm (20-200)',
  })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(200)
  populationSize?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 10,
    default: 2,
    description: 'Number of elite solutions to preserve (1-10)',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  elitismCount?: number;

  // === Mutation Controls ===
  @ApiPropertyOptional({
    enum: MutationLevel,
    default: MutationLevel.MEDIUM,
    description: 'Mutation aggressiveness level',
  })
  @IsOptional()
  @IsEnum(MutationLevel)
  mutationLevel?: MutationLevel = MutationLevel.MEDIUM;

  @ApiPropertyOptional({
    minimum: 0.01,
    maximum: 0.5,
    description:
      'Custom gene mutation rate (0.01-0.5) - only used in CUSTOM mode',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(0.5)
  geneMutationRate?: number;

  @ApiPropertyOptional({
    minimum: 0.05,
    maximum: 0.8,
    description:
      'Custom chromosome mutation rate (0.05-0.8) - only used in CUSTOM mode',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.05)
  @Max(0.8)
  chromosomeMutationRate?: number;

  // === Early Stopping Controls ===
  @ApiPropertyOptional({
    enum: StoppingCriteria,
    default: StoppingCriteria.BALANCED,
    description: 'Early stopping aggressiveness',
  })
  @IsOptional()
  @IsEnum(StoppingCriteria)
  stoppingCriteria?: StoppingCriteria = StoppingCriteria.BALANCED;

  @ApiPropertyOptional({
    minimum: 20,
    maximum: 200,
    description: 'Custom stagnation threshold - only used in CUSTOM mode',
  })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(200)
  stagnationThreshold?: number;

  @ApiPropertyOptional({
    minimum: 50,
    maximum: 500,
    description: 'Custom early stop threshold - only used in CUSTOM mode',
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(500)
  earlyStopThreshold?: number;

  // === Penalty Controls ===
  @ApiPropertyOptional({
    minimum: 0.5,
    maximum: 5.0,
    default: 1.0,
    description: 'Hard constraint penalty multiplier (0.5-5.0)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(5.0)
  hardPenaltyScale?: number = 1.0;

  @ApiPropertyOptional({
    minimum: 0.1,
    maximum: 2.0,
    default: 1.0,
    description: 'Soft constraint penalty multiplier (0.1-2.0)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(2.0)
  softPenaltyScale?: number = 1.0;
}

export class GenerateScheduleRequestDto {
  @ApiPropertyOptional({
    description: 'Name for the generated schedule',
  })
  @IsOptional()
  scheduleName?: string;

  @ApiPropertyOptional({
    description: 'Advanced scheduling options',
    type: ScheduleGenerationOptionsDto,
  })
  @IsOptional()
  options?: ScheduleGenerationOptionsDto;
}
