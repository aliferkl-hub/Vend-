import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    dataOrEmail: RegisterData | string,
    passwordArg?: string,
    nameArg?: string,
    roleArg?: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Synchronous initialization from localStorage prevents logged-out flicker across page reloads/restarts
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('vend_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('vend_token') || null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Authenticated fetch wrapper that automatically attaches the persistent token & cookies
  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      const currentToken = localStorage.getItem('vend_token') || token;
      const headers = new Headers(init.headers || {});
      if (currentToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${currentToken}`);
      }
      return fetch(input, {
        ...init,
        headers,
        credentials: 'include',
      });
    },
    [token]
  );

  const fetchCurrentUser = useCallback(async () => {
    try {
      const currentToken = localStorage.getItem('vend_token');
      const headers: Record<string, string> = {};
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }

      const res = await fetch('/api/auth/me', {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          try {
            localStorage.setItem('vend_user', JSON.stringify(data.user));
          } catch {}
        } else {
          setUser(null);
          setToken(null);
          try {
            localStorage.removeItem('vend_user');
            localStorage.removeItem('vend_token');
          } catch {}
        }
      } else if (res.status === 401) {
        // Backend invalidated or session expired - clear client session state
        setUser(null);
        setToken(null);
        try {
          localStorage.removeItem('vend_user');
          localStorage.removeItem('vend_token');
        } catch {}
      }
    } catch (err) {
      console.warn('[VEND+] Verificação de sessão:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Conta não encontrada. Verifique seus dados ou cadastre-se.' };
      }

      if (data.token) {
        setToken(data.token);
        localStorage.setItem('vend_token', data.token);
      }
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('vend_user', JSON.stringify(data.user));
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Não foi possível conectar ao servidor. Tente novamente.' };
    }
  };

  const register = async (
    dataOrEmail: RegisterData | string,
    passwordArg?: string,
    nameArg?: string,
    roleArg?: string
  ) => {
    try {
      let payload: RegisterData;
      if (typeof dataOrEmail === 'string') {
        payload = {
          email: dataOrEmail.trim().toLowerCase(),
          password: passwordArg || '',
          name: nameArg || '',
          role: roleArg || 'BUYER',
        };
      } else {
        payload = {
          ...dataOrEmail,
          email: (dataOrEmail.email || '').trim().toLowerCase(),
        };
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Erro ao criar conta.' };
      }

      if (data.token) {
        setToken(data.token);
        localStorage.setItem('vend_token', data.token);
      }
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('vend_user', JSON.stringify(data.user));
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Não foi possível conectar ao servidor. Tente novamente.' };
    }
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();

      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setToken(idToken);
          localStorage.setItem('vend_token', idToken);
          localStorage.setItem('vend_user', JSON.stringify(data.user));
          return { success: true };
        }
      }
      return { success: false, error: 'Não foi possível autenticar com Google no banco de dados.' };
    } catch (err: any) {
      console.error('Google sign in error:', err);
      return { success: false, error: err.message || 'Erro ao conectar com Google.' };
    }
  };

  const logout = async () => {
    try {
      const currentToken = localStorage.getItem('vend_token') || token;
      const headers: Record<string, string> = {};
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }

      await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Logout warning:', err);
    } finally {
      await firebaseSignOut(auth).catch(() => {});
      localStorage.removeItem('vend_token');
      localStorage.removeItem('vend_user');
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
