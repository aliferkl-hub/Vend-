import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, ShieldCheck, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'LOGIN' | 'REGISTER';
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'LOGIN',
}) => {
  const { login, register, forgotPassword, resetPassword, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<AuthMode>(defaultTab);

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'BUYER' | 'SELLER' | 'DELIVERY_DRIVER'>('BUYER');

  // Password reset flow states
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Status & feedback states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetAllFields = () => {
    setErrorMsg(null);
    setErrorCode(null);
    setSuccessMsg(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAllFields();
    setLoading(true);

    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        onClose();
      } else {
        setErrorCode(res.code || null);
        setErrorMsg(res.error || 'Não foi possível verificar sua conta agora. Tente novamente.');
      }
    } catch {
      setErrorCode('DATABASE_ERROR');
      setErrorMsg('Não foi possível verificar sua conta agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAllFields();

    if (!name.trim()) {
      setErrorCode('VALIDATION_ERROR');
      setErrorMsg('Nome é obrigatório.');
      return;
    }

    if (password.length < 6) {
      setErrorCode('VALIDATION_ERROR');
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorCode('VALIDATION_ERROR');
      setErrorMsg('As senhas não coincidem. Verifique e tente novamente.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: name.trim(),
        username: username.trim() || undefined,
        email: email.trim(),
        password,
        confirmPassword,
        role,
      });

      if (res.success) {
        onClose();
      } else {
        setErrorCode(res.code || null);
        setErrorMsg(res.error || 'Erro ao criar conta.');
      }
    } catch {
      setErrorCode('DATABASE_ERROR');
      setErrorMsg('Não foi possível verificar sua conta agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAllFields();

    if (!email.trim()) {
      setErrorMsg('Informe seu e-mail para continuar.');
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      if (res.success) {
        setSuccessMsg(res.message || 'Instruções de recuperação geradas com sucesso.');
        if (res.resetToken) {
          setResetToken(res.resetToken);
          // Transition directly to reset password mode for seamless recovery
          setMode('RESET_PASSWORD');
        }
      } else {
        setErrorMsg(res.error || 'Não foi possível gerar a recuperação.');
      }
    } catch {
      setErrorMsg('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAllFields();

    if (!resetToken.trim() || !newPassword) {
      setErrorMsg('Token e nova senha são obrigatórios.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(resetToken.trim(), newPassword, confirmNewPassword);
      if (res.success) {
        setSuccessMsg('Senha alterada com sucesso! Agora você pode entrar com sua nova senha.');
        setPassword('');
        setConfirmPassword('');
        setMode('LOGIN');
      } else {
        setErrorMsg(res.error || 'Falha ao redefinir a senha.');
      }
    } catch {
      setErrorMsg('Erro de conexão ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 relative max-h-[92vh] overflow-y-auto">
        <button
          id="auth-close-btn"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Acesso Seguro VEND+</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">
            {mode === 'LOGIN' && 'Entre na sua conta'}
            {mode === 'REGISTER' && 'Crie sua conta grátis'}
            {mode === 'FORGOT_PASSWORD' && 'Recuperar Senha'}
            {mode === 'RESET_PASSWORD' && 'Definir Nova Senha'}
          </h2>
        </div>

        {/* Tab switch between Login and Register */}
        {(mode === 'LOGIN' || mode === 'REGISTER') && (
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              id="auth-tab-login"
              type="button"
              onClick={() => {
                setMode('LOGIN');
                resetAllFields();
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'LOGIN' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Entrar
            </button>
            <button
              id="auth-tab-register"
              type="button"
              onClick={() => {
                setMode('REGISTER');
                resetAllFields();
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'REGISTER' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cadastrar
            </button>
          </div>
        )}

        {/* Success message banner */}
        {successMsg && (
          <div className="p-3 rounded-xl text-xs flex items-start gap-2 border bg-emerald-50 border-emerald-200 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1 font-semibold">{successMsg}</div>
          </div>
        )}

        {/* Error message banner with clear contextual actions */}
        {errorMsg && (
          <div
            id="auth-error-alert"
            className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
              errorCode === 'USER_NOT_FOUND'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : errorCode === 'INVALID_PASSWORD'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : errorCode === 'EMAIL_ALREADY_EXISTS'
                ? 'bg-sky-50 border-sky-200 text-sky-900'
                : errorCode === 'TOO_MANY_REQUESTS'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">{errorMsg}</span>
              {errorCode === 'USER_NOT_FOUND' && mode === 'LOGIN' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('REGISTER');
                    resetAllFields();
                  }}
                  className="block mt-1 font-bold text-sky-700 hover:underline"
                >
                  Criar conta com este e-mail →
                </button>
              )}
            </div>
          </div>
        )}

        {/* MODE: LOGIN */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                id="auth-email-input"
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">Senha</label>
                <button
                  id="auth-forgot-password-link"
                  type="button"
                  onClick={() => {
                    setMode('FORGOT_PASSWORD');
                    resetAllFields();
                  }}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-700 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <input
                id="auth-password-input"
                type="password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500 disabled:opacity-60"
              />
            </div>

            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verificando credenciais...' : 'Entrar no VEND+'}
            </button>
          </form>
        )}

        {/* MODE: REGISTER */}
        {mode === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nome</label>
              <input
                id="auth-register-name"
                type="text"
                required
                disabled={loading}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nome de usuário</label>
              <input
                id="auth-register-username"
                type="text"
                disabled={loading}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: joao_silva (opcional)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                id="auth-register-email"
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Perfil Principal</label>
              <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRole('BUYER')}
                  className={`py-1.5 rounded-lg border text-center transition-all ${
                    role === 'BUYER'
                      ? 'bg-[#0B192C] text-white border-[#0B192C]'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Comprador
                </button>
                <button
                  type="button"
                  onClick={() => setRole('SELLER')}
                  className={`py-1.5 rounded-lg border text-center transition-all ${
                    role === 'SELLER'
                      ? 'bg-[#0B192C] text-white border-[#0B192C]'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Vendedor
                </button>
                <button
                  type="button"
                  onClick={() => setRole('DELIVERY_DRIVER')}
                  className={`py-1.5 rounded-lg border text-center transition-all ${
                    role === 'DELIVERY_DRIVER'
                      ? 'bg-[#0B192C] text-white border-[#0B192C]'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Entregador
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Senha</label>
                <input
                  id="auth-register-password"
                  type="password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 dígitos"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirmar senha</label>
                <input
                  id="auth-register-confirm-password"
                  type="password"
                  required
                  disabled={loading}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <button
              id="auth-submit-register-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Criando conta permanente...' : 'Criar conta'}
            </button>
          </form>
        )}

        {/* MODE: FORGOT PASSWORD */}
        {mode === 'FORGOT_PASSWORD' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
            <p className="text-xs text-slate-600 leading-relaxed">
              Informe o e-mail cadastrado na sua conta para gerar as instruções de redefinição de senha segura.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email cadastrado</label>
              <input
                type="email"
                required
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0B192C] hover:bg-slate-800 text-white font-black rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                resetAllFields();
              }}
              className="w-full py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao login</span>
            </button>
          </form>
        )}

        {/* MODE: RESET PASSWORD */}
        {mode === 'RESET_PASSWORD' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
            <p className="text-xs text-slate-600 leading-relaxed">
              Digite o código de recuperação e defina sua nova senha de acesso.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Código / Token de Recuperação</label>
              <input
                type="text"
                required
                disabled={loading}
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Código recebido"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nova Senha</label>
              <input
                type="password"
                required
                disabled={loading}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 dígitos"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirmar Nova Senha</label>
              <input
                type="password"
                required
                disabled={loading}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'Redefinindo...' : 'Salvar Nova Senha'}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('LOGIN');
                resetAllFields();
              }}
              className="w-full py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao login</span>
            </button>
          </form>
        )}

        {/* Social / External Authentication (Preserved for convenience) */}
        {(mode === 'LOGIN' || mode === 'REGISTER') && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <button
              id="auth-google-btn"
              type="button"
              disabled={loading}
              onClick={async () => {
                if (loading) return;
                resetAllFields();
                setLoading(true);
                try {
                  const res = await loginWithGoogle();
                  if (res.success) onClose();
                  else if (res.error) setErrorMsg(res.error);
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Continuar com Google</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
