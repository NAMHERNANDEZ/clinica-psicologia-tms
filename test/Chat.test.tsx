import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Chat from '../src/pages/Chat';
import { LanguageProvider } from '../src/context/LanguageContext';

beforeAll(() => {
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  }
});

// Regresión 2026-09-14: /chat debe enlazar a /voz y no mostrar artefactos.

function renderChat() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <Chat />
      </LanguageProvider>
    </MemoryRouter>
  );
}

describe('Chat page', () => {
  it('renderiza input y botón enviar', () => {
    renderChat();
    expect(screen.getByPlaceholderText(/escribe tu mensaje/i)).toBeInTheDocument();
  });

  it('muestra pestañas Texto y Voz sin scroll', () => {
    renderChat();
    expect(screen.getByRole('tab', { name: /texto/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /voz/i })).toBeInTheDocument();
  });

  it('botón mic en el input cambia a Voz con controles', async () => {
    renderChat();
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(screen.getByRole('button', { name: /hablar por voz/i }));
    expect(await screen.findByRole('button', { name: /iniciar escucha/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /escribe tu mensaje/i })).toBeInTheDocument();
  });

  it('enlaza a la UI de voz /voz', () => {
    renderChat();
    const link = screen.getByRole('link', { name: /hablar por voz/i });
    expect(link).toBeInTheDocument();
    expect(link.getAttribute('href')).toBe('/voz');
  });

  it('no renderiza texto literal "svg"', () => {
    const { container } = renderChat();
    expect(container.textContent || '').not.toMatch(/(^|\s)svg(\s|$)/i);
  });
});
