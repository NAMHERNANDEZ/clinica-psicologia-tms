import * as THREE from 'three';
import type { RegionMesh } from './RegionMesh';

interface RegionInfo {
  label: string;
  functionColor: string;
  baArea: string;
  lobe: string;
  function: string;
  conditions: string[];
}

const REGION_INFO: Record<string, RegionInfo> = {
  dlpfc_l: { label: 'DLPFC', functionColor: '#06b6d4', baArea: 'BA 9/46', lobe: 'Frontal', function: 'Funciones ejecutivas · Memoria de trabajo · Planificación', conditions: ['Depresión', 'Tabaquismo', 'Esquizofrenia'] },
  dlpfc_r: { label: 'DLPFC', functionColor: '#14b8a6', baArea: 'BA 9/46', lobe: 'Frontal', function: 'Atención · Regulación emocional · Control inhibitorio', conditions: ['Ansiedad', 'TEPT', 'Insomnio'] },
  m1_l: { label: 'M1', functionColor: '#ef4444', baArea: 'BA 4', lobe: 'Frontal', function: 'Control motor lado derecho · Tacto · Propiocepción', conditions: ['Dolor crónico', 'Fibromialgia', 'Dolor neuropático'] },
  m1_r: { label: 'M1', functionColor: '#f97316', baArea: 'BA 4', lobe: 'Frontal', function: 'Control motor lado izquierdo · Tacto · Propiocepción', conditions: ['Hemiplejia', 'Espasticidad'] },
  sma: { label: 'SMA', functionColor: '#818cf8', baArea: 'BA 6', lobe: 'Frontal Medial', function: 'Planificación motora · Secuencias complejas', conditions: ['Parkinson', 'Distonía', 'Tourette'] },
  acc: { label: 'ACC', functionColor: '#8b5cf6', baArea: 'BA 24/32', lobe: 'Límbico', function: 'Monitoreo de conflicto · Regulación emocional', conditions: ['TOC', 'Dolor neuropático', 'Depresión resistente'] },
  insula_l: { label: 'Ínsula', functionColor: '#a855f7', baArea: 'BA 13/14', lobe: 'Ínsula', function: 'Interocepción · Procesamiento del dolor · Empatía', conditions: ['Adicciones', 'Dolor visceral', 'Ansiedad'] },
  insula_r: { label: 'Ínsula', functionColor: '#ec4899', baArea: 'BA 13/14', lobe: 'Ínsula', function: 'Conciencia corporal · Procesamiento emocional', conditions: ['Fibromialgia', 'Migraña', 'Dolor crónico'] },
  broca: { label: 'Broca', functionColor: '#22c55e', baArea: 'BA 44/45', lobe: 'Frontal', function: 'Producción del lenguaje · Articulación', conditions: ['Afasia de Broca', 'Disartria'] },
  temporal: { label: 'Temporal', functionColor: '#c084fc', baArea: 'BA 41/42', lobe: 'Temporal', function: 'Procesamiento auditivo · Memoria semántica', conditions: ['Tinnitus', 'Epilepsia temporal', 'Alzheimer'] },
};

export const CONDITION_TO_REGION: Record<string, string> = {
  'Depresión Mayor': 'dlpfc_l',
  'Ansiedad Generalizada': 'dlpfc_r',
  'TOC': 'acc',
  'Dolor Crónico': 'm1_l',
  'Afasia de Broca': 'broca',
  'TEPT': 'dlpfc_l',
  'Tabaquismo': 'dlpfc_l',
  'Tinnitus': 'temporal',
  'Fibromialgia': 'm1_l',
  'Dolor Neuropático': 'm1_l',
  'Esquizofrenia': 'dlpfc_l',
  'Insomnio': 'dlpfc_r',
  'Parkinson': 'sma',
  'Distonía': 'sma',
  'Adicciones': 'insula_l',
};

interface MarkerObjects {
  group: THREE.Group;
  halo: THREE.Mesh;
  particles: THREE.Points;
  labelCompact: THREE.Sprite;
  labelExpanded: THREE.Sprite;
  activeLabel: THREE.Sprite;
  line: THREE.Line;
}

export class TMSRegionMarkers {
  private markers: Map<string, MarkerObjects> = new Map();
  private hemisphereSprites: THREE.Sprite[] = [];
  private scene: THREE.Scene;
  private regionMeshes: Map<string, RegionMesh>;
  private activationLevels: Map<string, number> = new Map();
  private selectedRegion: string | null = null;
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
    this.createHemisphereLabels();
  }

  private createHemisphereLabels() {
    const labels = [
      { text: '◄ HEMISFERIO IZQUIERDO', color: '#3b82f6', pos: [-1.3, 1.6, 0] as [number, number, number] },
      { text: 'HEMISFERIO DERECHO ►', color: '#f97316', pos: [1.3, 1.6, 0] as [number, number, number] },
    ];

    for (const label of labels) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 800;
      canvas.height = 120;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.shadowColor = label.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = label.color;
      ctx.font = 'bold 56px "IBM Plex Mono", "SF Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label.text, 400, 60);
      ctx.restore();

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        sizeAttenuation: true,
        opacity: 0.7,
      }));
      sprite.position.set(...label.pos);
      sprite.scale.set(1.8, 0.27, 1);
      this.scene.add(sprite);
      this.hemisphereSprites.push(sprite);
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

    const labelCompact = this.createCompactLabel(info.label, info.baArea, info.lobe, info.functionColor, info.conditions);
    labelCompact.position.set(0, 0.35, 0);
    group.add(labelCompact);

    const labelExpanded = this.createExpandedLabel(info.label, info.baArea, info.lobe, info.conditions, info.functionColor);
    labelExpanded.position.set(0, 0.35, 0);
    labelExpanded.visible = false;
    group.add(labelExpanded);

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(0, 0.18, 0)]),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 })
    );
    group.add(line);

    this.scene.add(group);
    this.markers.set(id, { group, halo, particles, labelCompact, labelExpanded, activeLabel: labelCompact, line });
  }

  private createCompactLabel(text: string, baArea: string, lobe: string, color: string, conditions: string[]): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 900;
    canvas.height = 500;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(40, 130, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = `${color}20`;
    ctx.beginPath();
    ctx.arc(40, 130, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 76px "IBM Plex Mono", "SF Mono", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), 68, 100);
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
    ctx.font = '600 32px "IBM Plex Mono", "SF Mono", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${baArea}  ·  ${lobe}`, 68, 160);

    if (conditions && conditions.length > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(68, 195);
      ctx.lineTo(700, 195);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.50)';
      ctx.font = '500 24px "IBM Plex Mono", "SF Mono", Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('INDICACIONES:', 68, 225);

      const condText = conditions.join('  ·  ');
      ctx.fillStyle = `${color}CC`;
      ctx.font = '600 26px "IBM Plex Mono", "SF Mono", Consolas, monospace';
      ctx.fillText(condText, 68, 270);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, sizeAttenuation: true }));
    sprite.scale.set(1.0, 0.56, 1);
    return sprite;
  }

  private createExpandedLabel(text: string, baArea: string, lobe: string, conditions: string[], color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 1200;
    canvas.height = 740;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(45, 100, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = `${color}20`;
    ctx.beginPath();
    ctx.arc(45, 100, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 82px "IBM Plex Mono", "SF Mono", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), 75, 95);
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '500 34px "IBM Plex Mono", "SF Mono", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${baArea}  ·  ${lobe}`, 75, 160);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.20)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(75, 200);
    ctx.lineTo(700, 200);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
    ctx.font = 'bold 28px "IBM Plex Mono", "SF Mono", Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('INDICACIONES', 75, 250);

    conditions.forEach((condition, i) => {
      const y = 320 + i * 72;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.roundRect(70, y - 20, 1060, 52, 10);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.80)';
      ctx.beginPath();
      ctx.arc(95, y + 6, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = '600 42px "IBM Plex Mono", "SF Mono", Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(condition, 120, y + 6);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, sizeAttenuation: true }));
    sprite.scale.set(1.3, 0.81, 1);
    return sprite;
  }

  update(delta: number) {
    this.time += delta;

    for (const [id, marker] of this.markers) {
      const activation = this.activationLevels.get(id) || 0;
      const info = REGION_INFO[id];
      if (!info) continue;

      const isSelected = this.selectedRegion === id;
      const isExpanded = isSelected || activation > 0.3;

      if (isExpanded && marker.activeLabel !== marker.labelExpanded) {
        marker.labelCompact.visible = false;
        marker.labelExpanded.visible = true;
        marker.activeLabel = marker.labelExpanded;
      } else if (!isExpanded && marker.activeLabel !== marker.labelCompact) {
        marker.labelExpanded.visible = false;
        marker.labelCompact.visible = true;
        marker.activeLabel = marker.labelCompact;
      }

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

  setSelected(regionId: string | null) {
    this.selectedRegion = regionId;
  }

  getActivations(): Map<string, number> {
    return this.activationLevels;
  }

  getPosition(regionId: string): THREE.Vector3 | null {
    return this.markers.get(regionId)?.group.position.clone() || null;
  }

  dispose() {
    for (const sprite of this.hemisphereSprites) {
      this.scene.remove(sprite);
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    this.hemisphereSprites = [];
    for (const [, marker] of this.markers) {
      this.scene.remove(marker.group);
      marker.halo.geometry.dispose();
      (marker.halo.material as THREE.Material).dispose();
      marker.particles.geometry.dispose();
      (marker.particles.material as THREE.Material).dispose();
      marker.labelCompact.material.map?.dispose();
      marker.labelCompact.material.dispose();
      marker.labelExpanded.material.map?.dispose();
      marker.labelExpanded.material.dispose();
      marker.line.geometry.dispose();
      (marker.line.material as THREE.Material).dispose();
    }
    this.markers.clear();
    this.activationLevels.clear();
  }
}
