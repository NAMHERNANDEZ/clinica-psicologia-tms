import * as THREE from 'three';
import { BrainScene } from './BrainScene';
import { ConnectomeEngine } from '../simulation/ConnectomeEngine';
import type { ProtocolPhase } from '../simulation/ProtocolStateMachine';

interface WorkerStateUpdate {
  type: 'STATE_UPDATE';
  activations: Record<string, number>;
  protocol: { phase: ProtocolPhase; coilIntensity: number; pulseCount: number; totalElapsed: number };
  connectome: number[][];
}

export interface OverlayState {
  phase: ProtocolPhase;
  activations: Map<string, number>;
  coilIntensity: number;
  pulseCount: number;
  connectome: number[][];
}

export class BrainRenderer {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private clock = new THREE.Clock();
  private brainScene!: BrainScene;
  private connectome!: ConnectomeEngine;
  private animationId?: number;
  private canvas!: HTMLCanvasElement;
  private angle = 0;
  private targetAngle = 0;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isDragging = false;
  private lastMouseX = 0;
  private dragStartX = 0;
  private dragMoved = false;
  private worker!: Worker;
  private onProtocolPhaseChange?: (phase: ProtocolPhase) => void;
  private onOverlayUpdate?: (state: OverlayState) => void;
  private onRegionClick?: (regionId: string) => void;
  private currentProtocolPhase: ProtocolPhase = 'idle';
  private currentActivations: Map<string, number> = new Map();
  private currentPulseCount = 0;
  private currentCoilIntensity = 0;
  private disposed = false;

  async init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.disposed = false;

    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    console.log('[BrainRenderer] Canvas size:', w, 'x', h);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0A0E14');

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 6, 6);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const amb = new THREE.AmbientLight(0xFFFFFF, 1.5);
    this.scene.add(amb);
    const key = new THREE.DirectionalLight(0xFFFFFF, 1.2);
    key.position.set(5, 8, 5);
    const fill = new THREE.DirectionalLight(0xFFFFFF, 0.6);
    fill.position.set(-5, 4, -3);
    const back = new THREE.DirectionalLight(0xFFFFFF, 0.4);
    back.position.set(0, 2, -6);
    this.scene.add(key, fill, back);

    const grid = new THREE.GridHelper(10, 20, 0x1A2A3A, 0x0D1520);
    grid.position.y = -2;
    this.scene.add(grid);

    this.brainScene = new BrainScene(this.scene);
    await this.brainScene.init();
    this.connectome = new ConnectomeEngine();

    console.log('[BrainRenderer] Brain meshes:', this.brainScene.getBrainMeshCount());
    console.log('[BrainRenderer] Mesh names:', this.brainScene.getAllMeshNames().join(' | '));

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: true });
    this.initWorker();
    window.addEventListener('resize', this.onResize);
  }

  private initWorker() {
    const url = new URL('../simulation/brain.worker.ts', import.meta.url);
    this.worker = new Worker(url, { type: 'module' });
    this.worker.onmessage = (e: MessageEvent<WorkerStateUpdate>) => {
      if (e.data.type === 'STATE_UPDATE' && !this.disposed) this.applyWorkerState(e.data);
    };
    this.worker.onerror = (err) => console.error('[BrainWorker]', err.message);
    this.worker.postMessage({
      type: 'INIT',
      regions: this.brainScene.getRegionDefs().map(r => r.id),
      connectomeData: this.connectome.matrix,
    });
  }

  private getRegionMeshes(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = [];
    for (const def of this.brainScene.getRegionDefs()) {
      const region = this.brainScene.getRegion(def.id);
      if (region) { meshes.push(region.hitbox); meshes.push(region.mesh); }
    }
    return meshes;
  }

  private onPointerDown = (e: PointerEvent) => {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.dragStartX = e.clientX;
    this.dragMoved = false;
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.getRegionMeshes(), false);
    if (hits.length > 0) {
      const id = (hits[0].object as any).userData?.regionId;
      if (id) this.onRegionClick?.(id);
    }
  };

  private onPointerUp = () => { this.isDragging = false; };

  private onPointerMove = (e: PointerEvent) => {
    if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      this.targetAngle += dx * 0.005;
      this.lastMouseX = e.clientX;
      if (Math.abs(e.clientX - this.dragStartX) > 20) this.dragMoved = true;
      this.canvas.style.cursor = 'grabbing';
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.getRegionMeshes(), false);
    this.canvas.style.cursor = hits.length > 0 ? 'pointer' : 'default';
  };

  private onWheel = (e: WheelEvent) => {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const dist = this.camera.position.length();
    const newDist = Math.max(3, Math.min(15, dist + e.deltaY * 0.003 * dist));
    this.camera.position.normalize().multiplyScalar(newDist);
    this.camera.lookAt(0, 0, 0);
  };

  private applyWorkerState(data: WorkerStateUpdate) {
    const { activations, protocol, connectome } = data;
    this.currentActivations = new Map(Object.entries(activations));
    this.currentPulseCount = protocol.pulseCount;
    this.currentCoilIntensity = protocol.coilIntensity;
    for (const [id, val] of Object.entries(activations)) this.brainScene.setActivation(id, val);
    const coil = this.brainScene.getCoilField();
    if (protocol.coilIntensity > 0.01 && protocol.phase !== 'idle' && protocol.phase !== 'complete') {
      const target = this.brainScene.getRegionPosition(protocol.targetRegion || 'dlpfc_l') || this.brainScene.getRegionPosition('dlpfc_l');
      if (target) coil.activate({ position: [target.x * 0.4, target.y * 0.4 + 2.0, target.z + 2.2], targetPosition: [target.x, target.y, target.z], intensity: protocol.coilIntensity });
    } else { coil.deactivate(); }
    if (this.currentProtocolPhase !== protocol.phase) { this.currentProtocolPhase = protocol.phase; this.onProtocolPhaseChange?.(protocol.phase); }
    if (connectome.length > 0) this.connectome.matrix = connectome;
    this.onOverlayUpdate?.({ phase: protocol.phase, activations: this.currentActivations, coilIntensity: protocol.coilIntensity, pulseCount: protocol.pulseCount, connectome: this.connectome.matrix });
  }

  start() {
    this.clock.start();
    this.worker.postMessage({ type: 'START_TICK', intervalMs: 16 });
    const loop = () => {
      if (this.disposed) return;
      this.animationId = requestAnimationFrame(loop);
      const delta = this.clock.getDelta();
      this.angle += (this.targetAngle - this.angle) * 0.08;
      const dist = this.camera.position.length();
      this.camera.position.x = Math.sin(this.angle) * dist * 0.15;
      this.camera.position.z = Math.cos(this.angle) * dist * 0.15 + dist * 0.85;
      this.camera.position.y = 6;
      this.camera.lookAt(0, 0, 0);
      this.brainScene.update(delta);
      this.brainScene.updateConnections(delta, this.currentActivations, this.connectome.matrix);
      this.brainScene.getCoilField().update(delta);
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop() {
    this.disposed = true;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.worker.postMessage({ type: 'STOP_TICK' });
    this.worker.terminate();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }

  private onResize = () => {
    if (!this.canvas || this.disposed) return;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  setRegionActivation(regionId: string, value: number) {
    const idx = this.connectome.getIndex(regionId);
    if (idx >= 0) this.worker.postMessage({ type: 'SET_ACTIVATION', regionIdx: idx, value });
  }

  async runProtocol(config: { targetRegion: string; protocol: { name?: string; frequency_hz: number; intensity_pct_mt: number; duration_sec: number; total_pulses: number }; mtPct: number }) {
    this.worker.postMessage({ type: 'STOP_PROTOCOL' });
    this.brainScene.getCoilField().deactivate();
    this.worker.postMessage({ type: 'START_PROTOCOL', config: { targetRegion: config.targetRegion, frequencyHz: config.protocol.frequency_hz, intensityPctMt: config.protocol.intensity_pct_mt, durationSec: config.protocol.duration_sec, totalPulses: config.protocol.total_pulses, mtPct: config.mtPct } });
  }

  stopProtocol() { this.worker.postMessage({ type: 'STOP_PROTOCOL' }); this.brainScene.getCoilField().deactivate(); }
  onPhaseChange(cb: (phase: ProtocolPhase) => void) { this.onProtocolPhaseChange = cb; }
  onOverlay(cb: (state: OverlayState) => void) { this.onOverlayUpdate = cb; }
  onRegionSelected(cb: (regionId: string) => void) { this.onRegionClick = cb; }
  getConnectome() { return this.connectome; }
  getBrainScene() { return this.brainScene; }
  getLoadStatus() { return this.brainScene.getLoadStatus(); }
  getLoadDetail() { return this.brainScene.getLoadDetail(); }
  getAllMeshNames() { return this.brainScene.getAllMeshNames(); }
  getCurrentPhase() { return this.currentProtocolPhase; }
}
