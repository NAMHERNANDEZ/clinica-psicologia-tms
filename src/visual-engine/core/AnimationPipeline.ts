export interface AnimationConfig {
  duration: number;
  easing: string;
  delay: number;
  iterations: number;
}

export const ANIMATION_PRESETS: Record<string, AnimationConfig> = {
  pulse: { duration: 1500, easing: 'ease-in-out', delay: 0, iterations: Infinity },
  fadeIn: { duration: 500, easing: 'ease-out', delay: 0, iterations: 1 },
  slideUp: { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', delay: 0, iterations: 1 },
  brainWave: { duration: 2000, easing: 'ease-in-out', delay: 0, iterations: Infinity },
  pulseRing: { duration: 1800, easing: 'ease-out', delay: 0, iterations: Infinity },
  countUp: { duration: 800, easing: 'ease-out', delay: 0, iterations: 1 },
  shimmer: { duration: 2000, easing: 'linear', delay: 0, iterations: Infinity },
  bounce: { duration: 600, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', delay: 0, iterations: 1 },
};

export function getAnimationStyle(preset: string): React.CSSProperties {
  const config = ANIMATION_PRESETS[preset] || ANIMATION_PRESETS.fadeIn;
  return {
    animationDuration: `${config.duration}ms`,
    animationTimingFunction: config.easing,
    animationDelay: `${config.delay}ms`,
    animationIterationCount: config.iterations,
  };
}

export function createKeyframes(name: string, frames: Record<string, React.CSSProperties>): string {
  const frameStr = Object.entries(frames)
    .map(([pct, styles]) => {
      const props = Object.entries(styles)
        .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
        .join(';');
      return `${pct} { ${props} }`;
    })
    .join(' ');

  return `@keyframes ${name} { ${frameStr} }`;
}

export class AnimationPipeline {
  private queue: Array<{ name: string; config: AnimationConfig; execute: () => void }> = [];

  add(name: string, config: AnimationConfig, execute: () => void) {
    this.queue.push({ name, config, execute });
  }

  async run(): Promise<void> {
    for (const item of this.queue) {
      await new Promise(resolve => setTimeout(resolve, item.config.delay));
      item.execute();
      await new Promise(resolve => setTimeout(resolve, item.config.duration));
    }
    this.queue = [];
  }

  clear() {
    this.queue = [];
  }
}
