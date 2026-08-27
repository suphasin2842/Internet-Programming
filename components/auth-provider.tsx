// AuthProvider คือศูนย์กลาง Login: ถือสถานะ User/Admin และแนบ Token ให้ API
import { createContext, PropsWithChildren, use, useCallback, useEffect, useMemo, useState } from 'react';

import { API_BASE_URL } from '@/constants/api';
import { authStorage } from '@/utils/auth-storage';

// แยก Key ของ User/Admin เพื่อไม่ให้บัญชีสองแบบปนกัน
const USER_TOKEN_KEY = 'pan-and-toys-user-token-v1';
const ADMIN_TOKEN_KEY = 'pan-and-toys-admin-token-v1';

export type AuthUser = {
  id: string | number;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: 'user';
};

export type AuthAdmin = { username: string; role: 'admin' };
export type AuthRole = 'user' | 'admin' | null;
export type LoginMode = 'user' | 'admin';

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  role: AuthRole;
  user: AuthUser | null;
  admin: AuthAdmin | null;
  token: string | null;
  login: (identifier: string, password: string, mode: LoginMode) => Promise<void>;
  register: (input: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// แปลง Error จาก API ให้หน้า Login/หน้าอื่นเอาไปแสดงได้ง่าย
async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'ดำเนินการไม่สำเร็จ');
  return data;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<AuthRole>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [admin, setAdmin] = useState<AuthAdmin | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // เปิดแอปแล้วลองกู้ Session ที่เก็บไว้ก่อน ถ้าใช้ไม่ได้จึงลบทิ้ง
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const userToken = await authStorage.getItem(USER_TOKEN_KEY);
        if (userToken) {
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${userToken}` },
          });
          if (response.ok) {
            const data = await response.json();
            if (isMounted) {
              setRole('user');
              setUser(data.user);
              setToken(userToken);
              return;
            }
          }
          await authStorage.removeItem(USER_TOKEN_KEY);
        }

        const adminToken = await authStorage.getItem(ADMIN_TOKEN_KEY);
        if (adminToken) {
          const response = await fetch(`${API_BASE_URL}/api/admin/me`, {
            headers: { Authorization: `Bearer ${adminToken}` },
          });
          if (response.ok) {
            const data = await response.json();
            if (isMounted) {
              setRole('admin');
              setAdmin(data.admin);
              setToken(adminToken);
              return;
            }
          }
          await authStorage.removeItem(ADMIN_TOKEN_KEY);
        }
      } catch {
        // A network failure should not prevent browsing public products.
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    restoreSession();
    return () => { isMounted = false; };
  }, []);

  // Login เลือก Endpoint ตามโหมด และเก็บ Token ใน Storage ที่เหมาะกับแพลตฟอร์ม
  const login = useCallback(async (identifier: string, password: string, mode: LoginMode) => {
    const endpoint = mode === 'admin' ? '/api/admin/login' : '/api/auth/login';
    const body = mode === 'admin' ? { username: identifier, password } : { identifier, password };
    const data = await parseResponse(await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }));
    if (mode === 'admin') {
      await authStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      await authStorage.removeItem(USER_TOKEN_KEY);
      setAdmin(data.admin);
      setUser(null);
      setRole('admin');
    } else {
      await authStorage.setItem(USER_TOKEN_KEY, data.token);
      await authStorage.removeItem(ADMIN_TOKEN_KEY);
      setUser(data.user);
      setAdmin(null);
      setRole('user');
    }
    setToken(data.token);
  }, []);

  // สมัคร User เสร็จแล้ว Login ต่อทันที เพื่อให้เริ่มใช้งานได้เลย
  const register = useCallback(async (input: { name: string; email: string; phone: string; password: string }) => {
    await parseResponse(await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }));
    await login(input.name, input.password, 'user');
  }, [login]);

  // แจ้ง Server ให้ลบ Session แล้วลบ Token ในเครื่องด้วย
  const logout = useCallback(async () => {
    const currentRole = role;
    const currentToken = token;
    if (currentToken && currentRole) {
      await fetch(`${API_BASE_URL}${currentRole === 'admin' ? '/api/admin/logout' : '/api/auth/logout'}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
      }).catch(() => undefined);
    }
    await authStorage.removeItem(currentRole === 'admin' ? ADMIN_TOKEN_KEY : USER_TOKEN_KEY);
    setToken(null);
    setRole(null);
    setUser(null);
    setAdmin(null);
  }, [role, token]);

  // Wrapper ของ fetch ที่เติม Authorization ให้ทุก Request ที่ต้องใช้สิทธิ์
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const requestUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url;
    return fetch(requestUrl, { ...options, headers });
  }, [token]);

  const value = useMemo<AuthContextValue>(() => ({
    isLoading, isAuthenticated: role !== null, role, user, admin, token, login, register, logout, authFetch,
  }), [authFetch, isLoading, role, user, admin, token, login, register, logout]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
