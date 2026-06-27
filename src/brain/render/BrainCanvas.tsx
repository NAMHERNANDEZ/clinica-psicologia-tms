import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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

  useImperativeHandle(ref, () => ({
    getRenderer: () => engineRef.current,
    runProtocol: (config) => engineRef.current?.runProtocol(config) ?? Promise.resolve(),
    stopProtocol: () => engineRef.current?.stopProtocol(),
    onPhaseChange: (cb) => engineRef.current?.onPhaseChange(cb),
    onOverlay: (cb) => engineRef.current?.onOverlay(cb),
    onRegionSelected: (cb) => engineRef.current?.onRegionSelected(cb),
  }));

  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new BrainRenderer();
    renderer.init(canvasRef.current);
    renderer.start();
    engineRef.current = renderer;

    return () => {
      renderer.stop();
      engineRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
});
