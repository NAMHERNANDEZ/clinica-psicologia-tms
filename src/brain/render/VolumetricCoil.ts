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

    const coilMat = new THREE.MeshStandardMaterial({
      color: '#7A8A9A',
      roughness: 0.45,
      metalness: 0.35,
    });

    const loop1 = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 12, 24), coilMat);
    loop1.position.x = -0.16;
    loop1.rotation.x = Math.PI / 2;

    const loop2 = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 12, 24), coilMat);
    loop2.position.x = 0.16;
    loop2.rotation.x = Math.PI / 2;

    const handleMat = new THREE.MeshStandardMaterial({
      color: '#5A6A7A',
      roughness: 0.6,
      metalness: 0.3,
    });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 8), handleMat);
    handle.position.y = 0.22;

    const casingMat = new THREE.MeshStandardMaterial({
      color: '#4A5A6A',
      roughness: 0.5,
      metalness: 0.2,
    });
    const casing = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.06, 0.08), casingMat);
    casing.position.y = 0.06;

    this.coilMesh.add(loop1, loop2, handle, casing);
    this.coilMesh.visible = false;
    this.group.add(this.coilMesh);

    const fieldGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const fieldMat = new THREE.MeshBasicMaterial({
      color: '#2E7D8A',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      wireframe: true,
    });
    this.fieldWireframe = new THREE.Mesh(fieldGeo, fieldMat);
    this.fieldWireframe.visible = false;
    this.group.add(this.fieldWireframe);
  }

  activate(config: { position: [number, number, number]; targetPosition: [number, number, number]; intensity: number }) {
    this.active = true;
    this.targetIntensity = config.intensity;
    this.coilMesh.visible = true;
    this.coilMesh.position.set(...config.position);
    this.fieldWireframe.visible = true;

    const mx = (config.position[0] + config.targetPosition[0]) / 2;
    const my = (config.position[1] + config.targetPosition[1]) / 2;
    const mz = (config.position[2] + config.targetPosition[2]) / 2;
    this.fieldWireframe.position.set(mx, my, mz);

    const dir = new THREE.Vector3(
      config.targetPosition[0] - config.position[0],
      config.targetPosition[1] - config.position[1],
      config.targetPosition[2] - config.position[2],
    ).normalize();
    this.coilMesh.lookAt(
      this.coilMesh.position.x + dir.x,
      this.coilMesh.position.y + dir.y,
      this.coilMesh.position.z + dir.z,
    );
  }

  deactivate() {
    this.active = false;
    this.targetIntensity = 0;
    this.coilMesh.visible = false;
    this.fieldWireframe.visible = false;
  }

  update(delta: number) {
    if (!this.fieldWireframe) return;
    this.intensity += (this.targetIntensity - this.intensity) * Math.min(delta * 4, 1);
    const fieldMat = this.fieldWireframe.material as THREE.MeshBasicMaterial;
    fieldMat.opacity = this.intensity * 0.2;
    this.fieldWireframe.scale.setScalar(1 + this.intensity * 1.5);
  }

  isActive(): boolean {
    return this.active;
  }

  getIntensity(): number {
    return this.intensity;
  }
}
