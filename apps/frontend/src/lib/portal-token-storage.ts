const PORTAL_ACCESS_TOKEN_KEY = 'dentalflow.portal.accessToken';

export function getStoredPortalToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(PORTAL_ACCESS_TOKEN_KEY);
}

export function storePortalToken(accessToken: string) {
  window.localStorage.setItem(PORTAL_ACCESS_TOKEN_KEY, accessToken);
}

export function clearPortalToken() {
  window.localStorage.removeItem(PORTAL_ACCESS_TOKEN_KEY);
}
