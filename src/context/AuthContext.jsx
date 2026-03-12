import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth as authApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('ecr_token');
    const storedUser = localStorage.getItem('ecr_user');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    if (token.startsWith('mock_') && storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setUser({ ...u, _mock: true });
      } catch {
        setUser(null);
      }
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setUser(data);
    } catch {
      localStorage.removeItem('ecr_token');
      localStorage.removeItem('ecr_user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    const data = res?.data;
    if (!data?.access_token) throw new Error('Invalid response from server');
    localStorage.setItem('ecr_token', data.access_token);
    loadUser().catch(() => {}); // load user in background; don't block redirect
    return data;
  }, [loadUser]);

  const register = useCallback(async (email, password, full_name, role) => {
    const res = await authApi.register({ email, password, full_name, role });
    const data = res?.data;
    if (!data?.access_token) throw new Error('Invalid response from server');
    localStorage.setItem('ecr_token', data.access_token);
    loadUser().catch(() => {}); // load user in background; don't block redirect
    return data;
  }, [loadUser]);

  const acceptJwt = useCallback(async (accessToken) => {
    if (!accessToken) throw new Error('Missing access token');
    localStorage.setItem('ecr_token', accessToken);
    await loadUser();
  }, [loadUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('ecr_token');
    localStorage.removeItem('ecr_user');
    setUser(null);
  }, []);

  const isMockUser = !!(user && user._mock);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, acceptJwt, logout, loadUser, isMockUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
