import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { WellbeingScale, WellbeingCreateResult, WellbeingAssessmentDetail } from '../src/lib/api';

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

import MhAssessmentRunPage from '../src/pages/mh/MhAssessmentRunPage';

const scale: WellbeingScale = {
  id: 'stress-pss4', name: 'PSS-4', full_name: 'Perceived Stress Scale-4',
  description: 'Estrés percibido breve', condition: 'Estrés percibido',
  max_score: 16, item_count: 4, time_to_complete: '~1 min', source: 'Cohen', cutoffs: [],
};

const previewData = {
  success: true,
  data: { score: 8, max_score: 16, interpretation: 'Estrés moderado', severity: 'moderate', color: '#F59E0B', recommendation: 'Considera técnicas de relajación.' },
};

const created: WellbeingCreateResult = {
  id: 42, scale_id: 'stress-pss4', score: 8, max_score: 16,
  interpretation: 'Estrés moderado', band: 'moderate',
  disclaimer: 'Esta es una autoevaluación de bienestar y no constituye un diagnóstico.',
};

const persistedDetail: WellbeingAssessmentDetail = {
  assessment: {
    id: 42, scale_id: 'stress-pss4', scale_name: 'PSS-4', version: '1.0',
    score: 8, max_score: 16, interpretation: 'Estrés moderado', band: 'moderate',
    provenance: 'user_self_report', disclaimer: 'no es un diagnóstico',
    administered_at: '2026-09-12T10:00:00Z', created_at: '2026-09-12T10:00:00Z',
  },
  responses: [{ item_id: 's1', value: 3 }, { item_id: 's2', value: 2 }, { item_id: 's3', value: 1 }, { item_id: 's4', value: 2 }],
};

function renderRun() {
  return render(
    <MemoryRouter initialEntries={['/mh/assessments/stress-pss4']}>
      <Routes>
        <Route path="/mh/assessments/:scaleId" element={<MhAssessmentRunPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const OPT1 = 'A menudo';   // s1 value 3
const OPT2 = 'Casi nunca'; // s2 value 1
const OPT3 = 'A veces';    // s3 value 2
const OPT4 = 'Muy a menudo'; // s4 value 4

async function answerAll() {
  // Pregunta 1
  fireEvent.click(screen.getByText(OPT1));
  fireEvent.click(screen.getByRole('button', { name: /siguiente/i }));
  // Pregunta 2
  await screen.findByText('Pregunta 2 de 4');
  fireEvent.click(screen.getByText(OPT2));
  fireEvent.click(screen.getByRole('button', { name: /siguiente/i }));
  // Pregunta 3
  await screen.findByText('Pregunta 3 de 4');
  fireEvent.click(screen.getByText(OPT3));
  fireEvent.click(screen.getByRole('button', { name: /siguiente/i }));
  // Pregunta 4 (final): muestra botón de preview
  await screen.findByText('Pregunta 4 de 4');
  fireEvent.click(screen.getByText(OPT4));
}

async function answerAllAndPreview() {
  await answerAll();
  fireEvent.click(screen.getByTestId('wb-preview-btn'));
  await waitFor(() => expect(screen.getByTestId('wb-preview')).toBeInTheDocument());
}

describe('MhAssessmentRunPage (flujo responder → preview → completar → resultado)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    wellbeingMock.scales.mockResolvedValue({ success: true, data: [scale] });
  });

  it('inicia con metadatos reales y muestra una pregunta por pantalla con progreso', async () => {
    renderRun();
    expect(await screen.findByText('Pregunta 1 de 4')).toBeInTheDocument();
    expect(screen.getByTestId('wb-q-s1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente/i })).toBeDisabled(); // sin respuesta aun
    expect(screen.getByText(/0 de 4 respondidas/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled();
  });

  it('exige respuesta para avanzar (evita saltar preguntas)', async () => {
    renderRun();
    await screen.findByText('Pregunta 1 de 4');
    const next = screen.getByRole('button', { name: /siguiente/i });
    expect(next).toBeDisabled();
    fireEvent.click(screen.getByText(OPT1));
    expect(next).toBeEnabled();
  });

  it('flujo completo: responder → preview → confirmar → resultado persistido (reload a través de detail)', async () => {
    wellbeingMock.preview.mockResolvedValue(previewData);
    wellbeingMock.complete.mockResolvedValue({ success: true, data: created });
    wellbeingMock.detail.mockResolvedValue({ success: true, data: persistedDetail });

    renderRun();
    await screen.findByText('Pregunta 1 de 4');
    await answerAllAndPreview();

    // Preview: resultado provisional del endpoint real
    await waitFor(() => expect(screen.getByText('Resultado provisional')).toBeInTheDocument());
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('/16')).toBeInTheDocument();
    expect(screen.getByText('Estrés moderado')).toBeInTheDocument();

    // Confirmar → completar
    fireEvent.click(screen.getByTestId('wb-confirm'));
    await waitFor(() => expect(screen.getByTestId('wb-result')).toBeInTheDocument());
    expect(screen.getByText('Resultado registrado')).toBeInTheDocument();
    expect(wellbeingMock.complete).toHaveBeenCalledTimes(1);
    // Payload enviado al backend (scoring NO en frontend: solo item_id/value)
    const payload = wellbeingMock.complete.mock.calls[0][0];
    expect(payload.scale_id).toBe('stress-pss4');
    expect(payload.provenance).toBe('user_self_report');
    expect(payload.responses).toHaveLength(4);
    // Persistencia verificada con el detalle persistido
    expect(wellbeingMock.detail).toHaveBeenCalledWith(42);
    expect(screen.getByText('Estrés moderado')).toBeInTheDocument();
    // Acciones siguientes disponibles
    expect(screen.getByRole('button', { name: /hacer una intervención/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hablar con la ia/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar y salir/i })).toBeInTheDocument();
  });

  it('prevención de doble submit: confirmar no envía dos POST mientras guarda', async () => {
    let resolveComplete: (v: { success: boolean; data: WellbeingCreateResult }) => void = () => {};
    wellbeingMock.preview.mockResolvedValue(previewData);
    wellbeingMock.complete.mockImplementation(() => new Promise((resolve) => {
      resolveComplete = resolve as never;
    }) as never);
    wellbeingMock.detail.mockResolvedValue({ success: true, data: persistedDetail });

    renderRun();
    await screen.findByText('Pregunta 1 de 4');
    await answerAllAndPreview();
    await waitFor(() => expect(screen.getByTestId('wb-confirm')).toBeInTheDocument());

    const confirmBtn = screen.getByRole('button', { name: /confirmar y guardar/i });
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn); // segundo click mientras aun guarda
    expect(wellbeingMock.complete).toHaveBeenCalledTimes(1);
    expect(confirmBtn).toBeDisabled();

    await act(async () => { resolveComplete({ success: true, data: created }); });
    await waitFor(() => expect(screen.getByTestId('wb-result')).toBeInTheDocument());
  });

  it('error de backend al completar: permanece en preview y muestra el error real (no mock/demo)', async () => {
    wellbeingMock.preview.mockResolvedValue(previewData);
    wellbeingMock.complete.mockRejectedValue(new Error('HTTP 500'));
    renderRun();
    await screen.findByText('Pregunta 1 de 4');
    await answerAllAndPreview();
    fireEvent.click(screen.getByTestId('wb-confirm'));
    await waitFor(() => expect(screen.getByText('HTTP 500')).toBeInTheDocument());
    expect(screen.getByTestId('wb-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('wb-result')).toBeNull();
    expect(screen.getByRole('button', { name: /confirmar y guardar/i })).toBeEnabled(); // reintentable
  });

  it('malformed response de preview: error visible y no inventa score', async () => {
    wellbeingMock.preview.mockResolvedValue({ success: false });
    renderRun();
    await screen.findByText('Pregunta 1 de 4');
    await answerAll();
    fireEvent.click(screen.getByTestId('wb-preview-btn'));
    await waitFor(() => expect(screen.getByText('No se pudo calcular el resultado')).toBeInTheDocument());
    // No inventa score: permanece en answering, sin preview/result
    expect(screen.queryByTestId('wb-preview')).toBeNull();
    expect(screen.queryByTestId('wb-result')).toBeNull();
    expect(screen.getByTestId('wb-answering')).toBeInTheDocument();
  });

  it('respuestas se conservan al volver de preview (revisar respuestas no vacía el form)', async () => {
    wellbeingMock.preview.mockResolvedValue(previewData);
    renderRun();
    await screen.findByText('Pregunta 1 de 4');
    await answerAllAndPreview();
    await waitFor(() => expect(screen.getByTestId('wb-preview')).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole('button', { name: /revisar respuestas/i })[1]);
    // vuelve a la pregunta 4 (última) con la respuesta seleccionada
    await waitFor(() => expect(screen.getByText('Pregunta 4 de 4')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: OPT4 })).toHaveAttribute('aria-pressed', 'true');
  });
});