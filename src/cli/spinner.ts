import pc from 'picocolors';
import { msg } from './messages.js';

export interface SpinnerOptions {
  text: string;
  color?: (str: string | number) => string;
}

export class Spinner {
  private static frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private timer: NodeJS.Timeout | null = null;
  private text: string;
  private isInteractive: boolean;
  private isSpinning = false;
  private colorFn: (str: string | number) => string;

  constructor(options: string | SpinnerOptions) {
    if (typeof options === 'string') {
      this.text = options;
      this.colorFn = pc.cyan;
    } else {
      this.text = options.text;
      this.colorFn = options.color || pc.cyan;
    }
    this.isInteractive = Boolean(process.stdout.isTTY && !process.env.CI);
  }

  public start(text?: string): this {
    if (text) this.text = text;
    if (this.isSpinning) return this;

    this.isSpinning = true;
    if (this.isInteractive) {
      this.render();
      this.timer = setInterval(() => {
        this.currentFrame = (this.currentFrame + 1) % Spinner.frames.length;
        this.render();
      }, 80);
    } else {
      process.stdout.write(`... ${this.text}\n`);
    }
    return this;
  }

  public update(text: string): this {
    this.text = text;
    if (this.isInteractive && this.isSpinning) {
      this.render();
    }
    return this;
  }

  public succeed(text?: string): this {
    this.stop();
    msg.ok(text || this.text);
    return this;
  }

  public fail(text?: string): this {
    this.stop();
    msg.err(text || this.text);
    return this;
  }

  public warn(text?: string): this {
    this.stop();
    msg.warn(text || this.text);
    return this;
  }

  public info(text?: string): this {
    this.stop();
    msg.info(text || this.text);
    return this;
  }

  public stop(): this {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.isInteractive && this.isSpinning) {
      process.stdout.write('\r\x1b[K');
    }
    this.isSpinning = false;
    return this;
  }

  private render(): void {
    const frame = this.colorFn(Spinner.frames[this.currentFrame]);
    process.stdout.write(`\r${frame} ${this.text}`);
  }
}

export function createSpinner(options: string | SpinnerOptions): Spinner {
  return new Spinner(options);
}
