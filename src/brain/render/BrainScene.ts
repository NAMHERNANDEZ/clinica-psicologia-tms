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

const HIDE_PATTERNS = [
  'artery', 'sinus', 'vein', 'plexus', 'nerve', 'fasciculus', 'radiation',
  'tract', 'peduncle', 'commissure', 'fornix', 'stria', 'optic',
  'ventricle', 'nucleus', 'ganglion', 'chiasm', 'aqueduct',
];

function shouldHide(name: string): boolean {
  const lower = name.toLowerCase();
  return HIDE_PATTERNS.some(p => lower.includes(p));
}

function pickColor(name: string): string {
  const n = name.toLowerCase();

  if (n.includes('cerebellum') || n.includes('tonsil') || n.includes('flocculus') ||
      n.includes('uvula') || n.includes('tuber') || n.includes('pyramis') ||
      n.includes('nodule') || n.includes('lingula') || n.includes('folium') ||
      n.includes('declive') || n.includes('culmen') || n.includes('lobule') ||
      n.includes('quadrangular') || n.includes('biventral') || n.includes('semilunar')) {
    return '#5A8A6A';
  }

  if (n.includes('pons') || n.includes('medulla') || n.includes('olive') || n.includes('pyramid')) {
    return '#7A8A7A';
  }

  if (n.includes('midbrain') || n.includes('colliculus')) {
    return '#8A7A7A';
  }

  if (n.includes('corpus callosum') || n.includes('septum')) {
    return '#E0D8D0';
  }

  if (n.includes('hippocampus') || n.includes('amygdala')) {
    return '#C8A880';
  }

  if (n.includes('thalamus') || n.includes('hypothalamus') || n.includes('mamillary') ||
      n.includes('habenula') || n.includes('pineal') || n.includes('adenohypophysis') ||
      n.includes('neurohypophysis')) {
    return '#B89878';
  }

  if (n.includes('globus') || n.includes('putamen') || n.includes('caudate') ||
      n.includes('subthalamic') || n.includes('nigra') || n.includes('accumbens') ||
      n.includes('pulvinar')) {
    return '#C0A090';
  }

  if (n.includes('basolateral') || n.includes('central nucleus') || n.includes('corticomedial')) {
    return '#B89878';
  }

  if (n.includes('falx') || n.includes('tentorium')) {
    return '#5A6A7A';
  }

  if (n.includes('choroid')) {
    return '#A07060';
  }

  if (n.includes('white matter')) {
    return '#D8D0C8';
  }

  if (n.includes('sulcus') || n.includes('fissure') || n.includes('lat_fis')) {
    return '#5A6A7A';
  }

  if (n.includes('frontal') || n.includes('orbital') || n.includes('straight gyrus') || n.includes('olfactory')) {
    if (n.includes('.l')) return '#C8A090';
    return '#B89888';
  }

  if (n.includes('precentral') || n.includes('postcentral') || n.includes('central sulcus')) {
    return '#C0A0A0';
  }

  if (n.includes('parietal') || n.includes('angular') || n.includes('supramarginal') || n.includes('precuneus')) {
    return '#A0A8B8';
  }

  if (n.includes('temporal')) {
    if (n.includes('.l')) return '#B8A090';
    return '#A89888';
  }

  if (n.includes('occipital') || n.includes('cuneus') || n.includes('lingual')) {
    return '#98A0B0';
  }

  if (n.includes('cingulate')) {
    return '#C0B0A0';
  }

  if (n.includes('insula')) {
    return '#B09888';
  }

  if (n.includes('pole')) {
    return '#B0A098';
  }

  return '#9AA0A8';
}

export type BrainLoadStatus = 'loading' | 'glb_ok' | 'error';

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
  private allMeshNames: string[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.coilField = new VolumetricCoil();
    this.connectionLines = new ConnectionLines();
    this.brainGroup = new THREE.Group();
  }

  async init() {
    await this.loadBrain();
    this.scene.add(this.brainGroup);
    this.createRegions();
    this.createConnectionLines();
    this.coilField.init();
    this.scene.add(this.coilField.object3D);
    console.log(`[BrainScene] ${this.loadStatus} | ${this.loadDetail}`);
  }

  private async loadBrain() {
    try {
      const loader = new GLTFLoader();
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load('/models/brain_nodraco.glb', resolve, undefined, reject);
      });

      let visibleCount = 0;
      let hiddenCount = 0;
      const meshNames: string[] = [];

      gltf.scene.traverse((child: any) => {
        if (!child.isMesh) return;
        const name = child.name || 'unnamed';
        meshNames.push(name);

        if (shouldHide(name)) {
          child.visible = false;
          hiddenCount++;
          return;
        }

        const color = pickColor(name);
        child.material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color),
          roughness: 0.6,
          metalness: 0.02,
          side: THREE.DoubleSide,
        });
        child.castShadow = true;
        child.receiveShadow = true;
        this.brainMeshes.push(child);
        visibleCount++;
      });

      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 3.0 / maxDim;
      gltf.scene.scale.setScalar(scale);
      gltf.scene.position.sub(center.multiplyScalar(scale));

      const scaledBox = new THREE.Box3().setFromObject(gltf.scene);
      const scaledSize = scaledBox.getSize(new THREE.Vector3());
      this.brainSurfaceRadius = Math.max(scaledSize.x, scaledSize.y, scaledSize.z) / 2.0;

      this.allMeshNames = meshNames;
      this.brainGroup.add(gltf.scene);

      this.loadStatus = 'glb_ok';
      this.loadDetail = `${visibleCount} visible, ${hiddenCount} hidden, r=${this.brainSurfaceRadius.toFixed(2)}`;
    } catch (err) {
      console.error('[BrainScene] GLB FAILED:', err);
      this.loadStatus = 'error';
      this.loadDetail = String(err);
    }
  }

  private createRegions() {
    this.regionDefs.forEach(def => {
      const dir = new THREE.Vector3(...def.dir).normalize();
      const pos = dir.clone().multiplyScalar(this.brainSurfaceRadius + 0.08);
      const region = new RegionMesh(def.id, [pos.x, pos.y, pos.z], def.radius);
      region.meshes.forEach(m => this.scene.add(m));
      this.regions.set(def.id, region);
    });
  }

  private createConnectionLines() {
    const done = new Set<string>();
    for (const r of this.regionDefs) {
      for (const c of r.connections) {
        const key = [r.id, c].sort().join('-');
        if (done.has(key)) continue;
        done.add(key);
        const from = this.regions.get(r.id);
        const to = this.regions.get(c);
        if (from && to) {
          this.connectionLines.addConnection(this.scene, from.mesh.position.clone(), to.mesh.position.clone(), r.id, c, 0.3);
        }
      }
    }
  }

  update(delta: number) { this.regions.forEach(r => r.update(delta)); }
  updateConnections(delta: number, activations: Map<string, number>, connectome: number[][]) {
    this.connectionLines.update(delta, activations, connectome, this.regionDefs.map(r => r.id));
  }
  setActivation(id: string, value: number) { this.regions.get(id)?.setActivation(value); }
  getRegion(id: string) { return this.regions.get(id); }
  getRegionDefs() { return this.regionDefs; }
  getCoilField() { return this.coilField; }
  getRegionPosition(id: string) { return this.regions.get(id)?.mesh.position.clone(); }
  getLoadStatus() { return this.loadStatus; }
  getLoadDetail() { return this.loadDetail; }
  getAllMeshNames() { return this.allMeshNames; }
  getBrainMeshCount() { return this.brainMeshes.length; }
  dispose() { this.connectionLines.dispose(this.scene); }
}
