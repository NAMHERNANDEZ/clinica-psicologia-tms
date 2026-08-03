import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RegionMesh } from './RegionMesh';
import { VolumetricCoil } from './VolumetricCoil';
import { ConnectionLines } from './ConnectionLines';
import { ClinicalColors, thermalColor } from './MaterialLibrary';
import { TMSRegionMarkers } from './TMSRegionMarkers';

interface RegionDef {
  id: string;
  name: string;
  dir: [number, number, number];
  radius: number;
  connections: string[];
}

const REGIONS: RegionDef[] = [
  { id: 'dlpfc_l', name: 'DLPFC', dir: [-0.62, 0.69, 0.60], radius: 0.10, connections: ['acc', 'insula_l', 'm1_l'] },
  { id: 'dlpfc_r', name: 'DLPFC', dir: [0.57, 0.65, 0.72], radius: 0.10, connections: ['acc', 'insula_r', 'm1_r'] },
  { id: 'm1_l', name: 'M1', dir: [-0.65, 0.35, -0.10], radius: 0.09, connections: ['dlpfc_l', 'sma'] },
  { id: 'm1_r', name: 'M1', dir: [0.60, 0.35, -0.10], radius: 0.09, connections: ['dlpfc_r', 'sma'] },
  { id: 'sma', name: 'SMA', dir: [0.02, 0.85, -0.32], radius: 0.08, connections: ['m1_l', 'm1_r', 'acc'] },
  { id: 'acc', name: 'ACC', dir: [0.02, 0.74, 0.18], radius: 0.08, connections: ['dlpfc_l', 'dlpfc_r', 'insula_l', 'insula_r'] },
  { id: 'insula_l', name: 'Ínsula', dir: [-0.32, 0.00, 0.03], radius: 0.08, connections: ['acc', 'dlpfc_l'] },
  { id: 'insula_r', name: 'Ínsula', dir: [0.30, 0.05, 0.03], radius: 0.08, connections: ['acc', 'dlpfc_r'] },
  { id: 'broca', name: 'Broca', dir: [-0.47, -0.36, 0.64], radius: 0.08, connections: ['temporal'] },
  { id: 'temporal', name: 'Temporal', dir: [-0.55, -0.30, 0.10], radius: 0.08, connections: ['broca'] },
];

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
  private tmsMarkers: TMSRegionMarkers | null = null;
  private regionWorldPositions: Map<string, THREE.Vector3> = new Map();
  private brainBaseColor = new THREE.Color(ClinicalColors.brainBase);
  private thermalTempColor = new THREE.Color();

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
    this.regionDefs.forEach(def => {
      const pos = this.getRegionPosition(def.id);
      if (pos) this.regionWorldPositions.set(def.id, pos);
    });
    this.createConnectionLines();
    this.coilField.init();
    this.scene.add(this.coilField.object3D);
    this.tmsMarkers = new TMSRegionMarkers(this.scene, this.regions);
    this.tmsMarkers.createAll();
    console.log(`[BrainScene] ${this.loadStatus} | ${this.loadDetail}`);
  }

  private async loadBrain() {
    try {
      const loader = new GLTFLoader();
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load('/models/brain_lowpoly.glb', resolve, undefined, reject);
      });

      const brainMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0xffffff),
        roughness: 0.55,
        metalness: 0.03,
        side: THREE.DoubleSide,
        flatShading: true,
        clearcoat: 0.15,
        clearcoatRoughness: 0.5,
        transparent: true,
        opacity: 0.95,
        vertexColors: true,
      });

      gltf.scene.traverse((child: any) => {
        if (!child.isMesh) return;
        if (child.geometry && !child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals();
        }
        const count = child.geometry.attributes.position.count;
        const vColors = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i += 3) {
          vColors[i] = this.brainBaseColor.r;
          vColors[i + 1] = this.brainBaseColor.g;
          vColors[i + 2] = this.brainBaseColor.b;
        }
        child.geometry.setAttribute('color', new THREE.BufferAttribute(vColors, 3));
        child.material = brainMat;
        child.castShadow = true;
        child.receiveShadow = true;
        this.brainMeshes.push(child);
        this.allMeshNames.push(child.name || 'brain');
      });

      const box = new THREE.Box3().setFromObject(gltf.scene);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 3.0 / maxDim;
      gltf.scene.scale.set(scale, scale, scale);
      gltf.scene.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

      const scaledBox = new THREE.Box3().setFromObject(gltf.scene);
      const scaledSize = scaledBox.getSize(new THREE.Vector3());
      this.brainSurfaceRadius = Math.max(scaledSize.x, scaledSize.y, scaledSize.z) / 2.0;

      this.brainGroup.add(gltf.scene);

      this.loadStatus = 'glb_ok';
      this.loadDetail = `${this.brainMeshes.length} meshes, r=${this.brainSurfaceRadius.toFixed(2)}`;
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

  update(delta: number, activations?: Map<string, number>) {
    this.regions.forEach(r => r.update(delta));
    this.tmsMarkers?.update(delta);
    if (activations && activations.size > 0) {
      this.updateBrainColors(activations);
    }
  }

  private updateBrainColors(activations: Map<string, number>) {
    const _v = new THREE.Vector3();
    const _base = this.brainBaseColor;
    const _thermal = new THREE.Color();

    for (const mesh of this.brainMeshes) {
      const pos = mesh.geometry.attributes.position;
      const col = mesh.geometry.attributes.color;
      if (!col) continue;
      mesh.updateWorldMatrix(true, true);

      for (let i = 0, n = pos.count; i < n; i++) {
        _v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mesh.matrixWorld);
        let peak = 0;
        for (const [id, act] of activations) {
          if (act <= 0.02) continue;
          const rp = this.regionWorldPositions.get(id);
          if (!rp) continue;
          const d2 = (_v.x - rp.x) ** 2 + (_v.y - rp.y) ** 2 + (_v.z - rp.z) ** 2;
          const inf = Math.exp(-d2 * 1.8) * act;
          if (inf > peak) peak = inf;
        }
        if (peak > 0.02) {
          _thermal.set(thermalColor(peak));
          const t = Math.min(peak, 1);
          col.setXYZ(i,
            _base.r + (_thermal.r - _base.r) * t,
            _base.g + (_thermal.g - _base.g) * t,
            _base.b + (_thermal.b - _base.b) * t,
          );
        } else {
          col.setXYZ(i, _base.r, _base.g, _base.b);
        }
      }
      col.needsUpdate = true;
    }
  }
  updateConnections(delta: number, activations: Map<string, number>, connectome: number[][]) {
    this.connectionLines.update(delta, activations, connectome, this.regionDefs.map(r => r.id));
  }
  setTargetRegion(id: string | null) {
    for (const [rid, region] of this.regions) {
      region.setTarget(rid === id);
    }
  }
  setActivation(id: string, value: number) {
    this.regions.get(id)?.setActivation(value);
    this.tmsMarkers?.setActivation(id, value);
  }
  getRegion(id: string) { return this.regions.get(id); }
  getRegions() { return this.regions; }
  getRegionDefs() { return this.regionDefs; }
  getCoilField() { return this.coilField; }
  getTmsMarkers() { return this.tmsMarkers; }
  setSelectedRegion(id: string | null) { this.tmsMarkers?.setSelected(id); }
  getRegionPosition(id: string) { return this.regions.get(id)?.mesh.position.clone(); }
  getLoadStatus() { return this.loadStatus; }
  getLoadDetail() { return this.loadDetail; }
  getAllMeshNames() { return this.allMeshNames; }
  getBrainMeshCount() { return this.brainMeshes.length; }
  getModel() { return this.brainGroup.children[0] || null; }
  dispose() {
    this.tmsMarkers?.dispose();
    this.connectionLines.dispose(this.scene);
    this.regions.forEach(r => {
      r.meshes.forEach(m => {
        this.scene.remove(m);
        m.geometry?.dispose();
        (m.material as THREE.Material)?.dispose();
      });
    });
    this.regions.clear();
    this.brainGroup.traverse((child: any) => {
      if (child.isMesh) {
        child.geometry?.dispose();
        (child.material as THREE.Material)?.dispose();
      }
    });
    this.scene.remove(this.brainGroup);
    this.scene.remove(this.coilField.object3D);
  }
}
