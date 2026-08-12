import { describe, expect, it, vi } from 'vitest';

import { AudioEngine } from './AudioEngine';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('AudioEngine', () => {
  it('starts enabled unless the user previously muted it', () => {
    const storage = new MemoryStorage();
    expect(new AudioEngine(storage, null).muted).toBe(false);
    storage.setItem('echo-shift-muted-v1', '1');
    expect(new AudioEngine(storage, null).muted).toBe(true);
  });

  it('persists mute changes without requiring an AudioContext', () => {
    const storage = new MemoryStorage();
    const engine = new AudioEngine(storage, null);
    expect(engine.toggleMuted()).toBe(true);
    expect(storage.getItem('echo-shift-muted-v1')).toBe('1');
    expect(engine.toggleMuted()).toBe(false);
    expect(storage.getItem('echo-shift-muted-v1')).toBe('0');
  });

  it('is a safe no-op when Web Audio is unavailable', async () => {
    const engine = new AudioEngine(new MemoryStorage(), null);
    await expect(engine.unlock()).resolves.toBe(false);
    expect(() => engine.cue('echo')).not.toThrow();
    expect(() => engine.cue('gate-open')).not.toThrow();
    expect(() => engine.cue('victory')).not.toThrow();
  });

  it('resumes a suspended context on unlock', async () => {
    const resume = vi.fn(async () => undefined);
    const connect = vi.fn();
    const fake = {
      state: 'suspended',
      resume,
      destination: {},
      createGain: () => ({ gain: { value: 0 }, connect }),
    } as unknown as AudioContext;
    const engine = new AudioEngine(new MemoryStorage(), () => fake);
    await expect(engine.unlock()).resolves.toBe(true);
    expect(resume).toHaveBeenCalledOnce();
  });
});
