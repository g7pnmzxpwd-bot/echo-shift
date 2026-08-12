export type AudioCue = 'start' | 'echo' | 'gate-open' | 'gate-close' | 'reset' | 'victory';

type AudioContextFactory = (() => AudioContext) | null;
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const MUTE_KEY = 'echo-shift-muted-v1';

export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly contextFactory: AudioContextFactory;
  readonly storage: StorageLike;
  muted: boolean;

  constructor(
    storage: StorageLike,
    contextFactory: AudioContextFactory = typeof window === 'undefined'
      ? null
      : () => new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(),
  ) {
    this.storage = storage;
    this.contextFactory = contextFactory;
    try {
      this.muted = storage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  toggleMuted(): boolean {
    this.muted = !this.muted;
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.22, this.context.currentTime, 0.015);
    try {
      this.storage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      // Audio preferences are optional and must never block play.
    }
    return this.muted;
  }

  async unlock(): Promise<boolean> {
    if (!this.contextFactory) return false;
    try {
      if (!this.context) {
        this.context = this.contextFactory();
        this.master = this.context.createGain();
        this.master.gain.value = this.muted ? 0 : 0.22;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') await this.context.resume();
      return true;
    } catch {
      this.context = null;
      this.master = null;
      return false;
    }
  }

  cue(cue: AudioCue): void {
    if (!this.context || !this.master || this.muted) return;
    const patterns: Record<AudioCue, Array<[number, number, OscillatorType, number]>> = {
      start: [[180, 0.09, 'sine', 0], [270, 0.12, 'sine', 0.08]],
      echo: [[420, 0.08, 'triangle', 0], [670, 0.14, 'sine', 0.07]],
      'gate-open': [[145, 0.1, 'square', 0], [230, 0.16, 'triangle', 0.05]],
      'gate-close': [[220, 0.08, 'triangle', 0], [105, 0.12, 'square', 0.04]],
      reset: [[180, 0.08, 'sawtooth', 0], [90, 0.16, 'triangle', 0.06]],
      victory: [[330, 0.13, 'triangle', 0], [495, 0.16, 'triangle', 0.11], [660, 0.3, 'sine', 0.24]],
    };
    for (const [frequency, duration, type, delay] of patterns[cue]) this.tone(frequency, duration, type, delay);
  }

  private tone(frequency: number, duration: number, type: OscillatorType, delay: number): void {
    if (!this.context || !this.master) return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(0.7, start + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}
