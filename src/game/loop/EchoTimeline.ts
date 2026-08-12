export type Facing = 'left' | 'right' | 'up' | 'down';

export interface EchoFrame {
  x: number;
  y: number;
  facing: Facing;
  action: boolean;
}

const cloneFrame = (frame: EchoFrame): EchoFrame => ({ ...frame });

export class EchoTimeline {
  private readonly echoes: EchoFrame[][] = [];
  private current: EchoFrame[] = [];
  readonly maxTicks: number;

  constructor(maxTicks: number) {
    if (!Number.isInteger(maxTicks) || maxTicks <= 0) {
      throw new Error('maxTicks must be a positive integer');
    }
    this.maxTicks = maxTicks;
  }

  get echoCount(): number {
    return this.echoes.length;
  }

  get currentLength(): number {
    return this.current.length;
  }

  record(frame: EchoFrame): void {
    if (this.current.length < this.maxTicks) {
      this.current.push(cloneFrame(frame));
    }
  }

  currentFrame(tick: number): EchoFrame | undefined {
    return this.frameAt(this.current, tick);
  }

  echoFrame(echoIndex: number, tick: number): EchoFrame | undefined {
    const echo = this.echoes[echoIndex];
    return echo ? this.frameAt(echo, tick) : undefined;
  }

  commit(): boolean {
    if (this.current.length === 0) return false;
    this.echoes.push(this.current.map(cloneFrame));
    this.current = [];
    return true;
  }

  discardCurrent(): void {
    this.current = [];
  }

  clear(): void {
    this.echoes.length = 0;
    this.current = [];
  }

  private frameAt(frames: EchoFrame[], tick: number): EchoFrame | undefined {
    if (frames.length === 0 || tick < 0) return undefined;
    return cloneFrame(frames[Math.min(Math.floor(tick), frames.length - 1)]);
  }
}
