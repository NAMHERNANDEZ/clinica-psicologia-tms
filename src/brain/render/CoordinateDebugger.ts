import * as THREE from 'three';

export class CoordinateDebugger {
  private scene: THREE.Scene;
  private markers: THREE.Mesh[] = [];
  private gridHelper: THREE.GridHelper | null = null;
  private axesHelper: THREE.AxesHelper | null = null;
  private active = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  enable() {
    if (this.active) return;
    this.active = true;

    this.gridHelper = new THREE.GridHelper(4, 20, 0x06b6d4, 0x334155);
    this.gridHelper.position.y = -1;
    (this.gridHelper.material as THREE.Material).opacity = 0.3;
    (this.gridHelper.material as THREE.Material).transparent = true;
    this.scene.add(this.gridHelper);

    this.axesHelper = new THREE.AxesHelper(2);
    this.scene.add(this.axesHelper);

    const testPositions: [number, number, number][] = [
      [-0.62, 0.69, 0.60],  // DLPFC L
      [0.57, 0.65, 0.72],   // DLPFC R
      [0.02, 0.74, 0.18],   // ACC
      [0.02, 0.85, -0.32],  // SMA
      [-0.65, 0.35, -0.10], // M1 L
      [0.60, 0.35, -0.10],  // M1 R
      [-0.47, -0.36, 0.64], // BROCA
      [-0.55, -0.25, -0.45],// WERNICKE
      [-0.32, 0.00, 0.29],  // INSULA L
      [0.30, 0.05, 0.28],   // INSULA R
      [0.0, -0.30, -0.70],  // OCCIPITAL
      [-0.55, -0.30, 0.10], // TEMPORAL L
    ];

    const labels = [
      'DLPFC_L', 'DLPFC_R', 'ACC', 'SMA',
      'M1_L', 'M1_R', 'BROCA', 'WERNICKE',
      'INSULA_L', 'INSULA_R'
    ];

    testPositions.forEach((pos, i) => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 16, 16),
        new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          transparent: true,
          opacity: 0.8
        })
      );
      sphere.position.set(...pos);
      (sphere as any).userData = { label: labels[i], index: i };
      this.scene.add(sphere);
      this.markers.push(sphere);
    });

    console.log('%c[BrainDebugger] ACTIVADO', 'color: #00ff00; font-weight: bold');
    console.log('Haz click en el cerebro para ver coordenadas');
    console.log('10 esferas verdes = posiciones actuales');
  }

  moveMarker(index: number, newPosition: [number, number, number]) {
    if (this.markers[index]) {
      this.markers[index].position.set(...newPosition);
      console.log(`%c[BrainDebugger] Marker ${index} (${(this.markers[index] as any).userData.label}) -> [${newPosition.join(', ')}]`, 'color: #22d3ee');
    }
  }

  handleClick(event: MouseEvent, camera: THREE.Camera, renderer: THREE.WebGLRenderer, brainModel: THREE.Object3D) {
    if (!this.active) return;

    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(brainModel, true);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      console.log('%c━━━ CLICK EN CEREBRO ━━━', 'color: #fbbf24; font-weight: bold');
      console.log(`  X: ${point.x.toFixed(3)}`);
      console.log(`  Y: ${point.y.toFixed(3)}`);
      console.log(`  Z: ${point.z.toFixed(3)}`);
      console.log(`  Copia: [${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)}]`);

      const tempMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      tempMarker.position.copy(point);
      this.scene.add(tempMarker);

      setTimeout(() => {
        this.scene.remove(tempMarker);
        tempMarker.geometry.dispose();
        (tempMarker.material as THREE.Material).dispose();
      }, 5000);
    }
  }

  disable() {
    if (!this.active) return;
    this.active = false;

    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper = null;
    }
    if (this.axesHelper) {
      this.scene.remove(this.axesHelper);
      this.axesHelper = null;
    }
    this.markers.forEach(m => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.markers = [];

    console.log('%c[BrainDebugger] DESACTIVADO', 'color: #ef4444; font-weight: bold');
  }

  isActive(): boolean {
    return this.active;
  }
}
