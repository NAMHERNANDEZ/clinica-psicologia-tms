import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { WellbeingScale, WellbeingAssessmentListItem } from '../src/lib/api';

const wellbeingMock = vi.hoisted(() => ({
  scales: vi.fn(),
  list: vi.fn(),
  detail: vi.fn(),
  preview: vi.fn(),
  complete: vi.fn(),
  cutoffs: vi.fn(),
}));

vi.mock('../src/lib/api', () => ({
  wellbeing: wellbeingMock,
  sendChatMessage: vi.fn(),
}));

import MhAssessmentsPage from '../src/pages/mh/MhAssessmentsPage';

const scales: WellbeingScale[] = [
  {
    id: 'stress-pss4', name: 'PSS-4', full_name: 'Perceived Stress Scale-4',
    description: 'Estrés percibido breve', condition: 'Estrés percibido',
    max_score: 16, item_count: 4, time_to_complete: '~1 min', source: 'Cohen',
    cutoffs: [],
  },
  {
    id: 'sleep-sq5', name: 'SQ-5', full_name: 'Sleep Quality-5',
    description: 'Calidad de sueño breve', condition: 'Calidad de sueño',
    max_score: 15, item_count: 5, time_to_complete: '~1 min', source: 'PSQI',
    cutoffs: [],
  },
];

const historyItem: WellbeingAssessmentListItem = {
  id: 9, scale_id: 'stress-pss4', scale_name: 'PSS-4', score: 8, max_score: 16,
  interpretation: 'Moderado', band: 'moderate', provenance: 'user_self_report',
  disclaimer: 'no es un diagnóstico', administered_at: '2026-09-12T10:00:00Z',
  created_at: '2026-09-12T10:00:00Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/mh/assessments']}>
      <MhAssessmentsPage />
    </MemoryRouter>
  );
}

describe('MhAssessmentsPage (lista /mh/assessments)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza el catálogo wellbeing con metadatos reales de la API (no hardcodea nada clínico)', async () => {
    wellbeingMock.scales.mockResolvedValue({ success: true, data: scales });
    wellbeingMock.list.mockResolvedValue({ success: true, data: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText('PSS-4')).toBeInTheDocument());
    expect(screen.getByText('SQ-5')).toBeInTheDocument();
    expect(screen.getByText('4 preguntas')).toBeInTheDocument();
    expect(screen.getByText('5 preguntas')).toBeInTheDocument();
    expect(screen.getByText('máx. 16 pts')).toBeInTheDocument();
    expect(screen.getAllByText(/Iniciar/).length).toBe(2);
    // No hay contenido clínico (phq9/gad7/bdii no deben aparecer)
    expect(screen.queryByText(/phq9|gad7|bdii/i)).toBeNull();
    // Aislamiento clinical/wellbeing: la página no consulta el catálogo clínico
    expect(screen.getByText('Mis resultados')).toBeInTheDocument();
  });

  it('muestra historial únicamente de wellbeing (user-scoped) con score y banda', async () => {
    wellbeingMock.scales.mockResolvedValue({ success: true, data: scales });
    wellbeingMock.list.mockResolvedValue({ success: true, data: [historyItem] });
    renderPage();
    await waitFor(() => expect(screen.getAllByText('PSS-4').length).toBeGreaterThan(0));
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('/16')).toBeInTheDocument();
    expect(screen.getByText('Moderado')).toBeInTheDocument();
    expect(screen.getByTestId('wellbeing-history').children.length).toBe(1);
  });

  it('muestra el estado vacío cuando no hay evaluaciones realizadas', async () => {
    wellbeingMock.scales.mockResolvedValue({ success: true, data: scales });
    wellbeingMock.list.mockResolvedValue({ success: true, data: [] });
    renderPage();
    await waitFor(() => expect(screen.getByText(/Aún no has realizado ninguna evaluación/i)).toBeInTheDocument());
  });

  it('en error de red muestra el error real y permite reintentar (retry recupera)', async () => {
    wellbeingMock.scales.mockRejectedValueOnce(new Error('Network error'));
    wellbeingMock.list.mockRejectedValueOnce(new Error('Network error'));
    renderPage();
    await waitFor(() => expect(screen.getByText('No pudimos cargar las evaluaciones.')).toBeInTheDocument());
    expect(screen.getByText('Network error')).toBeInTheDocument();
    // retry con backend recuperado
    wellbeingMock.scales.mockResolvedValueOnce({ success: true, data: scales });
    wellbeingMock.list.mockResolvedValueOnce({ success: true, data: [] });
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    await waitFor(() => expect(screen.getByText('PSS-4')).toBeInTheDocument());
  });

  it('en respuesta malformada (sin data) muestra el catálogo vacío sin romper', async () => {
    wellbeingMock.scales.mockResolvedValue({ success: true, data: null as unknown as WellbeingScale[] });
    wellbeingMock.list.mockResolvedValue({ success: false });
    renderPage();
    await waitFor(() => expect(screen.getByText(/No hay evaluaciones disponibles/i)).toBeInTheDocument());
  });
});