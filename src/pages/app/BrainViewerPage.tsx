import BrainViewer from '../../visual-engine/modules/brain/BrainViewer';

export default function BrainViewerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Brain Viewer — Visualización Neural</h1>
        <p className="text-sm text-slate-500">Actividad cerebral simulada en tiempo real</p>
      </div>
      <BrainViewer patientId={0} />
    </div>
  );
}
