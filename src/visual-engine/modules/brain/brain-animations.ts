import type { BrainActivityLevel } from '../../core/StateMapper';

export interface BrainAnimation {
  name: string;
  keyframes: string;
  duration: string;
  timing: string;
  iteration: string;
}

export const BRAIN_ANIMATIONS: Record<string, BrainAnimation> = {
  idle: {
    name: 'brain-idle',
    keyframes: `@keyframes brain-idle { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.6; } }`,
    duration: '4s',
    timing: 'ease-in-out',
    iteration: 'infinite',
  },
  low: {
    name: 'brain-low',
    keyframes: `@keyframes brain-low { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.7; } }`,
    duration: '3s',
    timing: 'ease-in-out',
    iteration: 'infinite',
  },
  active: {
    name: 'brain-active',
    keyframes: `@keyframes brain-active { 0%, 100% { opacity: 0.6; filter: brightness(1); } 50% { opacity: 0.9; filter: brightness(1.2); } }`,
    duration: '2s',
    timing: 'ease-in-out',
    iteration: 'infinite',
  },
  stimulated: {
    name: 'brain-stimulated',
    keyframes: `@keyframes brain-stimulated { 0% { opacity: 0.7; filter: brightness(1); } 25% { opacity: 1; filter: brightness(1.4); } 50% { opacity: 0.8; filter: brightness(1.1); } 75% { opacity: 1; filter: brightness(1.3); } 100% { opacity: 0.7; filter: brightness(1); } }`,
    duration: '1.5s',
    timing: 'ease-in-out',
    iteration: 'infinite',
  },
  high_response: {
    name: 'brain-high',
    keyframes: `@keyframes brain-high { 0% { opacity: 0.8; filter: brightness(1.1); } 30% { opacity: 1; filter: brightness(1.5); } 60% { opacity: 0.9; filter: brightness(1.2); } 100% { opacity: 0.8; filter: brightness(1.1); } }`,
    duration: '1.2s',
    timing: 'ease-in-out',
    iteration: 'infinite',
  },
  risk: {
    name: 'brain-risk',
    keyframes: `@keyframes brain-risk { 0%, 100% { opacity: 0.8; filter: brightness(1); } 50% { opacity: 1; filter: brightness(1.6) saturate(1.5); } }`,
    duration: '0.8s',
    timing: 'ease-in-out',
    iteration: 'infinite',
  },
  pulse_ring: {
    name: 'pulse-ring',
    keyframes: `@keyframes pulse-ring { 0% { r: 14; opacity: 0.6; } 100% { r: 30; opacity: 0; } }`,
    duration: '1.8s',
    timing: 'ease-out',
    iteration: 'infinite',
  },
};

export function getBrainAnimation(level: BrainActivityLevel): BrainAnimation {
  return BRAIN_ANIMATIONS[level] || BRAIN_ANIMATIONS.idle;
}

export function injectBrainKeyframes(): string {
  return Object.values(BRAIN_ANIMATIONS).map(a => a.keyframes).join('\n');
}
