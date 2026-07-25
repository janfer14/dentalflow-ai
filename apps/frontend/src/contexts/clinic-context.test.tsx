import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClinicProvider, useClinic } from './clinic-context';

const mockUseClinics = vi.fn();
vi.mock('@/hooks/use-directory', () => ({
  useClinics: (...args: unknown[]) => mockUseClinics(...args),
}));

const mockUseAuth = vi.fn();
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

const CLINICS = [
  { id: 'clinic-central', name: 'Sucursal Central', consultingRooms: [] },
  { id: 'clinic-norte', name: 'Sucursal Norte', consultingRooms: [] },
];

function Probe() {
  const { clinics, selectedClinicId, selectedClinic } = useClinic();
  return (
    <div>
      <span data-testid="count">{clinics.length}</span>
      <span data-testid="selected-id">{selectedClinicId ?? ''}</span>
      <span data-testid="selected-name">{selectedClinic?.name ?? ''}</span>
    </div>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
  mockUseClinics.mockReturnValue({ data: CLINICS, isLoading: false });
});

describe('ClinicProvider', () => {
  it('defaults to the first clinic when nothing is stored', async () => {
    render(
      <ClinicProvider>
        <Probe />
      </ClinicProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('selected-id').textContent).toBe('clinic-central'),
    );
    expect(screen.getByTestId('selected-name').textContent).toBe('Sucursal Central');
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('restores a previously selected clinic from localStorage', async () => {
    window.localStorage.setItem('dentalflow.selectedClinicId', 'clinic-norte');

    render(
      <ClinicProvider>
        <Probe />
      </ClinicProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('selected-id').textContent).toBe('clinic-norte'),
    );
  });

  it('falls back to the first clinic when the stored id no longer matches any clinic', async () => {
    window.localStorage.setItem('dentalflow.selectedClinicId', 'clinic-from-another-org');

    render(
      <ClinicProvider>
        <Probe />
      </ClinicProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('selected-id').textContent).toBe('clinic-central'),
    );
  });
});
