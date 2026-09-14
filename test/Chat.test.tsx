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
