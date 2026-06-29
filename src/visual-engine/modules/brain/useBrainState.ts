import { useState, useEffect, useCallback } from 'react';
import type { BrainVisualState, PatientState } from '../../core/StateMapper';
import { mapStateToBrain } from '../../core/ClinicalRenderer';

interface UseBrainStateReturn {
  brainStates: BrainVisualState[];
  patientState: PatientState;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBrainState(patientId: number): UseBrainStateReturn {
  const [brainStates, setBrainStates] = useState<BrainVisualState[]>([]);
  const [patientState, setPatientState] = useState<PatientState>('REGISTERED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { cos } = await import('../../../lib/api');
      const res = await cos.getNextAction(patientId) as { data?: { current_state?: PatientState } };
      const state = (res?.data?.current_state || 'REGISTERED') as PatientState;
      setPatientState(state);
      setBrainStates(mapStateToBrain(state));
      setError(null);
    } catch {
      setPatientState('REGISTERED');
      setBrainStates(mapStateToBrain('REGISTERED'));
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  return { brainStates, patientState, loading, error, refresh: load };
}
