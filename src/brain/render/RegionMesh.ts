import * as THREE from 'three';

function activationColor(value: number): string {
  if (value < 0.15) return '#3B4A5C';
  if (value < 0.4) return '#2E7D8A';
  if (value < 0.7) return '#2563A8';
  return '#4A5AC0';
}

export class RegionMesh {
  public mesh: THREE.Mesh;
  public hitbox: THREE.Mesh;
  private crosshairH: THREE.Mesh;
  private crosshairV: THREE.Mesh;
  private ringMesh: THREE.Mesh;
  public id: string;
  private activation = 0;
  private targetActivation = 0;

  constructor(id: string, position: [number, number, number], radius = 0.08) {
    this.id = id;

    const sphereGeo = new THREE.SphereGeometry(radius, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: '#2E3A4A',
      roughness: 0.85,
      metalness: 0.05,
      transparent: true,
      opacity: 0.9,
    });
    this.mesh = new THREE.Mesh(sphereGeo, sphereMat);
    this.mesh.position.set(position[0], position[1], position[2]);
    (this.mesh as any).userData = { regionId: id };

    const hitboxGeo = new THREE.SphereGeometry(radius * 2.5, 8, 8);
    const hitboxMat = new THREE.MeshBasicMaterial({
      visible: false,
    });
    this.hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
    this.hitbox.position.set(position[0], position[1], position[2]);
    (this.hitbox as any).userData = { regionId: id };

    const chMat = new THREE.MeshBasicMaterial({
      color: '#C0C8D4',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const chH = new THREE.PlaneGeometry(radius * 3.5, 0.008);
    this.crosshairH = new THREE.Mesh(chH, chMat.clone());
    this.crosshairH.position.set(position[0], position[1], position[2]);
    this.crosshairH.lookAt(0, 0, 0);

    const chV = new THREE.PlaneGeometry(0.008, radius * 3.5);
    this.crosshairV = new THREE.Mesh(chV, chMat.clone());
    this.crosshairV.position.set(position[0], position[1], position[2]);
    this.crosshairV.lookAt(0, 0, 0);

    const ringGeo = new THREE.RingGeometry(radius * 2.0, radius * 2.3, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#2E7D8A',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.position.set(position[0], position[1], position[2]);
    this.ringMesh.lookAt(0, 0, 0);
  }

  get meshes(): THREE.Mesh[] {
    return [this.mesh, this.hitbox, this.crosshairH, this.crosshairV, this.ringMesh];
  }

  setActivation(value: number) {
    this.targetActivation = Math.max(0, Math.min(1, value));
  }

  update(delta: number) {
    const speed = 4;
    this.activation += (this.targetActivation - this.activation) * Math.min(delta * speed, 1);

    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    mat.color.set(activationColor(this.activation));
    mat.emissive.set(activationColor(this.activation));
    mat.emissiveIntensity = this.activation * 0.15;
    mat.opacity = 0.6 + this.activation * 0.3;

    const showCrosshair = this.activation > 0.1;
    const chHMat = this.crosshairH.material as THREE.MeshBasicMaterial;
    const chVMat = this.crosshairV.material as THREE.MeshBasicMaterial;
    chHMat.opacity = showCrosshair ? 0.3 + this.activation * 0.5 : 0;
    chVMat.opacity = showCrosshair ? 0.3 + this.activation * 0.5 : 0;
    chHMat.color.set(activationColor(this.activation));
    chVMat.color.set(activationColor(this.activation));

    const ringMat = this.ringMesh.material as THREE.MeshBasicMaterial;
    ringMat.color.set(activationColor(this.activation));
    ringMat.opacity = this.activation > 0.3 ? 0.2 + this.activation * 0.3 : 0;
    const ringScale = 1 + this.activation * 0.3;
    this.ringMesh.scale.setScalar(ringScale);
  }

  getActivation(): number {
    return this.activation;
  }
}
