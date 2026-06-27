import * as THREE from 'three';

interface Synapse {
  line: THREE.Line;
  fromId: string;
  toId: string;
  baseWeight: number;
}

function lineColor(level: number): number {
  if (level < 0.2) return 0x2A3A4A;
  if (level < 0.5) return 0x2E7D8A;
  if (level < 0.8) return 0x2563A8;
  return 0x4A5AC0;
}

export class ConnectionLines {
  private synapses: Synapse[] = [];

  addConnection(
    scene: THREE.Scene,
    fromPos: THREE.Vector3,
    toPos: THREE.Vector3,
    fromId: string,
    toId: string,
    weight: number,
  ): void {
    const mid = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
    mid.y += 0.06;
    const curve = new THREE.QuadraticBezierCurve3(fromPos, mid, toPos);
    const points = curve.getPoints(20);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x2A3A4A,
      transparent: true,
      opacity: 0.08 + weight * 0.1,
    });
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    this.synapses.push({ line, fromId, toId, baseWeight: weight });
  }

  update(
    _delta: number,
    activations: Map<string, number>,
    connectome: number[][],
    regions: string[],
  ): void {
    for (const s of this.synapses) {
      const fromAct = activations.get(s.fromId) || 0;
      const toAct = activations.get(s.toId) || 0;
      const maxAct = Math.max(fromAct, toAct);

      const fi = regions.indexOf(s.fromId);
      const ti = regions.indexOf(s.toId);
      const w = (fi >= 0 && ti >= 0 && connectome[fi]) ? connectome[fi][ti] : s.baseWeight;

      const mat = s.line.material as THREE.LineBasicMaterial;
      if (maxAct > 0.15) {
        mat.color.setHex(lineColor(maxAct));
        mat.opacity = 0.15 + maxAct * 0.4 + w * 0.15;
      } else {
        mat.color.setHex(0x2A3A4A);
        mat.opacity = 0.05 + w * 0.05;
      }
    }
  }

  dispose(scene: THREE.Scene): void {
    for (const s of this.synapses) {
      scene.remove(s.line);
      s.line.geometry.dispose();
      (s.line.material as THREE.Material).dispose();
    }
    this.synapses = [];
  }
}
