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
    this.createProceduralBrain();
  }

  private createProceduralBrain() {
    const brainCanvas = document.createElement('canvas');
    brainCanvas.width = 1024;
    brainCanvas.height = 1024;
    const ctx = brainCanvas.getContext('2d')!;

    ctx.fillStyle = '#8A95A5';
    ctx.fillRect(0, 0, 1024, 1024);

    const drawSulcus = (x1: number, y1: number, x2: number, y2: number, depth: number) => {
      const steps = 20;
      for (let s = 0; s < steps; s++) {
        const t = s / steps;
        const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 4;
        const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 4;
        const radius = depth * (1 - Math.abs(t - 0.5) * 2) * 0.5 + 1;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100,110,120,${0.3 + Math.random() * 0.2})`;
        ctx.fill();
      }
    };

    for (let i = 0; i < 60; i++) {
      const cx = 512 + (Math.random() - 0.5) * 800;
      const cy = 512 + (Math.random() - 0.5) * 800;
      const angle = Math.random() * Math.PI * 2;
      const len = 20 + Math.random() * 60;
      drawSulcus(cx, cy, cx + Math.cos(angle) * len, cy + Math.sin(angle) * len, 3 + Math.random() * 4);
    }

    for (let i = 0; i < 15; i++) {
      const y = 100 + Math.random() * 824;
      const x1 = 520 + Math.random() * 10;
      const x2 = x1 + 80 + Math.random() * 200;
      drawSulcus(x1, y, x2, y + (Math.random() - 0.5) * 40, 2 + Math.random() * 3);
    }

    ctx.beginPath();
    ctx.moveTo(512, 50);
    for (let y = 50; y < 974; y += 3) {
      ctx.lineTo(512 + Math.sin(y * 0.02) * 4 + (Math.random() - 0.5) * 2, y);
    }
    ctx.strokeStyle = 'rgba(70,80,90,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      ctx.beginPath();
      ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(140,150,160,${0.1 + Math.random() * 0.15})`;
      ctx.fill();
    }

    const brainTexture = new THREE.CanvasTexture(brainCanvas);
    brainTexture.wrapS = THREE.RepeatWrapping;
    brainTexture.wrapT = THREE.RepeatWrapping;

    const hemisphereGeo = (side: number) => {
      const geo = new THREE.SphereGeometry(1.0, 200, 200);
      const pos = geo.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        const origX = x;
        const origY = y;
        const origZ = z;

        x *= side * 0.65;
        y *= 0.48;
        z *= 1.50;

        const frontalNarrow = 1.0 - Math.max(0, origZ - 0.4) * 0.4;
        const occipitalNarrow = 1.0 - Math.max(0, -origZ - 0.5) * 0.5;
        const zTaper = frontalNarrow * occipitalNarrow;

        x *= zTaper;

        const temporalBulge = Math.exp(-Math.pow((origY + 0.5) * 2.5, 2)) *
          Math.exp(-Math.pow(Math.abs(origZ) * 0.8, 2)) * 0.45;
        x += side * temporalBulge;

        const topFlatten = 1.0 - Math.max(0, origY - 0.2) * 0.5;
        y *= topFlatten;

        const frontalLobe = Math.exp(-Math.pow((origZ - 0.6) * 2.0, 2)) *
          Math.exp(-Math.pow(origY * 1.5, 2)) * 0.12;
        z += frontalLobe;

        const occipitalLobe = Math.exp(-Math.pow((origZ + 0.6) * 2.5, 2)) *
          Math.exp(-Math.pow(origY * 1.5, 2)) * 0.10;
        z -= occipitalLobe;

        const centralSulcus = Math.exp(-Math.pow((origZ - 0.05) * 4.0, 2)) *
          Math.exp(-Math.pow((origY - 0.3) * 3.0, 2)) * 0.08;
        y -= centralSulcus;

        const lateralSulcus = Math.exp(-Math.pow((origY + 0.1) * 3.5, 2)) *
          Math.exp(-Math.pow((origZ + 0.1) * 2.0, 2)) * 0.06;
        y += lateralSulcus;

        const sulciDetail1 = Math.sin(origZ * 12 + origY * 5) * 0.012;
        const sulciDetail2 = Math.sin(origX * 10 + origZ * 7) * 0.008;
        const sulciDetail3 = Math.cos(origY * 14 + origX * 4) * 0.006;
        const sulciDepth = sulciDetail1 + sulciDetail2 + sulciDetail3;
        const nLen = Math.sqrt(x * x + y * y + z * z) || 1;
        x += (x / nLen) * sulciDepth;
        y += (y / nLen) * sulciDepth;
        z += (z / nLen) * sulciDepth;

        pos.setXYZ(i, x, y, z);
      }

      geo.computeVertexNormals();
      return geo;
    };

    const leftGeo = hemisphereGeo(-1);
    const rightGeo = hemisphereGeo(1);

    const mat = new THREE.MeshStandardMaterial({
      map: brainTexture,
      roughness: 0.88,
      metalness: 0.01,
      side: THREE.FrontSide,
    });

    const leftMesh = new THREE.Mesh(leftGeo, mat.clone());
    const rightMesh = new THREE.Mesh(rightGeo, mat.clone());

    this.brainGroup.add(leftMesh);
    this.brainGroup.add(rightMesh);
    this.brainMeshes.push(leftMesh, rightMesh);

    const cerebellumGeo = new THREE.SphereGeometry(0.45, 80, 80);
    const cPos = cerebellumGeo.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      let x = cPos.getX(i);
      let y = cPos.getY(i);
      let z = cPos.getZ(i);

      y *= 0.55;
      z *= 0.7;
      x *= 0.9;

      const folia = Math.sin(z * 20 + x * 8) * 0.015 + Math.sin(y * 15 + z * 10) * 0.01;
      const nLen = Math.sqrt(x * x + y * y + z * z) || 1;
      x += (x / nLen) * folia;
      y += (y / nLen) * folia;
      z += (z / nLen) * folia;

      cPos.setXYZ(i, x, y, z);
    }
    cerebellumGeo.computeVertexNormals();

    const cerebellum = new THREE.Mesh(cerebellumGeo, mat.clone());
    cerebellum.position.set(0, -0.35, -1.15);
    this.brainGroup.add(cerebellum);
    this.brainMeshes.push(cerebellum);

    const brainstemGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.8, 32);
    const brainstem = new THREE.Mesh(brainstemGeo, mat.clone());
    brainstem.position.set(0, -0.55, -1.35);
    brainstem.rotation.x = 0.3;
    this.brainGroup.add(brainstem);
    this.brainMeshes.push(brainstem);

    const box = new THREE.Box3().setFromObject(this.brainGroup);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3.0 / maxDim;
    this.brainGroup.scale.setScalar(scale);
    this.brainGroup.position.sub(center.multiplyScalar(scale));

    const scaledBox = new THREE.Box3().setFromObject(this.brainGroup);
    const scaledSize = scaledBox.getSize(new THREE.Vector3());
    this.brainSurfaceRadius = Math.max(scaledSize.x, scaledSize.y, scaledSize.z) / 2.0;

    this.meshCount = this.brainMeshes.length;
    this.loadStatus = 'glb_ok';
    this.loadDetail = `${this.meshCount} partes (2 hemisferios + cerebelo + tronco), r=${this.brainSurfaceRadius.toFixed(2)}`;
    console.log(`[BrainScene] Procedural brain created: ${this.meshCount} parts, radius=${this.brainSurfaceRadius.toFixed(2)}`);
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
