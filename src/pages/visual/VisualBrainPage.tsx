import { useParams } from 'react-router-dom';
import BrainViewer from '../../visual-engine/modules/brain/BrainViewer';
import ClinicalTimeline from '../../visual-engine/modules/timeline/ClinicalTimeline';
import DigitalTwinChart from '../../visual-engine/modules/twin/DigitalTwinChart';

export default function VisualBrainPage() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Brain Viewer — Visualización Neural</h1>
        <p className="text-sm text-slate-500">Actividad cerebral simulada en tiempo real</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BrainViewer patientId={patientId} />
        <ClinicalTimeline patientId={patientId} />
      </div>
      <DigitalTwinChart patientId={patientId} />
    </div>
  );
}
