import { useParams } from 'react-router-dom';
import DigitalTwinChart from '../../visual-engine/modules/twin/DigitalTwinChart';

export default function VisualTwinPage() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Digital Twin — Gemelo Digital</h1>
        <p className="text-sm text-slate-500">Predicción y evolución clínica visual</p>
      </div>
      <DigitalTwinChart patientId={patientId} />
    </div>
  );
}
