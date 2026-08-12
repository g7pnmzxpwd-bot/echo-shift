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

  it('keeps the authored difficulty curve from getting easier in later chapters', () => {
    const chapters = Array.from({ length: 6 }, (_, chapter) =>
      LEVELS.filter((level) => level.chapter === chapter + 1));
    const averageDecisionSteps = chapters.map((levels) =>
      levels.reduce((sum, level) => sum + level.plates.length + level.gates.length, 0) / levels.length);

    expect(averageDecisionSteps).toEqual([2, 3, 4, 6, 6, 8]);
    for (let index = 1; index < averageDecisionSteps.length; index += 1) {
      expect(averageDecisionSteps[index]).toBeGreaterThanOrEqual(averageDecisionSteps[index - 1]);
    }
    for (const levels of chapters.slice(2)) {
      expect(levels.at(-1)!.loopSeconds).toBeLessThanOrEqual(levels[0].loopSeconds);
      expect(levels.at(-1)!.gates[0].rect.height).toBeLessThanOrEqual(levels[0].gates[0].rect.height);
    }
    expect(chapters[2].every((level) => level.gates.length === 2)).toBe(true);
    expect(chapters[3].every((level) => level.gates.length === 3)).toBe(true);
    expect(chapters[5].every((level) => level.gates.length === 4)).toBe(true);
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

  it('accepts a plate that becomes reachable after an earlier plate opens a gate', () => {
    const level = structuredClone(LEVELS[6]);
    level.spawn = { x: 100, y: 470 };
    level.exit = { x: 850, y: 470 };
    level.plates = [
      { id: 'p1', label: 'P-1', x: 180, y: 180 },
      { id: 'p2', label: 'P-2', x: 500, y: 180 },
    ];
    level.walls = [
      { x: 350, y: 92, width: 28, height: 328 },
      { x: 350, y: 500, width: 28, height: 58 },
    ];
    level.gates = [{
      id: 'g1', rect: { x: 350, y: 420, width: 28, height: 80 },
      requiresPlateIds: ['p1'], orientation: 'vertical',
    }];

    expect(validateLevel(level)).toEqual([]);
  });

  it('rejects a cyclic staged gate whose required plate is trapped behind itself', () => {
    const level = structuredClone(LEVELS[6]);
    level.spawn = { x: 100, y: 470 };
    level.exit = { x: 850, y: 470 };
    level.plates = [
      { id: 'p1', label: 'P-1', x: 180, y: 180 },
      { id: 'p2', label: 'P-2', x: 500, y: 180 },
    ];
    level.walls = [
      { x: 350, y: 92, width: 28, height: 328 },
      { x: 350, y: 500, width: 28, height: 58 },
    ];
    level.gates = [{
      id: 'g1', rect: { x: 350, y: 420, width: 28, height: 80 },
      requiresPlateIds: ['p2'], orientation: 'vertical',
    }];

    expect(validateLevel(level).some((error) => error.includes('staged gates'))).toBe(true);
  });
});
