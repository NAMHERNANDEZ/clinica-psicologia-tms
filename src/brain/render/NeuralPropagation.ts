import * as THREE from 'three';

interface PropagationPath {
  fromId: string;
  toId: string;
  particles: THREE.Points;
  positions: Float32Array;
  curve: THREE.QuadraticBezierCurve3;
  progress: number;
  speed: number;
}

export class NeuralPropagation {
  private scene: THREE.Scene;
  private paths: PropagationPath[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  createPath(fromPos: THREE.Vector3, toPos: THREE.Vector3, fromId: string, toId: string, delay = 0) {
    const mid = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
    mid.y += 0.15;
    const curve = new THREE.QuadraticBezierCurve3(fromPos.clone(), mid, toPos.clone());

    const count = 8;
    const positions = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x22d3ee,
      size: 0.025,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      depthWrite: false,
    });
    const particles = new THREE.Points(geo, mat);
    this.scene.add(particles);

    this.paths.push({ fromId, toId, particles, positions, curve, progress: -delay, speed: 0.6 });
  }

  update(dt: number) {
    for (const p of this.paths) {
      p.progress += dt * p.speed;
      if (p.progress < 0) { p.particles.visible = false; continue; }
      p.particles.visible = true;
      const n = p.positions.length / 3;
      for (let i = 0; i < n; i++) {
        const t = ((p.progress * 0.4 + i / n) % 1);
        const pt = p.curve.getPoint(t);
        p.positions[i * 3] = pt.x;
        p.positions[i * 3 + 1] = pt.y;
        p.positions[i * 3 + 2] = pt.z;
      }
      p.particles.geometry.attributes.position.needsUpdate = true;
      const mat = p.particles.material as THREE.PointsMaterial;
      if (p.progress > 2.5) mat.opacity = Math.max(0, 1 - (p.progress - 2.5));
    }
  }

  clear() {
    for (const p of this.paths) {
      this.scene.remove(p.particles);
      p.particles.geometry.dispose();
      (p.particles.material as THREE.Material).dispose();
    }
    this.paths = [];
  }

  dispose() { this.clear(); }
}
