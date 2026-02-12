import { Level1Strategy } from './Level1_Location';
import { Level2Strategy } from './Level2_Route';
import { Level3Strategy } from './Level3_Distance';
import type { LevelStrategy } from '../core/types';

export const GameLevels: Record<number, LevelStrategy> = {
  1: Level1Strategy,
  2: Level2Strategy,
  3: Level3Strategy,
};

export const getLevelStrategy = (level: number): LevelStrategy => {
  return GameLevels[level] || GameLevels[1];
};
