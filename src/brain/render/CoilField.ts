import * as THREE from 'three';
import { ClinicalColors } from './MaterialLibrary';

interface CoilConfig {
  position: [number, number, number];
  targetPosition: [number, number, number];
  intensity: number;
  sigma: number;
}

export class CoilField {
  private group: THREE.Group;
  private fieldMeshes: THREE.Mesh[] = [];
  private ringMeshes: THREE.Mesh[] = [];
  private coilMesh!: THREE.Mesh;
  private active = false;
  private intensity = 0;
  private targetIntensity = 0;
  private pulsePhase = 0;

  constructor() {
    this.group = new THREE.Group();
  }

  get object3D(): THREE.Group {
    return this.group;
  }

  init() {
    const coilGeometry = new THREE.TorusGeometry(0.3, 0.06, 16, 32);
    const coilMaterial = new THREE.MeshStandardMaterial({
      color: '#94A3B8',
      roughness: 0.3,
      metalness: 0.7,
      emissive: '#1E293B',
      emissiveIntensity: 0.2,
    });
    this.coilMesh = new THREE.Mesh(coilGeometry, coilMaterial);
    this.coilMesh.rotation.x = Math.PI / 2;
    this.coilMesh.visible = false;
    this.group.add(this.coilMesh);

    for (let i = 0; i < 5; i++) {
      const ringGeo = new THREE.RingGeometry(0.1 + i * 0.15, 0.12 + i * 0.15, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: ClinicalColors.low,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.visible = false;
      this.ringMeshes.push(ring);
      this.group.add(ring);
    }

    for (let i = 0; i < 8; i++) {
      const size = 0.3 + i * 0.25;
      const fieldGeo = new THREE.SphereGeometry(size, 16, 16);
      const fieldMat = new THREE.MeshBasicMaterial({
        color: ClinicalColors.low,
        transparent: true,
        opacity: 0,
        wireframe: true,
        depthWrite: false,
      });
      const field = new THREE.Mesh(fieldGeo, fieldMat);
      field.visible = false;
      this.fieldMeshes.push(field);
      this.group.add(field);
    }
  }

  activate(config: CoilConfig) {
    this.active = true;
    this.targetIntensity = config.intensity;
    this.coilMesh.visible = true;
    this.coilMesh.position.set(...config.position);

    const dir = new THREE.Vector3(
      config.targetPosition[0] - config.position[0],
      config.targetPosition[1] - config.position[1],
      config.targetPosition[2] - config.position[2],
    ).normalize();
    this.coilMesh.lookAt(
      config.position[0] + dir.x,
      config.position[1] + dir.y,
      config.position[2] + dir.z,
    );

    this.fieldMeshes.forEach((f, i) => {
      f.visible = true;
      f.position.set(...config.position);
    });
    this.ringMeshes.forEach(r => { r.visible = true; r.position.set(...config.position); });
  }

  deactivate() {
    this.active = false;
    this.targetIntensity = 0;
    this.coilMesh.visible = false;
    this.fieldMeshes.forEach(f => { f.visible = false; });
    this.ringMeshes.forEach(r => { r.visible = false; });
  }

  getIntensityAtDistance(distance: number, sigma = 0.8): number {
    return Math.exp(-(distance * distance) / (sigma * sigma));
  }

  update(delta: number) {
    this.intensity += (this.targetIntensity - this.intensity) * Math.min(delta * 5, 1);

    if (!this.active || this.intensity < 0.01) return;

    this.pulsePhase += delta * 4;

    this.fieldMeshes.forEach((field, i) => {
      const baseScale = 1 + i * 0.3;
      const pulse = Math.sin(this.pulsePhase + i * 0.5) * 0.1;
      field.scale.setScalar((baseScale + pulse) * this.intensity);

      const mat = field.material as THREE.MeshBasicMaterial;
      mat.opacity = this.intensity * 0.06 * (1 - i / 8);
      mat.color.set(
        this.intensity > 0.7 ? ClinicalColors.high
          : this.intensity > 0.4 ? ClinicalColors.mid
            : ClinicalColors.low
      );
    });

    this.ringMeshes.forEach((ring, i) => {
      const expand = Math.sin(this.pulsePhase * 2 + i * 0.8) * 0.5 + 0.5;
      const baseScale = 0.5 + i * 0.3;
      ring.scale.setScalar((baseScale + expand * 0.5) * this.intensity);

      const mat = ring.material as THREE.MeshBasicMaterial;
      mat.opacity = this.intensity * 0.12 * (1 - i / 5);

      ring.rotation.z += delta * (0.5 + i * 0.2);
    });

    const coilMat = this.coilMesh.material as THREE.MeshStandardMaterial;
    coilMat.emissiveIntensity = 0.2 + this.intensity * 0.8;
    coilMat.emissive.set(
      this.intensity > 0.7 ? '#805AD5'
        : this.intensity > 0.4 ? '#3B82F6'
          : '#4FD1C5'
    );
  }

  isActive(): boolean {
    return this.active;
  }

  getIntensity(): number {
    return this.intensity;
  }
}
