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

export type BrainLoadStatus = 'loading' | 'glb_ok' | 'glb_fallback';

export class BrainScene {
  private scene: THREE.Scene;
  private regions: Map<string, RegionMesh> = new Map();
  private regionDefs: RegionDef[] = REGIONS;
  private coilField: VolumetricCoil;
  private connectionLines: ConnectionLines;
  private brainGroup: THREE.Group;
  private brainMeshes: THREE.Mesh[] = [];
  private brainSurfaceRadius = 1.0;
  private loadStatus: BrainLoadStatus = 'loading';
  private loadDetail = '';
  private meshCount = 0;

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
    console.log(`[BrainScene] Status: ${this.loadStatus} | Meshes: ${this.meshCount} | Surface radius: ${this.brainSurfaceRadius.toFixed(2)}`);
  }

  private async createBrain() {
    let dracoLoader = new DRACOLoader();

    const tryLoad = async (decoderPath: string): Promise<boolean> => {
      try {
        dracoLoader.setDecoderPath(decoderPath);
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);

        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load('/models/brain.glb', (gltf) => resolve(gltf), undefined, (err) => reject(err));
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

        const scaledBox = new THREE.Box3().setFromObject(gltf.scene);
        const scaledSize = scaledBox.getSize(new THREE.Vector3());
        this.brainSurfaceRadius = Math.max(scaledSize.x, scaledSize.y, scaledSize.z) / 2.0;
        this.meshCount = this.brainMeshes.length;
        this.loadStatus = 'glb_ok';
        this.loadDetail = `${this.meshCount} meshes, r=${this.brainSurfaceRadius.toFixed(2)}`;
        return true;
      } catch {
        return false;
      }
    };

    const localOk = await tryLoad('/libs/draco/');
    if (!localOk) {
      console.warn('[BrainScene] Local Draco failed, trying CDN...');
      dracoLoader.dispose();
      dracoLoader = new DRACOLoader();
      const cdnOk = await tryLoad('https://unpkg.com/three@0.185.0/examples/jsm/libs/draco/');
      if (!cdnOk) {
        console.warn('[BrainScene] CDN Draco also failed, using fallback brain');
        this.createFallbackBrain();
      }
    }
    dracoLoader.dispose();
  }

  private createFallbackBrain() {
    const geo = new THREE.SphereGeometry(1.0, 300, 300);
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

      const sulciFreq = 8.0;
      const sulciDepth = 0.025;
      const sulci1 = Math.sin(origZ * sulciFreq + origY * 3.0) * sulciDepth;
      const sulci2 = Math.sin(origX * sulciFreq * 0.7 + origZ * 2.0) * sulciDepth * 0.7;
      const sulci3 = Math.cos(origY * sulciFreq * 1.2 + origX * 1.5) * sulciDepth * 0.5;
      const totalSulci = sulci1 + sulci2 + sulci3;
      const normalFactor = Math.sqrt(x * x + y * y + z * z) || 1;
      x += (x / normalFactor) * totalSulci;
      y += (y / normalFactor) * totalSulci;
      z += (z / normalFactor) * totalSulci;

      pos.setXYZ(i, x, y, z);
    }

    geo.computeVertexNormals();

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#9AA5B2';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 120; i++) {
      const x1 = Math.random() * 512;
      const y1 = Math.random() * 512;
      const angle = Math.random() * Math.PI;
      const len = 30 + Math.random() * 80;
      const x2 = x1 + Math.cos(angle) * len;
      const y2 = y1 + Math.sin(angle) * len;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(120,130,140,${0.15 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.stroke();
    }

    const fissureY = 256;
    ctx.beginPath();
    ctx.moveTo(256, 0);
    for (let y = 0; y < 512; y += 4) {
      const wobble = Math.sin(y * 0.05) * 3;
      ctx.lineTo(256 + wobble, y);
    }
    ctx.strokeStyle = 'rgba(80,90,100,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.02,
    });
    const mesh = new THREE.Mesh(geo, mat);
    this.brainGroup.add(mesh);
    this.brainMeshes.push(mesh);

    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    this.brainSurfaceRadius = Math.max(size.x, size.y, size.z) / 2.0;
    this.meshCount = 1;
    this.loadStatus = 'glb_fallback';
    this.loadDetail = `Fallback brain (sphere deformed), r=${this.brainSurfaceRadius.toFixed(2)}`;
  }

  private createRegions() {
    const surfaceOffset = 0.08;
    this.regionDefs.forEach(def => {
      const dir = new THREE.Vector3(...def.dir).normalize();
      const surfacePos = dir.clone().multiplyScalar(this.brainSurfaceRadius + surfaceOffset);
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

  getLoadStatus(): BrainLoadStatus {
    return this.loadStatus;
  }

  getLoadDetail(): string {
    return this.loadDetail;
  }

  dispose(): void {
    this.connectionLines.dispose(this.scene);
  }
}
