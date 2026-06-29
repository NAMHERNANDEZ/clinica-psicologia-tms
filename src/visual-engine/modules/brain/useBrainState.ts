import { useState, useEffect, useCallback } from 'react';
import type { BrainVisualState, PatientState } from '../../core/StateMapper';
import { mapStateToBrain } from '../../core/ClinicalRenderer';

export interface SessionHistory {
  session_number: number;
  mood_score: number;
  anxiety_score: number;
  energy_score: number;
}

export interface CurvePoint {
  session_number: number;
  mood_score: number;
  overall_response: number;
}

interface UseBrainStateReturn {
  brainStates: BrainVisualState[];
  patientState: PatientState;
  patientName: string;
  sessionNumber: number;
  totalSessions: number;
  history: SessionHistory[];
  curve: CurvePoint[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBrainState(patientId: number): UseBrainStateReturn {
  const [brainStates, setBrainStates] = useState<BrainVisualState[]>([]);
  const [patientState, setPatientState] = useState<PatientState>('REGISTERED');
  const [patientName, setPatientName] = useState('');
  const [sessionNumber, setSessionNumber] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [curve, setCurve] = useState<CurvePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId) {
      setPatientState('REGISTERED');
      setBrainStates(mapStateToBrain('REGISTERED'));
      setPatientName('');
      setSessionNumber(0);
      setTotalSessions(0);
      setHistory([]);
      setCurve([]);
      return;
    }
    try {
      setLoading(true);
      const { cos, patients, tmsProfiles, tmsSessions, clinicalResponse } = await import('../../../lib/api');

      const [stateRes, patientRes] = await Promise.allSettled([
        cos.getNextAction(patientId) as Promise<{ data?: { current_state?: PatientState } }>,
        patients.get(patientId),
      ]);

      const state = (stateRes.status === 'fulfilled' ? stateRes.value?.data?.current_state : null) || 'REGISTERED';
      setPatientState(state as PatientState);
      setBrainStates(mapStateToBrain(state as PatientState));

      if (patientRes.status === 'fulfilled') {
        setPatientName(patientRes.value.data?.name || '');
      }

      const [profilesRes, curveRes] = await Promise.allSettled([
        tmsProfiles.listByPatient(patientId),
        clinicalResponse.getCurve(patientId),
      ]);

      if (profilesRes.status === 'fulfilled') {
        const profiles = (profilesRes.value as { data?: Array<{ id: number; status: string }> }).data || [];
        const activeProfile = profiles.find((p: { status: string }) => p.status === 'active') || profiles[0];
        if (activeProfile) {
          const sessionsRes = await tmsSessions.listByProfile(activeProfile.id).catch(() => ({ data: [] as Array<{ session_number: number; status: string }> }));
          const sessions = sessionsRes.data || [];
          const completed = sessions.filter((s: { status: string }) => s.status === 'completed');
          const sorted = completed.sort((a: { session_number: number }, b: { session_number: number }) => b.session_number - a.session_number);
          setSessionNumber(sorted[0]?.session_number || 0);
          setTotalSessions(sessions.length);
        }
      }

      if (curveRes.status === 'fulfilled') {
        const curveData = (curveRes.value as { data?: CurvePoint[] }).data || [];
        setCurve(curveData);

        const historyMapped: SessionHistory[] = curveData.map((c: CurvePoint) => ({
          session_number: c.session_number,
          mood_score: c.mood_score,
          anxiety_score: 0,
          energy_score: 0,
        }));
        setHistory(historyMapped);
      }

      setError(null);
    } catch {
      setPatientState('REGISTERED');
      setBrainStates(mapStateToBrain('REGISTERED'));
      setPatientName('');
      setSessionNumber(0);
      setTotalSessions(0);
      setHistory([]);
      setCurve([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  return { brainStates, patientState, patientName, sessionNumber, totalSessions, history, curve, loading, error, refresh: load };
}
