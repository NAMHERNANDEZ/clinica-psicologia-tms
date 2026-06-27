import TMSLiveSession from '../../visual-engine/modules/tms/TMSLiveSession';

export default function VisualTMSPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">TMS en Vivo</h1>
        <p className="text-sm text-slate-500">Monitoreo de sesión de estimulación magnética transcraneal</p>
      </div>
      <div className="max-w-2xl mx-auto">
        <TMSLiveSession
          sessionData={{
            intensity_pct: 80,
            frequency_hz: 10,
            pulses_delivered: 1500,
            pulses_total: 3000,
            coil_position: 'DLPFC Izquierdo',
            status: 'in_progress',
            session_number: 12,
          }}
          isLive={true}
        />
      </div>
    </div>
  );
}
