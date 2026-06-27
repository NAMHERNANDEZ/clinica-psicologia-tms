import { useState, useEffect, useCallback } from 'react';
import { cos } from '../../../lib/api';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await cos.getNextAction(patientId) as { data?: { current_state?: PatientState } };
      const state = (res?.data?.current_state || 'REGISTERED') as PatientState;
      setPatientState(state);
      setBrainStates(mapStateToBrain(state));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading brain state');
      setBrainStates(mapStateToBrain('REGISTERED'));
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  return { brainStates, patientState, loading, error, refresh: load };
}
