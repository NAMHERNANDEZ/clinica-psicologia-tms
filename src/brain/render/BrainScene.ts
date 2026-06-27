import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
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

export class BrainScene {
  private scene: THREE.Scene;
  private regions: Map<string, RegionMesh> = new Map();
  private regionDefs: RegionDef[] = REGIONS;
  private coilField: VolumetricCoil;
  private connectionLines: ConnectionLines;
  private brainGroup: THREE.Group;
  private brainMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.coilField = new VolumetricCoil();
    this.connectionLines = new ConnectionLines();
    this.brainGroup = new THREE.Group();
  }

  async init() {
    await this.createBrain();
    this.scene.add(this.brainGroup);
    this.createRegions();
    this.createConnectionLines();
    this.coilField.init();
    this.scene.add(this.coilField.object3D);
  }

  private async createBrain() {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/libs/draco/');

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(
          '/models/brain.glb',
          (gltf) => resolve(gltf),
          undefined,
          (err) => reject(err)
        );
      });

      gltf.scene.traverse((child: any) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#9AA5B2'),
            roughness: 0.82,
            metalness: 0.02,
          });
          child.castShadow = true;
          child.receiveShadow = true;
          this.brainMeshes.push(child);
        }
      });

      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 3.0 / maxDim;
      gltf.scene.scale.setScalar(scale);
      gltf.scene.position.sub(center.multiplyScalar(scale));

      this.brainGroup.add(gltf.scene);

    } catch (err) {
      console.error('[BrainScene] Failed to load brain.glb, using fallback:', err);
      this.createFallbackBrain();
    }

    dracoLoader.dispose();
  }

  private createFallbackBrain() {
    const geo = new THREE.SphereGeometry(1.0, 200, 200);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const origX = x;
      const origY = y;
      const origZ = z;

      x *= 1.35;
      y *= 0.50;
      z *= 1.55;

      const along = origZ;
      const frontalTaper = Math.max(0.4, 1.0 - Math.max(0, (along - 0.5)) * 0.5);
      const occipitalTaper = Math.max(0.35, 1.0 - Math.max(0, (-along - 0.4)) * 0.6);
      const taper = frontalTaper * occipitalTaper;

      const temporalBulgeX = Math.exp(-Math.pow((origY + 0.4) * 3.0, 2)) *
        Math.exp(-Math.pow(Math.abs(along) * 1.0, 2)) * 0.55;
      const parietalWide = Math.exp(-Math.pow((origY - 0.6) * 2.5, 2)) *
        Math.exp(-Math.pow(Math.abs(along + 0.1) * 1.2, 2)) * 0.20;

      const baseX = taper * (1 + temporalBulgeX + parietalWide);
      x *= baseX;

      const topFlatten = 1.0 - Math.max(0, origY - 0.3) * 0.6;
      const bottomFlatten = 1.0 - Math.max(0, -origY - 0.3) * 0.3;
      y *= topFlatten * bottomFlatten;
      z *= taper;

      const fissurePush = Math.exp(-Math.pow(Math.abs(origX) * 3.5, 2)) * 0.18;
      x += origX > 0 ? fissurePush : -fissurePush;

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
    this.brainMeshes.push(mesh);
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

  getBrainMeshes(): THREE.Mesh[] {
    return this.brainMeshes;
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
