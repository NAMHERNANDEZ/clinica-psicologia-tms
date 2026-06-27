import * as THREE from 'three';
import { BrainScene } from './BrainScene';
import { ConnectomeEngine } from '../simulation/ConnectomeEngine';
import type { ProtocolConfig, ProtocolPhase } from '../simulation/ProtocolStateMachine';

interface WorkerStateUpdate {
  type: 'STATE_UPDATE';
  activations: Record<string, number>;
  protocol: {
    phase: ProtocolPhase;
    coilIntensity: number;
    pulseCount: number;
    totalElapsed: number;
  };
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
  private angle = 0.4;
  private targetAngle = 0.4;
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

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.disposed = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#080C12');

    this.camera = new THREE.PerspectiveCamera(
      35,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 1.8, 7.5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const ambientLight = new THREE.AmbientLight(0xB8C4D0, 0.65);
    const keyLight = new THREE.DirectionalLight(0xE8EFF6, 0.55);
    keyLight.position.set(4, 8, 5);
    const fillLight = new THREE.DirectionalLight(0x8898A8, 0.2);
    fillLight.position.set(-3, 2, -4);
    const rimLight = new THREE.DirectionalLight(0x6878A0, 0.12);
    rimLight.position.set(0, -2, -5);

    this.scene.add(ambientLight, keyLight, fillLight, rimLight);

    this.brainScene = new BrainScene(this.scene);
    this.brainScene.init();
    this.connectome = new ConnectomeEngine();

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: true });

    this.initWorker();
    window.addEventListener('resize', this.onResize);
  }

  private initWorker() {
    const workerUrl = new URL('../simulation/brain.worker.ts', import.meta.url);
    this.worker = new Worker(workerUrl, { type: 'module' });

    this.worker.onmessage = (e: MessageEvent<WorkerStateUpdate>) => {
      if (e.data.type === 'STATE_UPDATE' && !this.disposed) {
        this.applyWorkerState(e.data);
      }
    };

    this.worker.onerror = (err) => {
      console.error('[BrainWorker]', err.message);
    };

    const regionDefs = this.brainScene.getRegionDefs();
    this.worker.postMessage({
      type: 'INIT',
      regions: regionDefs.map(r => r.id),
      connectomeData: this.connectome.matrix,
    });
  }

  private getRegionMeshes(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = [];
    for (const def of this.brainScene.getRegionDefs()) {
      const region = this.brainScene.getRegion(def.id);
      if (region) {
        meshes.push(region.hitbox);
        meshes.push(region.mesh);
      }
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
      const regionId = (hits[0].object as any).userData?.regionId;
      if (regionId) this.onRegionClick?.(regionId);
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.dragMoved && this.isDragging) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this.getRegionMeshes(), false);
      if (hits.length > 0) {
        const regionId = (hits[0].object as any).userData?.regionId;
        if (regionId) this.onRegionClick?.(regionId);
      }
    }
    this.isDragging = false;
  };

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
    const zoomSpeed = 0.002;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const distance = this.camera.position.length();
    const newDistance = Math.max(4, Math.min(14, distance + e.deltaY * zoomSpeed * distance));
    this.camera.position.normalize().multiplyScalar(newDistance);
    this.camera.lookAt(0, 0, 0);
  };

  private applyWorkerState(data: WorkerStateUpdate) {
    const { activations, protocol, connectome } = data;

    this.currentActivations = new Map(Object.entries(activations));
    this.currentPulseCount = protocol.pulseCount;
    this.currentCoilIntensity = protocol.coilIntensity;

    for (const [regionId, value] of Object.entries(activations)) {
      this.brainScene.setActivation(regionId, value);
    }

    const coil = this.brainScene.getCoilField();
    if (protocol.coilIntensity > 0.01 && protocol.phase !== 'idle' && protocol.phase !== 'complete') {
      const target = this.brainScene.getRegionPosition(protocol.targetRegion || 'dlpfc_l')
        || this.brainScene.getRegionPosition('dlpfc_l');
      if (target) {
        coil.activate({
          position: [target.x * 0.4, target.y * 0.4 + 2.0, target.z + 2.2],
          targetPosition: [target.x, target.y, target.z],
          intensity: protocol.coilIntensity,
        });
      }
    } else {
      coil.deactivate();
    }

    if (this.currentProtocolPhase !== protocol.phase) {
      this.currentProtocolPhase = protocol.phase;
      this.onProtocolPhaseChange?.(protocol.phase);
    }

    if (connectome.length > 0) {
      this.connectome.matrix = connectome;
    }

    this.onOverlayUpdate?.({
      phase: protocol.phase,
      activations: this.currentActivations,
      coilIntensity: protocol.coilIntensity,
      pulseCount: protocol.pulseCount,
      connectome: this.connectome.matrix,
    });
  }

  start() {
    this.clock.start();
    this.worker.postMessage({ type: 'START_TICK', intervalMs: 16 });

    const loop = () => {
      if (this.disposed) return;
      this.animationId = requestAnimationFrame(loop);
      const delta = this.clock.getDelta();

      this.angle += (this.targetAngle - this.angle) * 0.08;
      this.camera.position.x = Math.sin(this.angle) * 7.5;
      this.camera.position.z = Math.cos(this.angle) * 7.5;
      this.camera.position.y = 1.8 + Math.sin(this.angle * 0.3) * 0.15;
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
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = undefined;
    }
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
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  setRegionActivation(regionId: string, value: number) {
    const idx = this.connectome.getIndex(regionId);
    if (idx >= 0) {
      this.worker.postMessage({ type: 'SET_ACTIVATION', regionIdx: idx, value });
    }
  }

  async runProtocol(config: { targetRegion: string; protocol: { name?: string; frequency_hz: number; intensity_pct_mt: number; duration_sec: number; total_pulses: number }; mtPct: number }) {
    this.worker.postMessage({ type: 'STOP_PROTOCOL' });
    this.brainScene.getCoilField().deactivate();

    this.worker.postMessage({
      type: 'START_PROTOCOL',
      config: {
        targetRegion: config.targetRegion,
        frequencyHz: config.protocol.frequency_hz,
        intensityPctMt: config.protocol.intensity_pct_mt,
        durationSec: config.protocol.duration_sec,
        totalPulses: config.protocol.total_pulses,
        mtPct: config.mtPct,
      },
    });
  }

  stopProtocol() {
    this.worker.postMessage({ type: 'STOP_PROTOCOL' });
    this.brainScene.getCoilField().deactivate();
  }

  onPhaseChange(cb: (phase: ProtocolPhase) => void) {
    this.onProtocolPhaseChange = cb;
  }

  onOverlay(cb: (state: OverlayState) => void) {
    this.onOverlayUpdate = cb;
  }

  onRegionSelected(cb: (regionId: string) => void) {
    this.onRegionClick = cb;
  }

  getConnectome(): ConnectomeEngine {
    return this.connectome;
  }

  getBrainScene(): BrainScene {
    return this.brainScene;
  }

  getCurrentPhase(): ProtocolPhase {
    return this.currentProtocolPhase;
  }
}
