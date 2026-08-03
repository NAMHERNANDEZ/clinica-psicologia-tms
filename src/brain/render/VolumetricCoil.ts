import * as THREE from 'three';

export class VolumetricCoil {
  private group: THREE.Group;
  private coilMesh!: THREE.Group;
  private fieldWireframe!: THREE.Mesh;
  private active = false;
  private intensity = 0;
  private targetIntensity = 0;

  constructor() {
    this.group = new THREE.Group();
  }

  get object3D(): THREE.Group {
    return this.group;
  }

  init() {
    this.coilMesh = new THREE.Group();
    this.coilMesh.visible = false;

    const fieldGeo = new THREE.SphereGeometry(0.15, 24, 24);
    const fieldMat = new THREE.MeshBasicMaterial({
      color: '#00AAFF',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      wireframe: true,
      blending: THREE.AdditiveBlending,
    });
    this.fieldWireframe = new THREE.Mesh(fieldGeo, fieldMat);
    this.fieldWireframe.visible = false;
    this.group.add(this.fieldWireframe);
  }

  activate(config: { position: [number, number, number]; targetPosition: [number, number, number]; intensity: number }) {
    this.active = true;
    this.targetIntensity = config.intensity;
    this.coilMesh.visible = false;
    this.fieldWireframe.visible = true;
    this.fieldWireframe.position.set(config.targetPosition[0], config.targetPosition[1] + 0.4, config.targetPosition[2] + 0.4);
  }

  deactivate() {
    this.active = false;
    this.targetIntensity = 0;
    this.coilMesh.visible = false;
    this.fieldWireframe.visible = false;
  }

  update(delta: number) {
    if (!this.fieldWireframe) return;
    this.intensity += (this.targetIntensity - this.intensity) * Math.min(delta * 5, 1);
    const fieldMat = this.fieldWireframe.material as THREE.MeshBasicMaterial;
    fieldMat.opacity = this.intensity * 0.3;
    this.fieldWireframe.scale.setScalar(1 + this.intensity * 2.0);
    this.fieldWireframe.rotation.y += delta * 2;
    this.fieldWireframe.rotation.x += delta * 0.5;

    if (this.coilMesh.visible) {
      const coilMat = this.coilMesh.children[0]?.material as THREE.MeshStandardMaterial;
      if (coilMat && coilMat.emissive) {
        coilMat.emissiveIntensity = 0.3 + this.intensity * 0.7;
      }
    }
  }

  isActive(): boolean {
    return this.active;
  }

  getIntensity(): number {
    return this.intensity;
  }
}
