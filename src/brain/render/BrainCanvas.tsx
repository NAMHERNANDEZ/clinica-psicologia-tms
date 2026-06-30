import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { BrainRenderer, type OverlayState } from './BrainRenderer';
import type { ProtocolPhase } from '../simulation/ProtocolStateMachine';

export interface BrainCanvasHandle {
  getRenderer: () => BrainRenderer | null;
  runProtocol: (config: { targetRegion: string; protocol: { name?: string; frequency_hz: number; intensity_pct_mt: number; duration_sec: number; total_pulses: number }; mtPct: number }) => Promise<void>;
  stopProtocol: () => void;
  onPhaseChange: (cb: (phase: ProtocolPhase) => void) => void;
  onOverlay: (cb: (state: OverlayState) => void) => void;
  onRegionSelected: (cb: (regionId: string) => void) => void;
}

export const BrainCanvas = forwardRef<BrainCanvasHandle>(function BrainCanvas(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BrainRenderer | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getRenderer: () => engineRef.current,
    runProtocol: (config) => engineRef.current?.runProtocol(config) ?? Promise.resolve(),
    stopProtocol: () => engineRef.current?.stopProtocol(),
    onPhaseChange: (cb) => engineRef.current?.onPhaseChange(cb),
    onOverlay: (cb) => engineRef.current?.onOverlay(cb),
    onRegionSelected: (cb) => engineRef.current?.onRegionSelected(cb),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    const renderer = new BrainRenderer();
    renderer.init(canvas).then(() => {
      if (disposed) { renderer.stop(); return; }
      renderer.start();
      engineRef.current = renderer;
    }).catch((err) => {
      console.error('[BrainCanvas] Init failed:', err);
      if (!disposed) setInitError(String(err?.message || err));
    });
    return () => {
      disposed = true;
      renderer.stop();
      engineRef.current = null;
    };
  }, []);

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="text-red-400 text-sm mb-2">Error al inicializar el visor 3D</div>
        <div className="text-slate-500 text-xs max-w-xs">{initError}</div>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
});
