import * as THREE from 'three';

function activationColor(value: number): string {
  if (value < 0.1) return '#6B7B8D';
  if (value < 0.25) return '#38BDF8';
  if (value < 0.5) return '#0EA5E9';
  if (value < 0.7) return '#2563EB';
  return '#818CF8';
}

export class RegionMesh {
  public mesh: THREE.Mesh;
  public hitbox: THREE.Mesh;
  private crosshairH: THREE.Mesh;
  private crosshairV: THREE.Mesh;
  private ringMesh: THREE.Mesh;
  private glowSphere: THREE.Mesh;
  public id: string;
  private activation = 0;
  private targetActivation = 0;

  constructor(id: string, position: [number, number, number], radius = 0.08) {
    this.id = id;

    const sphereGeo = new THREE.SphereGeometry(radius, 24, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: '#4A5568',
      roughness: 0.7,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
      emissive: '#000000',
      emissiveIntensity: 0,
    });
    this.mesh = new THREE.Mesh(sphereGeo, sphereMat);
    this.mesh.position.set(position[0], position[1], position[2]);
    (this.mesh as any).userData = { regionId: id };

    const hitboxGeo = new THREE.SphereGeometry(radius * 2.5, 8, 8);
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
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
      color: '#0EA5E9',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.position.set(position[0], position[1], position[2]);
    this.ringMesh.lookAt(0, 0, 0);

    const glowGeo = new THREE.SphereGeometry(radius * 1.8, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: '#0EA5E9',
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.glowSphere = new THREE.Mesh(glowGeo, glowMat);
    this.glowSphere.position.set(position[0], position[1], position[2]);
  }

  get meshes(): THREE.Mesh[] {
    return [this.mesh, this.hitbox, this.crosshairH, this.crosshairV, this.ringMesh, this.glowSphere];
  }

  setActivation(value: number) {
    this.targetActivation = Math.max(0, Math.min(1, value));
  }

  update(delta: number) {
    const speed = 5;
    this.activation += (this.targetActivation - this.activation) * Math.min(delta * speed, 1);

    const color = activationColor(this.activation);
    const col = new THREE.Color(color);

    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    mat.color.set(col);
    mat.emissive.set(col);
    mat.emissiveIntensity = this.activation * 2.5;
    mat.opacity = 0.6 + this.activation * 0.4;

    const showCrosshair = this.activation > 0.1;
    const chHMat = this.crosshairH.material as THREE.MeshBasicMaterial;
    const chVMat = this.crosshairV.material as THREE.MeshBasicMaterial;
    chHMat.opacity = showCrosshair ? 0.4 + this.activation * 0.6 : 0;
    chVMat.opacity = showCrosshair ? 0.4 + this.activation * 0.6 : 0;
    chHMat.color.set(col);
    chVMat.color.set(col);

    const ringMat = this.ringMesh.material as THREE.MeshBasicMaterial;
    ringMat.color.set(col);
    ringMat.opacity = this.activation > 0.2 ? 0.3 + this.activation * 0.6 : 0;
    const ringScale = 1 + this.activation * 0.6;
    this.ringMesh.scale.setScalar(ringScale);

    const glowMat = this.glowSphere.material as THREE.MeshBasicMaterial;
    glowMat.color.set(col);
    glowMat.opacity = this.activation > 0.1 ? this.activation * 0.25 : 0;
    this.glowSphere.scale.setScalar(1.0 + this.activation * 0.8);
  }

  getActivation(): number {
    return this.activation;
  }
}
