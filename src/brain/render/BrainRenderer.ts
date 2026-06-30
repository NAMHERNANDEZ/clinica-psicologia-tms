import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BrainScene } from './BrainScene';
import { ConnectomeEngine } from '../simulation/ConnectomeEngine';
import { CoordinateDebugger } from './CoordinateDebugger';
import { NetworkActivationVisualizer } from './NetworkActivationVisualizer';
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
  private controls!: OrbitControls;
  private clock = new THREE.Clock();
  private brainScene!: BrainScene;
  private connectome!: ConnectomeEngine;
  private animationId?: number;
  private canvas!: HTMLCanvasElement;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private worker!: Worker;
  private workerReady = false;
  private onProtocolPhaseChange?: (phase: ProtocolPhase) => void;
  private onOverlayUpdate?: (state: OverlayState) => void;
  private onRegionClick?: (regionId: string) => void;
  private currentProtocolPhase: ProtocolPhase = 'idle';
  private currentActivations: Map<string, number> = new Map();
  private currentPulseCount = 0;
  private currentCoilIntensity = 0;
  private disposed = false;
  private currentTargetRegion = 'dlpfc_l';
  private coordDebugger: CoordinateDebugger;
  private networkViz: NetworkActivationVisualizer | null = null;
  private ambientParticles: THREE.Points | null = null;
  private brainGlow: THREE.Mesh | null = null;

  async init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.disposed = false;

    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    console.log('[BrainRenderer] Canvas:', w, 'x', h);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#020617');

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    this.camera.position.set(0, 0, 5);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableRotate = true;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.minAzimuthAngle = -Infinity;
    this.controls.maxAzimuthAngle = Infinity;
    this.controls.enableZoom = true;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    this.controls.enablePan = true;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 1.0;
    this.controls.zoomSpeed = 1.0;

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(5, 8, 5);
    const fill = new THREE.DirectionalLight(0xE8F0FF, 0.35);
    fill.position.set(-5, 3, -3);
    const rim = new THREE.DirectionalLight(0xC0D0FF, 0.25);
    rim.position.set(0, -3, -5);
    const top = new THREE.DirectionalLight(0xE0E8F0, 0.2);
    top.position.set(0, 10, 0);
    const accent = new THREE.PointLight(0x4488CC, 0.25, 20);
    accent.position.set(-3, 2, 3);
    this.scene.add(key, fill, rim, top, accent);

    this.brainScene = new BrainScene(this.scene);
    await this.brainScene.init();
    this.connectome = new ConnectomeEngine();
    this.networkViz = new NetworkActivationVisualizer(this.scene, this.connectome, this.brainScene.getRegions());
    this.createAmbientParticles();
    this.createBrainGlow();

    console.log('[BrainRenderer] Meshes:', this.brainScene.getBrainMeshCount());

    this.coordDebugger = new CoordinateDebugger(this.scene);
    (window as any).__brainDebugger = {
      enable: () => this.coordDebugger.enable(),
      disable: () => this.coordDebugger.disable(),
      moveMarker: (i: number, pos: [number, number, number]) => this.coordDebugger.moveMarker(i, pos),
    };

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerUp);
    this.canvas.addEventListener('click', this.onDebugClick);
    this.initWorker();
    window.addEventListener('resize', this.onResize);
  }

  private createAmbientParticles() {
    const count = 200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x4466AA,
      size: 0.012,
      transparent: true,
      opacity: 0.2,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ambientParticles = new THREE.Points(geometry, material);
    this.scene.add(this.ambientParticles);
  }

  private createBrainGlow() {
    const geometry = new THREE.SphereGeometry(2.0, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0x1A2A3A,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.brainGlow = new THREE.Mesh(geometry, material);
    this.scene.add(this.brainGlow);
  }

  private initWorker() {
    try {
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
      this.workerReady = true;
    } catch (err) {
      console.error('[BrainRenderer] Worker init failed:', err);
      this.workerReady = false;
    }
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
    this.raycast(e);
  };

  private onPointerUp = () => {};

  private onDebugClick = (e: MouseEvent) => {
    if (this.coordDebugger?.isActive()) {
      const model = this.brainScene.getModel();
      if (model) this.coordDebugger.handleClick(e, this.camera, this.renderer, model);
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    this.raycast(e);
  };

  private raycast(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.getRegionMeshes(), false);
    this.canvas.style.cursor = hits.length > 0 ? 'pointer' : 'default';
    if (hits.length > 0) {
      const id = (hits[0].object as any).userData?.regionId;
      if (id) this.onRegionClick?.(id);
    }
  }

  private applyWorkerState(data: WorkerStateUpdate) {
    const { activations, protocol, connectome } = data;
    this.currentActivations = new Map(Object.entries(activations));
    this.currentPulseCount = protocol.pulseCount;
    this.currentCoilIntensity = protocol.coilIntensity;
    for (const [id, val] of Object.entries(activations)) this.brainScene.setActivation(id, val);
    this.networkViz?.update(this.currentActivations, 0.016);
    const coil = this.brainScene.getCoilField();
    if (protocol.coilIntensity > 0.01 && protocol.phase !== 'idle' && protocol.phase !== 'complete') {
      const target = this.brainScene.getRegionPosition(this.currentTargetRegion) || this.brainScene.getRegionPosition('dlpfc_l');
      if (target) {
        coil.activate({ position: [target.x * 0.4, target.y * 0.4 + 2.0, target.z + 2.2], targetPosition: [target.x, target.y, target.z], intensity: protocol.coilIntensity });
        const targetRegion = this.brainScene.getRegion(this.currentTargetRegion);
        if (targetRegion) targetRegion.setActivation(Math.max(0.6, protocol.coilIntensity));
      }
    } else {
      coil.deactivate();
    }
    if (this.currentProtocolPhase !== protocol.phase) { this.currentProtocolPhase = protocol.phase; this.onProtocolPhaseChange?.(protocol.phase); }
    if (connectome.length > 0) this.connectome.matrix = connectome;
    this.onOverlayUpdate?.({ phase: protocol.phase, activations: this.currentActivations, coilIntensity: protocol.coilIntensity, pulseCount: protocol.pulseCount, connectome: this.connectome.matrix });
  }

  start() {
    this.clock.start();
    if (this.workerReady) {
      try { this.worker.postMessage({ type: 'START_TICK', intervalMs: 16 }); } catch {}
    }
    const loop = () => {
      if (this.disposed) return;
      this.animationId = requestAnimationFrame(loop);
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();
      this.controls.update();
      this.brainScene.update(delta);
      this.brainScene.updateConnections(delta, this.currentActivations, this.connectome.matrix);
      this.brainScene.getCoilField().update(delta);
      if (this.ambientParticles) {
        this.ambientParticles.rotation.y += delta * 0.02;
        this.ambientParticles.rotation.x += delta * 0.01;
      }
      if (this.brainGlow) {
        const intensity = this.brainScene.getCoilField().getIntensity();
        const mat = this.brainGlow.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.03 + intensity * 0.08 + Math.sin(elapsed * 0.5) * 0.01;
        this.brainGlow.scale.setScalar(1.0 + Math.sin(elapsed * 0.3) * 0.02);
      }
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop() {
    this.disposed = true;
    this.networkViz?.dispose();
    if (this.ambientParticles) {
      this.scene.remove(this.ambientParticles);
      this.ambientParticles.geometry.dispose();
      (this.ambientParticles.material as THREE.Material).dispose();
      this.ambientParticles = null;
    }
    if (this.brainGlow) {
      this.scene.remove(this.brainGlow);
      this.brainGlow.geometry.dispose();
      (this.brainGlow.material as THREE.Material).dispose();
      this.brainGlow = null;
    }
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.workerReady && this.worker) {
      try { this.worker.postMessage({ type: 'STOP_TICK' }); } catch {}
      try { this.worker.terminate(); } catch {}
    }
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('pointerup', this.onPointerUp);
      this.canvas.removeEventListener('pointerleave', this.onPointerUp);
      this.canvas.removeEventListener('click', this.onDebugClick);
    }
    if (this.coordDebugger) this.coordDebugger.disable();
    window.removeEventListener('resize', this.onResize);
    this.controls?.dispose();
    this.renderer?.dispose();
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
    if (this.disposed || !this.workerReady) return;
    const idx = this.connectome.getIndex(regionId);
    if (idx >= 0) this.worker.postMessage({ type: 'SET_ACTIVATION', regionIdx: idx, value });
  }

  async runProtocol(config: { targetRegion: string; protocol: { name?: string; frequency_hz: number; intensity_pct_mt: number; duration_sec: number; total_pulses: number }; mtPct: number }) {
    if (!this.workerReady) return;
    this.currentTargetRegion = config.targetRegion;
    this.worker.postMessage({ type: 'STOP_PROTOCOL' });
    this.brainScene.getCoilField().deactivate();
    this.worker.postMessage({ type: 'START_PROTOCOL', config: { targetRegion: config.targetRegion, frequencyHz: config.protocol.frequency_hz, intensityPctMt: config.protocol.intensity_pct_mt, durationSec: config.protocol.duration_sec, totalPulses: config.protocol.total_pulses, mtPct: config.mtPct } });
  }

  stopProtocol() {
    if (!this.workerReady) return;
    this.worker.postMessage({ type: 'STOP_PROTOCOL' });
    this.brainScene.getCoilField().deactivate();
  }

  startTMSSession(regionId: string, intensity: number, frequency: number) {
    this.runProtocol({
      targetRegion: regionId,
      protocol: { frequency_hz: frequency, intensity_pct_mt: intensity, duration_sec: 30, total_pulses: 3000 },
      mtPct: intensity,
    });
  }

  stopTMSSession() {
    this.stopProtocol();
  }
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
