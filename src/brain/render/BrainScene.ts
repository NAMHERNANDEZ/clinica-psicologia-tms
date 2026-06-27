import * as THREE from 'three';
import { RegionMesh } from './RegionMesh';
import { VolumetricCoil } from './VolumetricCoil';
import { ConnectionLines } from './ConnectionLines';

interface RegionDef {
  id: string;
  name: string;
  dir: [number, number, number];
  radius: number;
  connections: string[];
}

const REGIONS: RegionDef[] = [
  { id: 'dlpfc_l', name: 'DLPFC-L', dir: [-0.55, 0.65, 0.50], radius: 0.10, connections: ['acc', 'insula_l', 'm1_l'] },
  { id: 'dlpfc_r', name: 'DLPFC-R', dir: [0.55, 0.65, 0.50], radius: 0.10, connections: ['acc', 'insula_r', 'm1_r'] },
  { id: 'm1_l', name: 'M1-L', dir: [-0.68, 0.12, 0.30], radius: 0.09, connections: ['dlpfc_l', 'sma'] },
  { id: 'm1_r', name: 'M1-R', dir: [0.68, 0.12, 0.30], radius: 0.09, connections: ['dlpfc_r', 'sma'] },
  { id: 'sma', name: 'SMA', dir: [0.0, 0.62, 0.12], radius: 0.08, connections: ['m1_l', 'm1_r', 'acc'] },
  { id: 'acc', name: 'ACC', dir: [0.0, 0.42, -0.05], radius: 0.08, connections: ['dlpfc_l', 'dlpfc_r', 'insula_l', 'insula_r'] },
  { id: 'insula_l', name: 'INS-L', dir: [-0.42, 0.02, 0.58], radius: 0.08, connections: ['acc', 'dlpfc_l'] },
  { id: 'insula_r', name: 'INS-R', dir: [0.42, 0.02, 0.58], radius: 0.08, connections: ['acc', 'dlpfc_r'] },
  { id: 'broca', name: 'BRC', dir: [-0.48, -0.35, 0.62], radius: 0.08, connections: ['wernicke'] },
  { id: 'wernicke', name: 'WRN', dir: [0.48, -0.35, 0.62], radius: 0.08, connections: ['broca'] },
];

function hash3(x: number, y: number, z: number): number {
  let n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise3d(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);
  const uz = fz * fz * (3.0 - 2.0 * fz);
  const n000 = hash3(ix, iy, iz);
  const n100 = hash3(ix + 1, iy, iz);
  const n010 = hash3(ix, iy + 1, iz);
  const n110 = hash3(ix + 1, iy + 1, iz);
  const n001 = hash3(ix, iy, iz + 1);
  const n101 = hash3(ix + 1, iy, iz + 1);
  const n011 = hash3(ix, iy + 1, iz + 1);
  const n111 = hash3(ix + 1, iy + 1, iz + 1);
  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;
  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;
  return nxy0 + (nxy1 - nxy0) * uz;
}

function fbm(x: number, y: number, z: number, octaves: number = 5): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * (smoothNoise3d(x * frequency, y * frequency, z * frequency) * 2.0 - 1.0);
    amplitude *= 0.5;
    frequency *= 2.1;
  }
  return value;
}

export class BrainScene {
  private scene: THREE.Scene;
  private regions: Map<string, RegionMesh> = new Map();
  private regionDefs: RegionDef[] = REGIONS;
  private coilField: VolumetricCoil;
  private connectionLines: ConnectionLines;
  private brainGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.coilField = new VolumetricCoil();
    this.connectionLines = new ConnectionLines();
    this.brainGroup = new THREE.Group();
  }

  init() {
    this.createBrain();
    this.scene.add(this.brainGroup);
    this.createRegions();
    this.createConnectionLines();
    this.coilField.init();
    this.scene.add(this.coilField.object3D);
  }

  private createBrain() {
    for (const side of [-1, 1]) {
      const geo = new THREE.SphereGeometry(1.5, 200, 200);
      const pos = geo.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        if (side === -1) {
          x = Math.min(x, 0.04);
        } else {
          x = Math.max(x, -0.04);
        }

        z *= 1.55;
        y *= 0.78;

        const frontalLobe = Math.exp(-Math.pow((z - 2.3) * 0.9, 2)) * 0.28;
        const occipitalLobe = Math.exp(-Math.pow((z + 2.2) * 1.1, 2)) * 0.12;
        const temporalLobe = Math.exp(-Math.pow((y + 0.5) * 1.2, 2)) *
          Math.exp(-Math.pow(Math.abs(z - 0.3) * 0.6, 2)) * 0.35;
        const temporalPole = Math.exp(-Math.pow((y + 1.1) * 1.5, 2)) *
          Math.exp(-Math.pow((z - 1.2) * 1.0, 2)) * 0.20;
        const parietalBoss = Math.exp(-Math.pow((y - 1.0) * 1.5, 2)) *
          Math.exp(-Math.pow((z + 0.4) * 1.0, 2)) * 0.10;
        const orbitalFlare = Math.exp(-Math.pow((y + 0.3) * 1.8, 2)) *
          Math.exp(-Math.pow((z - 1.8) * 1.2, 2)) * 0.15;

        const bulge = 1 + frontalLobe + occipitalLobe + temporalLobe + temporalPole + parietalBoss + orbitalFlare;
        x *= bulge;
        y *= bulge;
        z *= bulge;

        const r = Math.sqrt(x * x + y * y + z * z);
        const nx = x / (r || 1);
        const ny = y / (r || 1);
        const nz = z / (r || 1);

        const theta = Math.atan2(x, z);
        const phi = Math.acos(Math.max(-1, Math.min(1, y / (r || 1))));

        const wrinkle = fbm(x * 5.0 + side * 100, y * 5.0, z * 5.0, 6) * 0.30;

        const csAngle = theta - 0.15 * side;
        const csPole = phi - 1.05;
        const csDist = Math.sqrt(csAngle * csAngle * 55 + csPole * csPole * 30);
        const centralSulcus = Math.exp(-csDist * csDist) * 0.40;

        const pcAngle = theta - 0.06 * side;
        const pcPole = phi - 0.95;
        const precentralDist = Math.sqrt(pcAngle * pcAngle * 50 + pcPole * pcPole * 28);
        const precentralSulcus = Math.exp(-precentralDist * precentralDist) * 0.35;

        const postcAngle = theta - 0.28 * side;
        const postcPole = phi - 1.12;
        const postcentralDist = Math.sqrt(postcAngle * postcAngle * 48 + postcPole * postcPole * 26);
        const postcentralSulcus = Math.exp(-postcentralDist * postcentralDist) * 0.32;

        const lfPole = phi - 1.52;
        const lfAngle = Math.abs(theta);
        const lateralFissure = Math.exp(-(lfPole * lfPole * 35 + lfAngle * lfAngle * 20)) * 0.38;

        const stsPole = phi - 1.38;
        const stsAngle = theta + 0.10 * side;
        const superiorTemporal = Math.exp(-(stsPole * stsPole * 30 + stsAngle * stsAngle * 25)) * 0.28;

        const itsAngle = theta + 0.06 * side;
        const itsPole = phi - 1.28;
        const inferTemporal = Math.exp(-(itsPole * itsPole * 26 + itsAngle * itsAngle * 22)) * 0.22;

        const cingAngle = theta;
        const cingPole = phi - 0.62;
        const cingulate = Math.exp(-(cingPole * cingPole * 32 + cingAngle * cingAngle * 18)) * 0.18;

        const occAngle = theta - 0.05 * side;
        const occPole = phi - 0.85;
        const occipitalSulcus = Math.exp(-(occPole * occPole * 25 + occAngle * occAngle * 20)) * 0.15;

        const calAngle = theta;
        const calPole = phi - 0.40;
        const calcarine = Math.exp(-(calPole * calPole * 30 + calAngle * calAngle * 15)) * 0.14;

        const fissureDepth = Math.exp(-Math.pow(Math.abs(x) * 6, 2)) * 0.40;

        const totalDisp = wrinkle + centralSulcus + precentralSulcus + postcentralSulcus +
          lateralFissure + superiorTemporal + inferTemporal + cingulate + occipitalSulcus + calcarine - fissureDepth;

        x += nx * totalDisp;
        y += ny * totalDisp * 0.80;
        z += nz * totalDisp;

        pos.setXYZ(i, x, y, z);
      }

      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#9AA5B2'),
        roughness: 0.82,
        metalness: 0.02,
      });

      const mesh = new THREE.Mesh(geo, mat);
      this.brainGroup.add(mesh);
    }

    this.brainGroup.rotation.x = 0.1;
    this.brainGroup.rotation.z = 0.02;
  }

  private createRegions() {
    this.regionDefs.forEach(def => {
      const dir = new THREE.Vector3(...def.dir).normalize();
      const surfacePos = dir.clone().multiplyScalar(1.55);
      const region = new RegionMesh(def.id, [surfacePos.x, surfacePos.y, surfacePos.z], def.radius);
      region.meshes.forEach(m => this.scene.add(m));
      this.regions.set(def.id, region);
    });
  }

  private createConnectionLines() {
    const created = new Set<string>();
    for (const region of this.regionDefs) {
      for (const connId of region.connections) {
        const key = [region.id, connId].sort().join('-');
        if (created.has(key)) continue;
        created.add(key);
        const fromRegion = this.regions.get(region.id);
        const toRegion = this.regions.get(connId);
        if (!fromRegion || !toRegion) continue;
        this.connectionLines.addConnection(
          this.scene,
          fromRegion.mesh.position.clone(),
          toRegion.mesh.position.clone(),
          region.id,
          connId,
          0.3,
        );
      }
    }
  }

  update(delta: number) {
    this.regions.forEach(region => region.update(delta));
  }

  updateConnections(delta: number, activations: Map<string, number>, connectome: number[][]) {
    this.connectionLines.update(delta, activations, connectome, this.regionDefs.map(r => r.id));
  }

  setActivation(id: string, value: number) {
    const region = this.regions.get(id);
    if (region) region.setActivation(value);
  }

  setActivations(activations: Map<string, number>) {
    activations.forEach((value, id) => {
      const region = this.regions.get(id);
      if (region) region.setActivation(value);
    });
  }

  getRegion(id: string): RegionMesh | undefined {
    return this.regions.get(id);
  }

  getAllActivations(): Map<string, number> {
    const result = new Map<string, number>();
    this.regions.forEach((region, id) => result.set(id, region.getActivation()));
    return result;
  }

  getRegionDefs(): RegionDef[] {
    return this.regionDefs;
  }

  getCoilField(): VolumetricCoil {
    return this.coilField;
  }

  getRegionPosition(id: string): THREE.Vector3 | undefined {
    const region = this.regions.get(id);
    return region ? region.mesh.position.clone() : undefined;
  }

  getRegionConnectionIds(id: string): string[] {
    const def = this.regionDefs.find(r => r.id === id);
    return def?.connections || [];
  }

  dispose(): void {
    this.connectionLines.dispose(this.scene);
  }
}
