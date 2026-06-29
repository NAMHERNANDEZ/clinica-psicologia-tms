import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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

const MATERIAL_COLORS: Record<string, string> = {
  Brain: '#9AA5B2',
  'Brain-Inner': '#B0B8C4',
  'Temporal lobe': '#A0AAB6',
  Cerebellum: '#8892A0',
  Nucleus: '#C0C8D0',
  'White matter': '#D0D8E0',
  Nerve: '#C8A8A0',
  Artery: '#B06060',
  Cartilage: '#A0B0B8',
  LCR: '#8090A8',
  Bone: '#E0D8D0',
};

const HIDE_KEYWORDS = ['Nerve', 'Artery', 'LCR', 'Cartilage', 'Bone', 'fasciculus', 'radiation', 'tract', 'peduncle'];

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
    const loader = new GLTFLoader();

    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load('/models/brain_nodraco.glb', (gltf) => resolve(gltf), undefined, (err) => reject(err));
      });

      let visibleCount = 0;

      gltf.scene.traverse((child: any) => {
        if (!child.isMesh) return;

        const name = (child.name || '').toLowerCase();
        const shouldHide = HIDE_KEYWORDS.some(kw => name.includes(kw.toLowerCase()));

        let color = '#9AA5B2';
        for (const [key, val] of Object.entries(MATERIAL_COLORS)) {
          if (name.includes(key.toLowerCase())) {
            color = val;
            break;
          }
        }

        child.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color),
          roughness: 0.85,
          metalness: 0.01,
          transparent: shouldHide,
          opacity: shouldHide ? 0.0 : 1.0,
          side: THREE.FrontSide,
        });

        if (!shouldHide) {
          child.castShadow = true;
          child.receiveShadow = true;
          this.brainMeshes.push(child);
          visibleCount++;
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

      this.meshCount = visibleCount;
      this.loadStatus = 'glb_ok';
      this.loadDetail = `${visibleCount} meshes anatómicos, r=${this.brainSurfaceRadius.toFixed(2)}`;
      console.log(`[BrainScene] GLB loaded: ${visibleCount} visible meshes, radius=${this.brainSurfaceRadius.toFixed(2)}`);

    } catch (err) {
      console.error('[BrainScene] Failed to load brain_nodraco.glb:', err);
      this.loadStatus = 'glb_fallback';
      this.loadDetail = 'Error loading GLB';
    }
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
