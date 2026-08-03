import * as THREE from 'three';

interface Synapse {
  line: THREE.Line;
  fromId: string;
  toId: string;
  baseWeight: number;
}

function lineColor(level: number): number {
  if (level < 0.2) return 0x0A2848;
  if (level < 0.4) return 0x003366;
  if (level < 0.6) return 0x005588;
  if (level < 0.75) return 0x0088CC;
  if (level < 0.85) return 0xFF8800;
  return 0xFF4400;
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
        mat.opacity = 0.15 + maxAct * 0.5 + w * 0.2;
      } else {
        mat.color.setHex(0x0A1828);
        mat.opacity = 0.04 + w * 0.04;
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
