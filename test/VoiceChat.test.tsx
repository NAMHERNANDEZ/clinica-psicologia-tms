import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VoiceChat from '../src/components/VoiceChat';
import { LanguageProvider } from '../src/context/LanguageContext';

beforeAll(() => {
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  }
});

// Regresión 2026-09-14: la UI de voz no aparecía (componente sin montar).
// Estos tests prueban que los controles existen y renderizan.

function renderVoice() {
  return render(
    <LanguageProvider>
      <VoiceChat />
    </LanguageProvider>
  );
}

describe('VoiceChat controls', () => {
  it('muestra botón iniciar conversación', () => {
    renderVoice();
    expect(screen.getByRole('button', { name: /iniciar escucha/i })).toBeInTheDocument();
    expect(screen.getByText(/iniciar conversación/i)).toBeInTheDocument();
  });

  it('muestra campo de texto y botón enviar', () => {
    renderVoice();
    expect(screen.getByRole('textbox', { name: /escribe tu mensaje/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /enviar mensaje/i })).toBeInTheDocument();
  });

  it('muestra botón detener voz y estado idle', () => {
    renderVoice();
    expect(screen.getByRole('button', { name: /detener voz/i })).toBeInTheDocument();
    expect(screen.getByText('idle')).toBeInTheDocument();
  });

  it('muestra indicadores de agendamiento y crisis', () => {
    renderVoice();
    expect(screen.getByText(/agendamiento real/i)).toBeInTheDocument();
    expect(screen.getByText(/soporte de crisis/i)).toBeInTheDocument();
  });

  it('no renderiza texto literal "svg"', () => {
    const { container } = renderVoice();
    expect(container.textContent || '').not.toMatch(/(^|\s)svg(\s|$)/i);
    expect(container.innerHTML).not.toContain('<svg><');
  });
});
