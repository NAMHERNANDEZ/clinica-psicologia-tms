import * as THREE from 'three';

export class StimulationVisualizer {
  private scene: THREE.Scene;
  private waves: THREE.Mesh[] = [];
  private coilPosition = new THREE.Vector3();
  private intensity = 0;
  private time = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  startStimulation(position: [number, number, number], intensity: number) {
    this.stopStimulation();
    this.coilPosition.set(...position);
    this.intensity = intensity;

    for (let i = 0; i < 5; i++) {
      const geo = new THREE.RingGeometry(0.08, 0.1, 48);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const wave = new THREE.Mesh(geo, mat);
      wave.position.copy(this.coilPosition);
      wave.lookAt(0, 0, 0);
      wave.userData = { delay: i * 0.25, maxRadius: 0.4 + i * 0.08, born: this.time };
      this.scene.add(wave);
      this.waves.push(wave);
    }
  }

  update(dt: number) {
    this.time += dt;
    for (const w of this.waves) {
      const { delay, maxRadius, born } = w.userData;
      const age = this.time - born - delay;
      if (age < 0) { w.visible = false; continue; }
      w.visible = true;
      const t = (age % 1.8) / 1.8;
      w.scale.setScalar(t * maxRadius * 10);
      const mat = w.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - t) * 0.5 * (this.intensity / 100);
    }
  }

  stopStimulation() {
    for (const w of this.waves) {
      this.scene.remove(w);
      w.geometry.dispose();
      (w.material as THREE.Material).dispose();
    }
    this.waves = [];
    this.intensity = 0;
  }

  dispose() { this.stopStimulation(); }
}
