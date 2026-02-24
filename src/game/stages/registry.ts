import { Stage1Strategy } from './Stage1_Location';
import { Stage2Strategy } from './Stage2_Route';
import { Stage3Strategy } from './Stage3_Distance';
import type { StageStrategy } from '../core/types';

export const GameStages: Record<number, StageStrategy> = {
  1: Stage1Strategy,
  2: Stage2Strategy,
  3: Stage3Strategy,
};

export const getStageStrategy = (stage: number): StageStrategy => {
  return GameStages[stage] || GameStages[1];
};
