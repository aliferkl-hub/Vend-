import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { normalizeEmail } from '../utils/normalizeEmail.ts';
import nativeBridge from '../services/nativeBridge.ts';

interface RegisterData {
  name: string;
  username?: string;
  email: string;
  password: string;
  confirmPassword?: string;
  phone?: string;
  location?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  register: (
    dataOrEmail: RegisterData | string,
    passwordArg?: string,
    nameArg?: string,
    roleArg?: string
  ) => Promise<{ success: boolean; error?: string; code?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string; message?: string; resetToken?: string }>;
  resetPassword: (token: string, newPassword: string, confirmPassword?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; code?: string }>;
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

  // Helper to persist session to both localStorage and nativeBridge.storage (Preferences)
  const persistSession = (u: User | null, t: string | null) => {
    if (u) {
      const serialized = JSON.stringify(u);
      try { localStorage.setItem('vend_user', serialized); } catch {}
      nativeBridge.storage.set('vend_user', serialized).catch(() => {});
    } else {
      try { localStorage.removeItem('vend_user'); } catch {}
      nativeBridge.storage.remove('vend_user').catch(() => {});
    }

    if (t) {
      try { localStorage.setItem('vend_token', t); } catch {}
      nativeBridge.storage.set('vend_token', t).catch(() => {});
    } else {
      try { localStorage.removeItem('vend_token'); } catch {}
      nativeBridge.storage.remove('vend_token').catch(() => {});
    }
  };

  // Restore session from native storage if not already loaded from localStorage
  useEffect(() => {
    if (nativeBridge.isNative() && !user) {
      (async () => {
        try {
          const [savedUserStr, savedToken] = await Promise.all([
            nativeBridge.storage.get('vend_user'),
            nativeBridge.storage.get('vend_token'),
          ]);
          if (savedUserStr) {
            const parsedUser = JSON.parse(savedUserStr);
            setUser(parsedUser);
          }
          if (savedToken) {
            setToken(savedToken);
          }
        } catch {
          // ignore
        }
      })();
    }
  }, [user]);

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
          persistSession(data.user, currentToken || token);
        } else {
          setUser(null);
          setToken(null);
          persistSession(null, null);
        }
      } else if (res.status === 401) {
        // Backend invalidated or session expired - clear client session state
        setUser(null);
        setToken(null);
        persistSession(null, null);
      } else if (res.status >= 500) {
        // Server or database temporary error - DO NOT clear session or falsely show account missing!
        console.warn('[VEND+] Erro temporário do servidor ao checar sessão; mantendo dados locais.');
      }
    } catch (err) {
      console.warn('[VEND+] Verificação de sessão falhou (offline/rede):', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string) => {
    try {
      const cleanEmail = normalizeEmail(email);
      if (!cleanEmail || !password) {
        return {
          success: false,
          code: 'VALIDATION_ERROR',
          error: 'E-mail e senha são obrigatórios.',
        };
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        let errorMsg = 'Não foi possível verificar sua conta agora. Tente novamente.';
        if (data.code === 'USER_NOT_FOUND') {
          errorMsg = 'Conta não encontrada. Verifique o e-mail ou cadastre-se.';
        } else if (data.code === 'INVALID_PASSWORD') {
          errorMsg = 'Senha incorreta. Tente novamente ou redefina sua senha.';
        } else if (data.code === 'DATABASE_ERROR') {
          errorMsg = 'Não foi possível verificar sua conta agora. Tente novamente.';
        } else if (data.code === 'ACCOUNT_BLOCKED') {
          errorMsg = 'Esta conta está bloqueada. Entre em contato com o suporte.';
        } else if (data.code === 'GOOGLE_AUTH_REQUIRED') {
          errorMsg = 'Esta conta foi vinculada via Google. Por favor, utilize o botão "Entrar com Google".';
        } else if (data.error) {
          errorMsg = data.error;
        }

        return {
          success: false,
          code: data.code || 'UNKNOWN_ERROR',
          error: errorMsg,
        };
      }

      if (data.token) {
        setToken(data.token);
      }
      if (data.user) {
        setUser(data.user);
      }
      if (data.user || data.token) {
        persistSession(data.user || null, data.token || null);
      }
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        code: 'DATABASE_ERROR',
        error: 'Não foi possível verificar sua conta agora. Tente novamente.',
      };
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
          email: normalizeEmail(dataOrEmail),
          password: passwordArg || '',
          name: nameArg || '',
          role: roleArg || 'BUYER',
        };
      } else {
        payload = {
          ...dataOrEmail,
          email: normalizeEmail(dataOrEmail.email),
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
        let errorMsg = 'Erro ao criar conta.';
        if (data.code === 'EMAIL_ALREADY_EXISTS') {
          errorMsg = 'Este e-mail já possui uma conta. Faça login.';
        } else if (data.code === 'USERNAME_ALREADY_EXISTS') {
          errorMsg = 'Este nome de usuário já está em uso. Escolha outro.';
        } else if (data.code === 'DATABASE_ERROR') {
          errorMsg = 'Não foi possível verificar sua conta agora. Tente novamente.';
        } else if (data.error) {
          errorMsg = data.error;
        }

        return {
          success: false,
          code: data.code || 'UNKNOWN_ERROR',
          error: errorMsg,
        };
      }

      if (data.token) {
        setToken(data.token);
      }
      if (data.user) {
        setUser(data.user);
      }
      if (data.user || data.token) {
        persistSession(data.user || null, data.token || null);
      }
      return { success: true };
    } catch {
      return {
        success: false,
        code: 'DATABASE_ERROR',
        error: 'Não foi possível verificar sua conta agora. Tente novamente.',
      };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: normalizeEmail(email) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message, resetToken: data.resetToken };
      }
      return { success: false, error: data.error || 'Erro ao processar recuperação de senha.' };
    } catch {
      return { success: false, error: 'Erro de conexão ao solicitar recuperação.' };
    }
  };

  const resetPassword = async (token: string, newPassword: string, confirmPassword?: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Não foi possível redefinir sua senha.' };
    } catch {
      return { success: false, error: 'Erro de conexão ao redefinir senha.' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword?: string) => {
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, error: data.error || 'Não foi possível alterar a senha.' };
    } catch {
      return { success: false, error: 'Erro de rede ao alterar senha.' };
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
          persistSession(data.user, idToken);
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
      persistSession(null, null);
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
        forgotPassword,
        resetPassword,
        changePassword,
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
