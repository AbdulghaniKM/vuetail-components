import { computed, ref, watch, type Ref } from 'vue';
import api, { setAuthProvider } from '@/plugins/axios';
import { clearAuthToken, getAuthToken, setAuthToken } from '@/lib/authToken';

/**
 * Session state on top of `src/lib/authToken.ts`.
 *
 * The access token lives in memory only (authToken.ts), so an XSS payload cannot read it from
 * storage. The refresh token is the server's business: an httpOnly, SameSite cookie that
 * `/auth/refresh` reads. Nothing here touches localStorage. A reload starts signed out until
 * `refresh()` (or the axios interceptor, on the first 401) gets a new access token from the cookie.
 */

export interface AuthUser {
  id: string | number;
  name: string;
  email: string;
  roles?: string[];
}

export interface AuthEndpoints {
  login: string;
  refresh: string;
  logout: string;
  me: string;
}

const endpoints: AuthEndpoints = {
  login: '/auth/login',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  me: '/auth/me',
};

/** Point useAuth at your API's routes. Call once, before the first request (main.ts). */
export const configureAuth = (paths: Partial<AuthEndpoints>): void => {
  Object.assign(endpoints, paths);
};

// NOTE: Module-scope state. SPA-only — not safe under SSR (state would leak across requests).
const user = ref<AuthUser | null>(null);
const loading = ref(false);
const token = computed(() => getAuthToken());
const isAuthenticated = computed(() => token.value !== null);

// The token can be cleared from anywhere (the app's onUnauthorized, a logout in another
// component); the user goes with it rather than lingering as a signed-out "Ada".
watch(
  isAuthenticated,
  (signedIn) => {
    if (!signedIn) user.value = null;
  },
  { flush: 'sync' },
);

const clearSession = () => {
  clearAuthToken();
  user.value = null;
};

// `withCredentials` sends the httpOnly refresh cookie. `_retry` tells the axios interceptor not
// to answer a 401 on this request with another refresh, which would wait on itself forever.
const COOKIE_REQUEST = { withCredentials: true, _retry: true } as Record<string, unknown>;

let inflight: Promise<string | null> | null = null;

/** One refresh at a time: the interceptor and `refresh()` share the request in flight. */
const refreshAccessToken = (): Promise<string | null> => {
  inflight ??= (async () => {
    try {
      const res = await api.post(endpoints.refresh, undefined, COOKIE_REQUEST);
      const next: string | null = res.data?.token ?? null;
      if (!next) {
        clearSession();
        return null;
      }
      setAuthToken(next);
      return next;
    } catch {
      clearSession();
      return null;
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
};

// getToken and refreshToken only: what happens on an unrecoverable 401 (redirect to Login,
// a toast) belongs to the app, which registers onUnauthorized in main.ts.
setAuthProvider({ getToken: getAuthToken, refreshToken: refreshAccessToken });

export const useAuth = <TUser extends AuthUser = AuthUser>() => {
  /** Store a session your own code obtained (SSO callback, invite link…). */
  const setSession = (accessToken: string, userData?: TUser) => {
    setAuthToken(accessToken);
    if (userData) user.value = userData;
  };

  const login = async (credentials: { email: string; password: string }) => {
    loading.value = true;
    try {
      const res = await api.post(endpoints.login, credentials, { withCredentials: true });
      setSession(res.data.token, res.data.user);
      return res.data;
    } finally {
      loading.value = false;
    }
  };

  const fetchUser = async (): Promise<TUser | null> => {
    if (!isAuthenticated.value) return null;
    loading.value = true;
    try {
      const res = await api.get(endpoints.me);
      user.value = res.data;
      return res.data;
    } catch {
      clearSession();
      return null;
    } finally {
      loading.value = false;
    }
  };

  /** Trade the refresh cookie for a new access token. `false` (and signed out) if it failed. */
  const refresh = async (): Promise<boolean> => (await refreshAccessToken()) !== null;

  /** Clears the session here and asks the server to drop the refresh cookie. */
  const logout = async () => {
    clearSession();
    try {
      await api.post(endpoints.logout, undefined, COOKIE_REQUEST);
    } catch {
      /* already signed out locally; the cookie expires on its own */
    }
  };

  return {
    user: user as Ref<TUser | null>,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
    fetchUser,
    refresh,
    setSession,
  };
};
