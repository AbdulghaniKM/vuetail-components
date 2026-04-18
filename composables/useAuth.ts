import { computed, ref } from 'vue';
import api, { setAuthProvider } from '../plugins/axios';

export interface AuthUser {
  id: string | number;
  name: string;
  email: string;
  roles?: string[];
  [key: string]: any;
}

const TOKEN_KEY = 'auth-token';
const REFRESH_TOKEN_KEY = 'auth-refresh-token';

const token = ref<string | null>(readToken());
const user = ref<AuthUser | null>(null);
const loading = ref(false);

function readToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function persistToken(t: string | null) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable */ }
}

function persistRefreshToken(t: string | null) {
  if (typeof localStorage === 'undefined') return;
  try {
    if (t) localStorage.setItem(REFRESH_TOKEN_KEY, t);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch { /* storage unavailable */ }
}

export function getAuthToken(): string | null {
  return token.value;
}

export function clearAuthSession() {
  token.value = null;
  user.value = null;
  persistToken(null);
  persistRefreshToken(null);
}

// Register with the axios plugin so the request interceptor can read the
// token and the response interceptor can refresh / clear on 401.
setAuthProvider({
  getToken: () => token.value,
  onUnauthorized: () => clearAuthSession(),
  refreshToken: async () => {
    const stored =
      typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
    if (!stored) { clearAuthSession(); return null; }
    try {
      const res = await api.post('/auth/refresh', { refreshToken: stored });
      const newToken = res.data?.token ?? null;
      if (!newToken) { clearAuthSession(); return null; }
      token.value = newToken;
      persistToken(newToken);
      if (res.data?.refreshToken) persistRefreshToken(res.data.refreshToken);
      return newToken;
    } catch {
      clearAuthSession();
      return null;
    }
  },
});

export const useAuth = () => {
  const isAuthenticated = computed(() => !!token.value);

  const setSession = (accessToken: string, refreshTkn?: string, userData?: AuthUser) => {
    token.value = accessToken;
    persistToken(accessToken);
    if (refreshTkn) persistRefreshToken(refreshTkn);
    if (userData) user.value = userData;
  };

  const login = async (credentials: { email: string; password: string }) => {
    loading.value = true;
    try {
      const res = await api.post('/auth/login', credentials);
      setSession(res.data.token, res.data.refreshToken, res.data.user);
      return res.data;
    } finally {
      loading.value = false;
    }
  };

  const fetchUser = async () => {
    if (!token.value) return null;
    loading.value = true;
    try {
      const res = await api.get('/auth/me');
      user.value = res.data;
      return res.data;
    } catch {
      clearAuthSession();
      return null;
    } finally {
      loading.value = false;
    }
  };

  const refreshToken = async () => {
    // Axios interceptor performs single-flight refresh via the provider
    // registered above. Kept as a public method for callers that need to
    // force a refresh outside an intercepted 401.
    const stored =
      typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;
    if (!stored) { clearAuthSession(); return false; }
    try {
      const res = await api.post('/auth/refresh', { refreshToken: stored });
      setSession(res.data.token, res.data.refreshToken);
      return true;
    } catch {
      clearAuthSession();
      return false;
    }
  };

  const logout = () => clearAuthSession();

  return {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
    fetchUser,
    refreshToken,
    setSession,
  };
};
