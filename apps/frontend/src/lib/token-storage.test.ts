import { beforeEach, describe, expect, it } from 'vitest';
import { clearTokens, getStoredTokens, storeTokens } from './token-storage';

beforeEach(() => {
  window.localStorage.clear();
});

describe('token-storage', () => {
  it('returns null when nothing has been stored', () => {
    expect(getStoredTokens()).toBeNull();
  });

  it('returns null when only one of the two tokens is present', () => {
    window.localStorage.setItem('dentalflow.accessToken', 'access-only');

    expect(getStoredTokens()).toBeNull();
  });

  it('round-trips a stored token pair', () => {
    storeTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });

    expect(getStoredTokens()).toEqual({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
    });
  });

  it('clearTokens removes both tokens', () => {
    storeTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });

    clearTokens();

    expect(getStoredTokens()).toBeNull();
  });
});
