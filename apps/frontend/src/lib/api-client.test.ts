import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { apiClient } from './api-client';
import { getStoredTokens, storeTokens } from './token-storage';

let apiMock: MockAdapter;
let rawAxiosMock: MockAdapter;

beforeEach(() => {
  window.localStorage.clear();
  apiMock = new MockAdapter(apiClient);
  rawAxiosMock = new MockAdapter(axios);
});

afterEach(() => {
  apiMock.restore();
  rawAxiosMock.restore();
});

describe('apiClient request interceptor', () => {
  it('attaches the stored access token as a Bearer header', async () => {
    storeTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    apiMock.onGet('/patients').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer access-1');
      return [200, { ok: true }];
    });

    await apiClient.get('/patients');
  });

  it('sends no Authorization header when there is no stored token', async () => {
    apiMock.onGet('/patients').reply((config) => {
      expect(config.headers?.Authorization).toBeUndefined();
      return [200, { ok: true }];
    });

    await apiClient.get('/patients');
  });
});

describe('apiClient response interceptor: 401 handling', () => {
  it('does not attempt a refresh for auth endpoints (login/refresh/logout/google)', async () => {
    storeTokens({ accessToken: 'expired', refreshToken: 'refresh-1' });
    apiMock.onPost('/auth/login').reply(401, { message: 'Credenciales inválidas' });
    rawAxiosMock.onPost(/\/auth\/refresh$/).reply(() => {
      throw new Error('refresh should not have been called for an auth endpoint');
    });

    await expect(
      apiClient.post('/auth/login', { email: 'x', password: 'y' }),
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('refreshes the token and retries the original request on a 401 from a protected endpoint', async () => {
    storeTokens({ accessToken: 'expired', refreshToken: 'refresh-1' });
    let patientsCallCount = 0;
    apiMock.onGet('/patients').reply((config) => {
      patientsCallCount += 1;
      if (config.headers?.Authorization === 'Bearer expired') {
        return [401, { message: 'Unauthorized' }];
      }
      return [200, { data: 'ok', authHeader: config.headers?.Authorization }];
    });
    rawAxiosMock.onPost(/\/auth\/refresh$/).reply(200, {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    const response = await apiClient.get('/patients');

    expect(patientsCallCount).toBe(2);
    expect(response.data.authHeader).toBe('Bearer new-access');
    expect(getStoredTokens()).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
  });

  it('does not retry more than once for the same request', async () => {
    storeTokens({ accessToken: 'expired', refreshToken: 'refresh-1' });
    let patientsCallCount = 0;
    apiMock.onGet('/patients').reply(() => {
      patientsCallCount += 1;
      return [401, { message: 'still unauthorized' }];
    });
    rawAxiosMock.onPost(/\/auth\/refresh$/).reply(200, {
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });

    await expect(apiClient.get('/patients')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(patientsCallCount).toBe(2);
  });

  it('deduplicates concurrent refreshes into a single request', async () => {
    storeTokens({ accessToken: 'expired', refreshToken: 'refresh-1' });
    apiMock.onGet(/\/patients\/.+/).reply((config) => {
      if (config.headers?.Authorization === 'Bearer expired') {
        return [401, { message: 'Unauthorized' }];
      }
      return [200, { ok: true }];
    });
    let refreshCallCount = 0;
    rawAxiosMock.onPost(/\/auth\/refresh$/).reply(() => {
      refreshCallCount += 1;
      return [200, { accessToken: 'new-access', refreshToken: 'new-refresh' }];
    });

    await Promise.all([
      apiClient.get('/patients/1'),
      apiClient.get('/patients/2'),
      apiClient.get('/patients/3'),
    ]);

    expect(refreshCallCount).toBe(1);
  });

  it('clears tokens when the refresh itself fails', async () => {
    storeTokens({ accessToken: 'expired', refreshToken: 'bad-refresh' });
    apiMock.onGet('/patients').reply(401, { message: 'Unauthorized' });
    rawAxiosMock.onPost(/\/auth\/refresh$/).reply(401, { message: 'invalid refresh token' });

    await expect(apiClient.get('/patients')).rejects.toBeTruthy();

    expect(getStoredTokens()).toBeNull();
  });
});
