import * as THREE from 'three';

export interface RegionNode {
  id: string;
  position: THREE.Vector3;
  connections: string[];
  activation: number;
  targetActivation: number;
}

export interface SimulationConfig {
  targetRegion: string;
  protocol: {
    name: string;
    frequency_hz: number;
    intensity_pct_mt: number;
    duration_sec: number;
    total_pulses: number;
  };
  mtPct: number;
}

interface SimulationPhase {
  name: string;
  durationMs: number;
  onEnter: () => void;
}

const PHASE_NAMES = ['Activación inicial', 'Incremento de intensidad', 'Propagación neural', 'Estimulación completa'];

export class ProtocolSimulationEngine {
  private regions: Map<string, RegionNode> = new Map();
  private phases: SimulationPhase[] = [];
  private currentPhase = -1;
  private running = false;
  private onPhaseChange?: (phase: number, name: string) => void;
  private onActivationChange?: (activations: Map<string, number>) => void;
  private onCoilPulse?: (intensity: number) => void;
  private onSimulationEnd?: () => void;
  private timeouts: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    this.initPhases();
  }

  private initPhases() {
    this.phases = [
      {
        name: PHASE_NAMES[0],
        durationMs: 400,
        onEnter: () => { /* coil approach */ },
      },
      {
        name: PHASE_NAMES[1],
        durationMs: 600,
        onEnter: () => { /* intensity ramp */ },
      },
      {
        name: PHASE_NAMES[2],
        durationMs: 600,
        onEnter: () => { /* propagation */ },
      },
      {
        name: PHASE_NAMES[3],
        durationMs: 800,
        onEnter: () => { /* peak stimulation */ },
      },
    ];
  }

  setRegions(regionNodes: RegionNode[]) {
    this.regions.clear();
    regionNodes.forEach(r => this.regions.set(r.id, r));
  }

  onPhaseChange(cb: (phase: number, name: string) => void) { this.onPhaseChange = cb; }
  onActivationChange(cb: (activations: Map<string, number>) => void) { this.onActivationChange = cb; }
  onCoilPulse(cb: (intensity: number) => void) { this.onCoilPulse = cb; }
  onSimulationEnd(cb: () => void) { this.onSimulationEnd = cb; }

  private getCoilPosition(targetId: string): THREE.Vector3 {
    const target = this.regions.get(targetId);
    if (!target) return new THREE.Vector3(0, 0, 3);
    return new THREE.Vector3(
      target.position.x * 0.6,
      target.position.y * 0.6 + 1.5,
      target.position.z + 2,
    );
  }

  private getEffectiveIntensity(mtPct: number, intensityPctMt: number): number {
    return (mtPct * intensityPctMt) / 10000;
  }

  private gaussianField(distance: number, sigma: number): number {
    return Math.exp(-(distance * distance) / (sigma * sigma));
  }

  private propagateActivation(sourceId: string, baseActivation: number, depth = 0) {
    if (depth > 3) return;
    const source = this.regions.get(sourceId);
    if (!source) return;

    source.connections.forEach(connId => {
      const target = this.regions.get(connId);
      if (!target) return;

      const distance = source.position.distanceTo(target.position);
      const fieldStrength = this.gaussianField(distance, 1.5);
      const decay = Math.pow(0.5, depth + 1);
      const propagated = baseActivation * fieldStrength * decay;

      if (propagated > target.targetActivation) {
        target.targetActivation = Math.min(propagated, 1.0);
      }

      this.propagateActivation(connId, propagated, depth + 1);
    });
  }

  async start(config: SimulationConfig) {
    if (this.running) return;
    this.running = true;
    this.currentPhase = -1;

    this.regions.forEach(r => { r.activation = 0; r.targetActivation = 0; });

    const target = this.regions.get(config.targetRegion);
    if (!target) { this.running = false; this.onSimulationEnd?.(); return; }

    const effectiveIntensity = this.getEffectiveIntensity(config.mtPct, config.protocol.intensity_pct_mt);
    const sigma = 0.8 + (1 - effectiveIntensity) * 0.5;

    for (let i = 0; i < this.phases.length; i++) {
      if (!this.running) break;
      this.currentPhase = i;
      this.onPhaseChange?.(i, this.phases[i].name);
      this.phases[i].onEnter();

      switch (i) {
        case 0: {
          target.targetActivation = 0.3;
          this.onCoilPulse?.(0.3);
          break;
        }
        case 1: {
          target.targetActivation = 0.6;
          this.onCoilPulse?.(0.6);
          break;
        }
        case 2: {
          target.targetActivation = 0.85;
          this.propagateActivation(config.targetRegion, 0.5);
          this.onCoilPulse?.(0.85);
          break;
        }
        case 3: {
          target.targetActivation = 1.0;
          this.propagateActivation(config.targetRegion, 0.8);
          this.onCoilPulse?.(1.0);
          break;
        }
      }

      this.onActivationChange?.(this.getAllActivations());

      await new Promise<void>(resolve => {
        const t = setTimeout(resolve, this.phases[i].durationMs);
        this.timeouts.push(t);
      });
    }

    this.running = false;
    this.onSimulationEnd?.();
  }

  stop() {
    this.running = false;
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
    this.regions.forEach(r => { r.activation = 0; r.targetActivation = 0; });
    this.onActivationChange?.(this.getAllActivations());
  }

  update(delta: number) {
    const lerpSpeed = 4;
    this.regions.forEach(region => {
      region.activation += (region.targetActivation - region.activation) * Math.min(delta * lerpSpeed, 1);
    });
  }

  getAllActivations(): Map<string, number> {
    const result = new Map<string, number>();
    this.regions.forEach((r, id) => result.set(id, r.activation));
    return result;
  }

  getCurrentPhase(): number {
    return this.currentPhase;
  }

  isRunning(): boolean {
    return this.running;
  }

  getPhaseNames(): string[] {
    return PHASE_NAMES;
  }

  dispose() {
    this.stop();
    this.regions.clear();
  }
}
