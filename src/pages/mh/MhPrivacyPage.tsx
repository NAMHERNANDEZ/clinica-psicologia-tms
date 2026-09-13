import { useEffect, useState, useCallback } from 'react';
import { mh, type MhConsent } from '../../lib/api';

const CONSENT_LABELS: Record<string, string> = {
  bienestar: 'Guardar mis registros de bienestar',
  analisis_patrones: 'Detectar patrones e insights en mi historial',
  compartir_profesional: 'Compartir resumen con un profesional (solo bajo mi consentimiento explícito)',
};

export default function MhPrivacyPage() {
  const [consents, setConsents] = useState<MhConsent[]>([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await mh.consents();
      setConsents(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar consentimientos');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (type: string, granted: boolean) => {
    try {
      const res = await mh.setConsent(type, granted);
      setConsents(prev => {
        const existing = prev.find(c => c.consent_type === type);
        if (existing) {
          return prev.map(c => c.consent_type === type ? { ...c, granted: res.data.granted ? 1 : 0 } : c);
        }
        return [...prev, { id: res.data.id, consent_type: type, granted: res.data.granted ? 1 : 0, granted_at: new Date().toISOString(), revoked_at: null }];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
    }
  };

  const grantState = (type: string) => consents.find(c => c.consent_type === type)?.granted === 1;

  const exportData = async () => {
    setExporting(true);
    setError('');
    try {
      const res = await mh.exportData();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mental-health-export.json';
      a.click();
      URL.revokeObjectURL(url);
      setInfo('Exportación generada correctamente.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al exportar');
    } finally {
      setExporting(false);
    }
  };

  const deleteData = async () => {
    setDeleting(true);
    setError('');
    try {
      await mh.deleteAccount();
      setInfo('Tus datos de bienestar fueron eliminados permanentemente.');
      setConfirmDelete(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Privacidad y consentimiento</h1>
        <p className="text-sm text-slate-500">
          Tú controlas tus datos de bienestar. Tus datos nunca se comparten con la clínica sin tu consentimiento
          explícito y son independientes del expediente clínico.
        </p>
      </div>

      {error && <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 text-sm">{error}</div>}
      {info && <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-700 text-sm">{info}</div>}

      <section className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-800 text-sm">Consentimientos</h2>
        {(Object.keys(CONSENT_LABELS)).map((type) => (
          <div key={type} className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-700">{CONSENT_LABELS[type]}</span>
            <button
              onClick={() => toggle(type, !grantState(type))}
              className={`relative w-12 h-7 rounded-full transition ${grantState(type) ? 'bg-teal-600' : 'bg-slate-300'}`}
              aria-pressed={grantState(type)}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${grantState(type) ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        ))}
      </section>

      <section className="rounded-2xl bg-white border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-800 text-sm">Derechos sobre tus datos</h2>
        <p className="mt-1 text-xs text-slate-400">
          Exporta una copia de todos tus registros de bienestar o elimina permanentemente todos tus datos de este módulo.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={exportData} disabled={exporting}
            className="px-4 py-2.5 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50">
            {exporting ? 'Exportando...' : '⬇ Exportar mis datos'}
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="px-4 py-2.5 rounded-full bg-rose-50 text-rose-600 text-sm font-semibold hover:bg-rose-100">
              Eliminar mis datos
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-600">¿Seguro? Esta acción es irreversible.</span>
              <button onClick={deleteData} disabled={deleting}
                className="px-4 py-2.5 rounded-full bg-rose-600 text-white text-sm font-semibold disabled:opacity-50">
                {deleting ? 'Eliminando...' : 'Sí, eliminar todo'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2.5 rounded-full bg-slate-100 text-slate-600 text-sm">
                Cancelar
              </button>
            </div>
          )}
        </div>
      </section>

      <p className="text-xs text-slate-400">
        MyCalma es una herramienta de bienestar y no sustituye atención médica o psicológica profesional.
        Los patrones mostrados son observaciones de tu historial, no diagnósticos.
      </p>
    </div>
  );
}