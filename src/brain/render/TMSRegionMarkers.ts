import * as THREE from 'three';
import type { RegionMesh } from './RegionMesh';

interface RegionInfo {
  label: string;
  functionColor: string;
  baArea: string;
  lobe: string;
  function: string;
}

const REGION_INFO: Record<string, RegionInfo> = {
  dlpfc_l: { label: 'DLPFC Izq', functionColor: '#06b6d4', baArea: 'BA 9/46', lobe: 'Frontal', function: 'Regulación emocional · Funciones ejecutivas' },
  dlpfc_r: { label: 'DLPFC Der', functionColor: '#14b8a6', baArea: 'BA 9/46', lobe: 'Frontal', function: 'Control inhibitorio · Ansiedad' },
  m1_l: { label: 'M1 Izq', functionColor: '#ef4444', baArea: 'BA 4', lobe: 'Frontal', function: 'Ejecución motora · Dolor' },
  m1_r: { label: 'M1 Der', functionColor: '#f97316', baArea: 'BA 4', lobe: 'Frontal', function: 'Ejecución motora · Dolor' },
  sma: { label: 'SMA', functionColor: '#818cf8', baArea: 'BA 6', lobe: 'Frontal', function: 'Planificación motora · Secuencias' },
  acc: { label: 'ACC', functionColor: '#8b5cf6', baArea: 'BA 24/32', lobe: 'Límbico', function: 'Monitoreo de conflicto · Dolor' },
  insula_l: { label: 'Ínsula Izq', functionColor: '#a855f7', baArea: 'BA 13/14', lobe: 'Ínsula', function: 'Interocepción · Adicciones' },
  insula_r: { label: 'Ínsula Der', functionColor: '#ec4899', baArea: 'BA 13/14', lobe: 'Ínsula', function: 'Conciencia corporal · Dolor visceral' },
  broca: { label: 'Broca', functionColor: '#22c55e', baArea: 'BA 44/45', lobe: 'Frontal', function: 'Producción del lenguaje' },
  wernicke: { label: 'Wernicke', functionColor: '#3b82f6', baArea: 'BA 22', lobe: 'Temporal', function: 'Comprensión del lenguaje' },
  occipital: { label: 'Occipital', functionColor: '#a3e635', baArea: 'BA 17', lobe: 'Occipital', function: 'Corteza visual primaria · Migraña' },
  temporal_l: { label: 'Temporal Izq', functionColor: '#c084fc', baArea: 'BA 41/42', lobe: 'Temporal', function: 'Procesamiento auditivo · Tinnitus' },
};

export const CONDITION_TO_REGION: Record<string, string> = {
  'Depresión Mayor': 'dlpfc_l',
  'Ansiedad Generalizada': 'dlpfc_r',
  'TOC': 'acc',
  'Dolor Crónico': 'm1_l',
  'Afasia': 'broca',
  'TEPT': 'dlpfc_r',
  'Migraña': 'occipital',
  'Tabaquismo': 'dlpfc_l',
  'Tinnitus': 'temporal_l',
  'Fibromialgia': 'm1_l',
  'Dolor Neuropático': 'm1_l',
  'Esquizofrenia': 'dlpfc_l',
  'Insomnio': 'dlpfc_r',
};

interface MarkerObjects {
  group: THREE.Group;
  halo: THREE.Mesh;
  particles: THREE.Points;
  label: THREE.Sprite;
  line: THREE.Line;
}

export class TMSRegionMarkers {
  private markers: Map<string, MarkerObjects> = new Map();
  private scene: THREE.Scene;
  private regionMeshes: Map<string, RegionMesh>;
  private activationLevels: Map<string, number> = new Map();
  private time = 0;

  constructor(scene: THREE.Scene, regionMeshes: Map<string, RegionMesh>) {
    this.scene = scene;
    this.regionMeshes = regionMeshes;
  }

  createAll() {
    for (const [id, regionMesh] of this.regionMeshes) {
      const info = REGION_INFO[id];
      if (!info) continue;
      this.createMarker(id, regionMesh, info);
      this.activationLevels.set(id, 0);
    }
  }

  private createMarker(id: string, regionMesh: RegionMesh, info: RegionInfo) {
    const pos = regionMesh.mesh.position;
    const color = new THREE.Color(info.functionColor);

    const group = new THREE.Group();
    group.position.copy(pos);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 16),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, side: THREE.BackSide })
    );
    group.add(halo);

    const particleCount = 6;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      particlePositions[i * 3] = Math.cos(angle) * 0.12;
      particlePositions[i * 3 + 1] = 0;
      particlePositions[i * 3 + 2] = Math.sin(angle) * 0.12;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({
      color, size: 0.012, transparent: true, opacity: 0.5, sizeAttenuation: true,
    }));
    group.add(particles);

    const label = this.createLabel(info.label, info.functionColor);
    label.position.set(0, 0.28, 0);
    group.add(label);

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(0, 0.16, 0)]),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 })
    );
    group.add(line);

    this.scene.add(group);
    this.markers.set(id, { group, halo, particles, label, line });
  }

  private createLabel(text: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 640;
    canvas.height = 160;

    const grad = ctx.createLinearGradient(0, 0, 0, 160);
    grad.addColorStop(0, 'rgba(10, 15, 25, 0.95)');
    grad.addColorStop(1, 'rgba(5, 10, 18, 0.98)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(4, 4, 632, 152, 16);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(4, 4, 632, 152, 16);
    ctx.stroke();

    ctx.strokeStyle = `${color}44`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(10, 10, 620, 140, 12);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = '600 38px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), 320, 80);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, sizeAttenuation: true }));
    sprite.scale.set(0.7, 0.18, 1);
    return sprite;
  }

  update(delta: number) {
    this.time += delta;

    for (const [id, marker] of this.markers) {
      const activation = this.activationLevels.get(id) || 0;
      const info = REGION_INFO[id];
      if (!info) continue;

      const phaseOffset = id.charCodeAt(0) * 0.1;
      const basePulse = Math.sin(this.time * 2 + phaseOffset) * 0.04;
      const activationPulse = activation * Math.sin(this.time * 4 + phaseOffset) * 0.12;
      const totalPulse = basePulse + activationPulse;

      const funcColor = new THREE.Color(info.functionColor);

      if (marker.halo.material instanceof THREE.MeshBasicMaterial) {
        marker.halo.material.opacity = 0.08 + activation * 0.35 + Math.sin(this.time * 3 + phaseOffset) * 0.06;
        marker.halo.scale.setScalar(1 + totalPulse + activation * 0.4);
      }

      marker.particles.rotation.y += delta * (0.8 + activation * 3);
      if (marker.particles.material instanceof THREE.PointsMaterial) {
        marker.particles.material.opacity = 0.3 + activation * 0.7;
        marker.particles.material.size = 0.010 + activation * 0.018;
        marker.particles.material.color.copy(funcColor);
      }
      marker.particles.scale.setScalar(1 + activation * 0.6);

      if (marker.line.material instanceof THREE.LineBasicMaterial) {
        marker.line.material.opacity = 0.2 + activation * 0.6;
        marker.line.material.color.copy(funcColor);
      }
    }
  }

  setActivation(regionId: string, value: number) {
    this.activationLevels.set(regionId, Math.max(0, Math.min(1, value)));
  }

  getActivations(): Map<string, number> {
    return this.activationLevels;
  }

  getPosition(regionId: string): THREE.Vector3 | null {
    return this.markers.get(regionId)?.group.position.clone() || null;
  }

  dispose() {
    for (const [, marker] of this.markers) {
      this.scene.remove(marker.group);
      marker.halo.geometry.dispose();
      (marker.halo.material as THREE.Material).dispose();
      marker.particles.geometry.dispose();
      (marker.particles.material as THREE.Material).dispose();
      marker.label.material.map?.dispose();
      marker.label.material.dispose();
      marker.line.geometry.dispose();
      (marker.line.material as THREE.Material).dispose();
    }
    this.markers.clear();
    this.activationLevels.clear();
  }
}
