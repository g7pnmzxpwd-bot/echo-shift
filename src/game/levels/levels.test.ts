import { describe, expect, it } from 'vitest';

import { LEVELS } from './levels';
import { validateLevel, validateLevelPack } from './validateLevels';

describe('36-round level pack', () => {
  it('contains exactly six chapters of six uniquely numbered rounds', () => {
    expect(LEVELS).toHaveLength(36);
    expect(new Set(LEVELS.map((level) => level.id)).size).toBe(36);
    expect(LEVELS.map((level) => level.id)).toEqual(
      Array.from({ length: 36 }, (_, index) => `round-${String(index + 1).padStart(2, '0')}`),
    );
    expect(LEVELS.map((level) => level.chapter)).toEqual(
      Array.from({ length: 36 }, (_, index) => Math.floor(index / 6) + 1),
    );
  });

  it('has valid links, geometry, budgets, and reachability for every round', () => {
    expect(validateLevelPack(LEVELS)).toEqual([]);
  });

  it('rejects a gate that references a missing plate', () => {
    const level = structuredClone(LEVELS[0]);
    level.gates[0].requiresPlateIds = ['missing'];

    expect(validateLevel(level).some((error) => error.includes('missing plate'))).toBe(true);
  });

  it('requires enough echo capacity to occupy all mandatory plates', () => {
    const level = structuredClone(LEVELS[0]);
    level.echoCap = 0;

    expect(validateLevel(level).some((error) => error.includes('echoCap'))).toBe(true);
  });
});
