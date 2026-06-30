import * as THREE from 'three';
import type { ConnectomeEngine } from '../simulation/ConnectomeEngine';
import type { RegionMesh } from './RegionMesh';

const REGION_FUNCTION_COLORS: Record<string, string> = {
  dlpfc_l: '#06b6d4', dlpfc_r: '#14b8a6', m1_l: '#ef4444', m1_r: '#f97316',
  sma: '#818cf8', acc: '#8b5cf6', insula_l: '#a855f7', insula_r: '#ec4899',
  broca: '#22c55e', wernicke: '#3b82f6', occipital: '#a3e635', temporal_l: '#c084fc',
};

interface BurstEffect {
  points: THREE.Points;
  velocities: THREE.Vector3[];
  center: THREE.Vector3;
  startTime: number;
  lifetime: number;
}

interface PropagationLine {
  line: THREE.Line;
  startTime: number;
  lifetime: number;
}

export class NetworkActivationVisualizer {
  private scene: THREE.Scene;
  private connectome: ConnectomeEngine;
  private regionMeshes: Map<string, RegionMesh>;
  private bursts: BurstEffect[] = [];
  private propLines: PropagationLine[] = [];
  private prevActivations: Map<string, number> = new Map();
  private time = 0;

  constructor(scene: THREE.Scene, connectome: ConnectomeEngine, regionMeshes: Map<string, RegionMesh>) {
    this.scene = scene;
    this.connectome = connectome;
    this.regionMeshes = regionMeshes;
  }

  update(activations: Map<string, number>, delta: number) {
    this.time += delta;

    for (const [id, val] of activations) {
      const prev = this.prevActivations.get(id) || 0;
      if (val > 0.3 && val > prev + 0.05) {
        this.createBurst(id, val);
        this.createPropagationLines(id, val);
      }
    }

    this.prevActivations = new Map(activations);

    this.updateBursts(delta);
    this.updatePropagationLines(delta);
  }

  private createBurst(regionId: string, intensity: number) {
    const region = this.regionMeshes.get(regionId);
    if (!region) return;

    const pos = region.mesh.position;
    const colorHex = REGION_FUNCTION_COLORS[regionId] || '#06b6d4';
    const color = new THREE.Color(colorHex);

    const count = 20;
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.2 + Math.random() * 0.4;
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      ));
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color, size: 0.025 * intensity, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.bursts.push({
      points, velocities, center: pos.clone(),
      startTime: this.time, lifetime: 1.2,
    });
  }

  private createPropagationLines(regionId: string, intensity: number) {
    const fromRegion = this.regionMeshes.get(regionId);
    if (!fromRegion) return;

    const fromPos = fromRegion.mesh.position;
    const fromColor = new THREE.Color(REGION_FUNCTION_COLORS[regionId] || '#06b6d4');

    const fromIdx = this.connectome.getIndex(regionId);
    if (fromIdx < 0) return;

    for (const [toId, toRegion] of this.regionMeshes) {
      if (toId === regionId) continue;
      const toIdx = this.connectome.getIndex(toId);
      if (toIdx < 0) continue;

      const weight = this.connectome.matrix[fromIdx]?.[toIdx] || 0;
      if (weight < 0.2) continue;

      const toPos = toRegion.mesh.position;
      const toColor = new THREE.Color(REGION_FUNCTION_COLORS[toId] || '#06b6d4');
      const lineColor = new THREE.Color().lerpColors(fromColor, toColor, 0.5);

      const dist = fromPos.distanceTo(toPos);
      const mid = new THREE.Vector3(
        (fromPos.x + toPos.x) / 2,
        (fromPos.y + toPos.y) / 2 + dist * 0.2,
        (fromPos.z + toPos.z) / 2
      );

      const curve = new THREE.QuadraticBezierCurve3(fromPos.clone(), mid, toPos.clone());
      const points = curve.getPoints(30);

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineDashedMaterial({
        color: lineColor, dashSize: 0.04, gapSize: 0.02,
        transparent: true, opacity: 0.6 * weight * intensity,
        blending: THREE.AdditiveBlending,
      });

      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      this.scene.add(line);

      this.propLines.push({ line, startTime: this.time, lifetime: 1.8 });
    }
  }

  private updateBursts(delta: number) {
    const toRemove: number[] = [];

    for (let i = 0; i < this.bursts.length; i++) {
      const burst = this.bursts[i];
      const elapsed = this.time - burst.startTime;
      const progress = elapsed / burst.lifetime;

      if (progress >= 1) {
        toRemove.push(i);
        continue;
      }

      const positions = burst.points.geometry.attributes.position.array as Float32Array;
      for (let j = 0; j < burst.velocities.length; j++) {
        positions[j * 3] = burst.center.x + burst.velocities[j].x * elapsed;
        positions[j * 3 + 1] = burst.center.y + burst.velocities[j].y * elapsed;
        positions[j * 3 + 2] = burst.center.z + burst.velocities[j].z * elapsed;
      }
      burst.points.geometry.attributes.position.needsUpdate = true;

      if (burst.points.material instanceof THREE.PointsMaterial) {
        burst.points.material.opacity = (1 - progress) * 0.85;
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const burst = this.bursts[idx];
      this.scene.remove(burst.points);
      burst.points.geometry.dispose();
      (burst.points.material as THREE.Material).dispose();
      this.bursts.splice(idx, 1);
    }
  }

  private updatePropagationLines(delta: number) {
    const toRemove: number[] = [];

    for (let i = 0; i < this.propLines.length; i++) {
      const pl = this.propLines[i];
      const elapsed = this.time - pl.startTime;
      const progress = elapsed / pl.lifetime;

      if (progress >= 1) {
        toRemove.push(i);
        continue;
      }

      if (pl.line.material instanceof THREE.LineDashedMaterial) {
        pl.line.material.dashOffset -= delta * 0.3;
        pl.line.material.opacity = (1 - progress) * 0.6;
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const pl = this.propLines[idx];
      this.scene.remove(pl.line);
      pl.line.geometry.dispose();
      (pl.line.material as THREE.Material).dispose();
      this.propLines.splice(idx, 1);
    }
  }

  dispose() {
    for (const burst of this.bursts) {
      this.scene.remove(burst.points);
      burst.points.geometry.dispose();
      (burst.points.material as THREE.Material).dispose();
    }
    for (const pl of this.propLines) {
      this.scene.remove(pl.line);
      pl.line.geometry.dispose();
      (pl.line.material as THREE.Material).dispose();
    }
    this.bursts = [];
    this.propLines = [];
    this.prevActivations.clear();
  }
}
