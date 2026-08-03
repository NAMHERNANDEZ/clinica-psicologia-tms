import * as THREE from 'three';
import { thermalColor } from './MaterialLibrary';

export class RegionMesh {
  public mesh: THREE.Mesh;
  public hitbox: THREE.Mesh;
  private crosshairH: THREE.Mesh;
  private crosshairV: THREE.Mesh;
  private ringMesh: THREE.Mesh;
  private glowSphere: THREE.Mesh;
  private pulseRing: THREE.Mesh;
  private innerGlow: THREE.Mesh;
  private targetMarker: THREE.Mesh;
  public id: string;
  private activation = 0;
  private targetActivation = 0;
  private time = 0;
  private isTarget = false;

  constructor(id: string, position: [number, number, number], radius = 0.08) {
    this.id = id;

    const sphereGeo = new THREE.SphereGeometry(radius, 32, 32);
    const sphereMat = new THREE.MeshPhysicalMaterial({
      color: '#7E8C96',
      roughness: 0.4,
      metalness: 0.15,
      transparent: true,
      opacity: 0.85,
      emissive: '#000000',
      emissiveIntensity: 0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.2,
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
      color: '#00AAFF',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const chH = new THREE.PlaneGeometry(radius * 3.5, 0.006);
    this.crosshairH = new THREE.Mesh(chH, chMat.clone());
    this.crosshairH.position.set(position[0], position[1], position[2]);
    this.crosshairH.lookAt(0, 0, 0);

    const chV = new THREE.PlaneGeometry(0.006, radius * 3.5);
    this.crosshairV = new THREE.Mesh(chV, chMat.clone());
    this.crosshairV.position.set(position[0], position[1], position[2]);
    this.crosshairV.lookAt(0, 0, 0);

    const ringGeo = new THREE.RingGeometry(radius * 2.0, radius * 2.25, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#00AAFF',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.position.set(position[0], position[1], position[2]);
    this.ringMesh.lookAt(0, 0, 0);

    const pulseGeo = new THREE.RingGeometry(radius * 1.5, radius * 3.0, 32);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: '#00AAFF',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.pulseRing = new THREE.Mesh(pulseGeo, pulseMat);
    this.pulseRing.position.set(position[0], position[1], position[2]);
    this.pulseRing.lookAt(0, 0, 0);

    const glowGeo = new THREE.SphereGeometry(radius * 2.2, 24, 24);
    const glowMat = new THREE.MeshBasicMaterial({
      color: '#00AAFF',
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.glowSphere = new THREE.Mesh(glowGeo, glowMat);
    this.glowSphere.position.set(position[0], position[1], position[2]);

    const innerGeo = new THREE.SphereGeometry(radius * 0.6, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: '#FFFFFF',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.innerGlow = new THREE.Mesh(innerGeo, innerMat);
    this.innerGlow.position.set(position[0], position[1], position[2]);

    const tmGeo = new THREE.RingGeometry(radius * 3.0, radius * 4.5, 6);
    const tmMat = new THREE.MeshBasicMaterial({
      color: '#FFFFFF',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.targetMarker = new THREE.Mesh(tmGeo, tmMat);
    this.targetMarker.position.set(position[0], position[1], position[2]);
    this.targetMarker.lookAt(0, 0, 0);
  }

  get meshes(): THREE.Mesh[] {
    return [this.mesh, this.hitbox, this.crosshairH, this.crosshairV, this.ringMesh, this.glowSphere, this.pulseRing, this.innerGlow, this.targetMarker];
  }

  setTarget(target: boolean) {
    this.isTarget = target;
  }

  setActivation(value: number) {
    const clamped = Math.max(0, Math.min(1, value));
    this.targetActivation = clamped;
  }

  update(delta: number) {
    this.time += delta;
    const speed = 6;
    this.activation += (this.targetActivation - this.activation) * Math.min(delta * speed, 1);

    const mat = this.mesh.material as THREE.MeshPhysicalMaterial;

    if (this.isTarget) {
      const pulse = Math.sin(this.time * 5) * 0.5 + 0.5;
      const mix = Math.sin(this.time * 3) * 0.5 + 0.5;

      const greenPurpleLilac = new THREE.Color().lerpColors(
        new THREE.Color('#00FF00'),
        new THREE.Color('#9932CC'),
        mix,
      );
      const lilac = new THREE.Color('#C8A2C8');

      mat.color.copy(greenPurpleLilac);
      mat.emissive.copy(lilac);
      mat.emissiveIntensity = 8;
      mat.opacity = 1;
      this.mesh.scale.setScalar(1.4 + pulse * 0.1);

      const chHMat = this.crosshairH.material as THREE.MeshBasicMaterial;
      const chVMat = this.crosshairV.material as THREE.MeshBasicMaterial;
      chHMat.color.set('#00FF00');
      chVMat.color.set('#8B00FF');
      chHMat.opacity = 0.9;
      chVMat.opacity = 0.9;

      const ringMat = this.ringMesh.material as THREE.MeshBasicMaterial;
      ringMat.color.set('#00FF00');
      ringMat.opacity = 0.9;
      this.ringMesh.scale.setScalar(1.3);

      const pulseMat = this.pulseRing.material as THREE.MeshBasicMaterial;
      pulseMat.color.set('#C8A2C8');
      pulseMat.opacity = pulse * 0.8;
      this.pulseRing.scale.setScalar(1.2 + pulse * 0.5);

      const glowMat = this.glowSphere.material as THREE.MeshBasicMaterial;
      glowMat.color.set('#8B00FF');
      glowMat.opacity = 0.8;
      this.glowSphere.scale.setScalar(1.5 + pulse * 0.2);

      const innerMat = this.innerGlow.material as THREE.MeshBasicMaterial;
      innerMat.color.set('#C8A2C8');
      innerMat.opacity = 1;
      this.innerGlow.scale.setScalar(1.0);

      const tmMat = this.targetMarker.material as THREE.MeshBasicMaterial;
      tmMat.color.copy(greenPurpleLilac);
      tmMat.opacity = 1;
      this.targetMarker.scale.setScalar(1.2 + pulse * 0.2);
      this.targetMarker.rotation.z += delta * 3;
    } else {
      const col = new THREE.Color(thermalColor(this.activation));

      mat.color.set(col);
      mat.emissive.set(col);
      mat.emissiveIntensity = this.activation * 4.0;
      mat.opacity = 0.85 + this.activation * 0.15;
      this.mesh.scale.setScalar(1.0);

      const showCrosshair = this.activation > 0.15;
      const chHMat = this.crosshairH.material as THREE.MeshBasicMaterial;
      const chVMat = this.crosshairV.material as THREE.MeshBasicMaterial;
      chHMat.opacity = showCrosshair ? 0.3 + this.activation * 0.7 : 0;
      chVMat.opacity = showCrosshair ? 0.3 + this.activation * 0.7 : 0;
      chHMat.color.set(col);
      chVMat.color.set(col);

      const ringMat = this.ringMesh.material as THREE.MeshBasicMaterial;
      ringMat.color.set(col);
      ringMat.opacity = this.activation > 0.25 ? 0.3 + this.activation * 0.7 : 0;
      this.ringMesh.scale.setScalar(1 + this.activation * 1.0);

      const pulseMat = this.pulseRing.material as THREE.MeshBasicMaterial;
      pulseMat.color.set(col);
      if (this.activation > 0.3) {
        const pulse = Math.sin(this.time * 8) * 0.5 + 0.5;
        pulseMat.opacity = pulse * this.activation * 0.5;
        this.pulseRing.scale.setScalar(1 + pulse * this.activation * 1.5);
      } else {
        pulseMat.opacity = 0;
      }

      const glowMat = this.glowSphere.material as THREE.MeshBasicMaterial;
      glowMat.color.set(col);
      glowMat.opacity = this.activation > 0.15 ? this.activation * 0.5 : 0;
      this.glowSphere.scale.setScalar(1.0 + this.activation * 1.5);

      const innerMat = this.innerGlow.material as THREE.MeshBasicMaterial;
      innerMat.color.set('#FFFFFF');
      innerMat.opacity = this.activation > 0.4 ? (this.activation - 0.4) * 0.8 : 0;
      this.innerGlow.scale.setScalar(0.8 + this.activation * 0.6);

      const tmMat = this.targetMarker.material as THREE.MeshBasicMaterial;
      tmMat.opacity = 0;
    }
  }

  getActivation(): number {
    return this.activation;
  }
}
