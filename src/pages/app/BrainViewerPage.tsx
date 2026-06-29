import BrainViewer from '../../visual-engine/modules/brain/BrainViewer';

export default function BrainViewerPage() {
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">Brain Viewer</h1>
        <p className="text-sm text-slate-400 mb-6">Actividad cerebral simulada en tiempo real</p>
        <BrainViewer patientId={0} />
      </div>
    </div>
  );
}
