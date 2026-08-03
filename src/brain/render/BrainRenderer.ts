import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BrainScene } from './BrainScene';
import { ConnectomeEngine } from '../simulation/ConnectomeEngine';
import { CoordinateDebugger } from './CoordinateDebugger';
import { NetworkActivationVisualizer } from './NetworkActivationVisualizer';
import type { ProtocolPhase } from '../simulation/ProtocolStateMachine';
import BrainWorker from '../simulation/brain.worker.ts?worker';

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
    this.scene.background = new THREE.Color('#1B2838');

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

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    const key = new THREE.DirectionalLight(0xE0F0FF, 0.5);
    key.position.set(5, 8, 5);
    const fill = new THREE.DirectionalLight(0x80C0FF, 0.3);
    fill.position.set(-5, 3, -3);
    const rim = new THREE.DirectionalLight(0x4080FF, 0.2);
    rim.position.set(0, -3, -5);
    const top = new THREE.DirectionalLight(0xC0D8F0, 0.15);
    top.position.set(0, 10, 0);
    const accent = new THREE.PointLight(0x00AAFF, 0.3, 25);
    accent.position.set(-3, 2, 3);
    const thermal = new THREE.PointLight(0xFF6600, 0.15, 20);
    thermal.position.set(3, -1, 2);
    this.scene.add(key, fill, rim, top, accent, thermal);

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
    const count = 300;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14;
      const t = Math.random();
      if (t < 0.6) {
        colors[i * 3] = 0; colors[i * 3 + 1] = 0.4 + Math.random() * 0.3; colors[i * 3 + 2] = 1;
      } else {
        colors[i * 3] = 1; colors[i * 3 + 1] = 0.3 + Math.random() * 0.3; colors[i * 3 + 2] = 0;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.015,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });
    this.ambientParticles = new THREE.Points(geometry, material);
    this.scene.add(this.ambientParticles);
  }

  private createBrainGlow() {
    const geometry = new THREE.SphereGeometry(2.2, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: '#0044AA',
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.brainGlow = new THREE.Mesh(geometry, material);
    this.scene.add(this.brainGlow);
  }

  private initWorker() {
    try {
      this.worker = new BrainWorker();
      this.worker.onmessage = (e: MessageEvent<WorkerStateUpdate>) => {
        if (e.data.type === 'STATE_UPDATE' && !this.disposed) this.applyWorkerState(e.data);
      };
      this.worker.onerror = (err) => { console.error('[BrainWorker] ERROR:', err.message, err); this.workerReady = false; };
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
      if (id) {
        this.currentTargetRegion = id;
        this.brainScene.setSelectedRegion(id);
        if (this.currentProtocolPhase === 'idle' || this.currentProtocolPhase === 'complete') {
          this.brainScene.setTargetRegion(id);
          const pos = this.brainScene.getRegionPosition(id);
          if (pos) {
            this.brainScene.getCoilField().activate({ position: [pos.x, pos.y + 1.5, pos.z + 1.5], targetPosition: [pos.x, pos.y, pos.z], intensity: 0.5 });
          }
        }
        this.onRegionClick?.(id);
      }
    } else {
      this.brainScene.setSelectedRegion(null);
      if (this.currentProtocolPhase === 'idle' || this.currentProtocolPhase === 'complete') {
        this.brainScene.setTargetRegion(null);
        this.brainScene.getCoilField().deactivate();
      }
    }
  }

  private applyWorkerState(data: WorkerStateUpdate) {
    const { activations, protocol, connectome } = data;
    this.currentActivations = new Map(Object.entries(activations));
    this.currentPulseCount = protocol.pulseCount;
    this.currentCoilIntensity = protocol.coilIntensity;

    if (protocol.phase !== 'idle') {
      const vals = Object.values(activations);
      const max = Math.max(...vals);
      console.log(`[BrainRenderer] phase=${protocol.phase} target=${this.currentTargetRegion} act=${activations[this.currentTargetRegion]?.toFixed(3)} max=${max.toFixed(3)} coil=${protocol.coilIntensity.toFixed(2)}`);
    }

    const isActive = protocol.phase !== 'idle' && protocol.phase !== 'complete';

    const coil = this.brainScene.getCoilField();
    if (isActive && protocol.coilIntensity > 0) {
      const target = this.brainScene.getRegionPosition(this.currentTargetRegion);
      if (target) {
        coil.activate({ position: [target.x, target.y + 1.5, target.z + 1.5], targetPosition: [target.x, target.y, target.z], intensity: protocol.coilIntensity });
      }

      for (const [id, value] of Object.entries(activations)) {
        if (id === this.currentTargetRegion) {
          this.brainScene.setActivation(id, Math.max(0.7, protocol.coilIntensity));
        } else {
          this.brainScene.setActivation(id, Math.min(1, value * 1.5));
        }
      }
    } else {
      coil.deactivate();
      for (const [id] of Object.entries(activations)) {
        this.brainScene.setActivation(id, 0);
      }
    }

    this.networkViz?.update(this.currentActivations, 0.016);
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
      this.brainScene.update(delta, this.currentActivations);
      this.brainScene.updateConnections(delta, this.currentActivations, this.connectome.matrix);
      this.brainScene.getCoilField().update(delta);
      if (this.ambientParticles) {
        this.ambientParticles.rotation.y += delta * 0.03;
        this.ambientParticles.rotation.x += delta * 0.015;
        const mat = this.ambientParticles.material as THREE.PointsMaterial;
        mat.opacity = 0.2 + Math.sin(elapsed * 0.8) * 0.1;
      }
      if (this.brainGlow) {
        const mat = this.brainGlow.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.04 + Math.sin(elapsed * 0.5) * 0.015;
        mat.color.set('#0044AA');
        this.brainGlow.scale.setScalar(1.0 + Math.sin(elapsed * 0.3) * 0.03);
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
    console.log('[BrainRenderer] runProtocol called, workerReady:', this.workerReady, 'disposed:', this.disposed);
    if (!this.workerReady) return;
    this.currentTargetRegion = config.targetRegion;
    this.worker.postMessage({ type: 'STOP_PROTOCOL' });
    this.brainScene.setTargetRegion(config.targetRegion);
    this.worker.postMessage({ type: 'START_PROTOCOL', config: { targetRegion: config.targetRegion, frequencyHz: config.protocol.frequency_hz, intensityPctMt: config.protocol.intensity_pct_mt, durationSec: config.protocol.duration_sec, totalPulses: config.protocol.total_pulses, mtPct: config.mtPct } });
    console.log('[BrainRenderer] START_PROTOCOL sent to worker, target:', config.targetRegion);
  }

  stopProtocol() {
    if (!this.workerReady) return;
    this.worker.postMessage({ type: 'STOP_PROTOCOL' });
    this.brainScene.getCoilField().deactivate();
    this.brainScene.setTargetRegion(null);
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
