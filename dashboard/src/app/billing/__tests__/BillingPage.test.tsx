import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BillingPage from '../page';

// Mock window.location.href
const originalLocation = window.location;
beforeEach(() => {
  delete (window as any).location;
  window.location = { ...originalLocation, href: '' } as any;
  vi.clearAllMocks();
});

describe('BillingPage UI', () => {
  it('should display loading state initially', () => {
    // Mock fetch to pending promise
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    
    render(<BillingPage />);
    expect(screen.getByText(/Cargando plan/i)).toBeInTheDocument();
  });

  it('should display FREE plan and Upgrade button when API returns FREE plan', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plan: 'FREE' })
    });

    render(<BillingPage />);

    // Wait for the plan to load
    await waitFor(() => {
      expect(screen.getByText('FREE')).toBeInTheDocument();
    });
    
    expect(screen.getByRole('button', { name: /Actualizar a Pro/i })).toBeInTheDocument();
  });

  it('should display PRO plan and Manage button when API returns PRO plan', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plan: 'PRO' })
    });

    render(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByText('PRO')).toBeInTheDocument();
    });
    
    expect(screen.getByRole('button', { name: /Gestionar Suscripción/i })).toBeInTheDocument();
  });

  it('should handle Upgrade to Pro click successfully', async () => {
    global.fetch = vi.fn()
      // First call for initial load
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plan: 'FREE' })
      })
      // Second call for checkout
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://checkout.stripe.com/test' })
      });

    render(<BillingPage />);

    // Wait for load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Actualizar a Pro/i })).toBeInTheDocument();
    });

    const upgradeButton = screen.getByRole('button', { name: /Actualizar a Pro/i });
    fireEvent.click(upgradeButton);

    // Verify loading state on button
    expect(upgradeButton).toHaveTextContent(/Procesando/i);
    expect(upgradeButton).toBeDisabled();

    // Verify redirection
    await waitFor(() => {
      expect(window.location.href).toBe('https://checkout.stripe.com/test');
    });
  });

  it('should handle Upgrade error gracefully', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ plan: 'FREE' })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      });

    render(<BillingPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Actualizar a Pro/i })).toBeInTheDocument();
    });

    const upgradeButton = screen.getByRole('button', { name: /Actualizar a Pro/i });
    fireEvent.click(upgradeButton);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/Error al procesar el pago/i)).toBeInTheDocument();
    });

    // Button should be re-enabled
    expect(upgradeButton).not.toBeDisabled();
    expect(upgradeButton).toHaveTextContent(/Actualizar a Pro/i);
  });
});
