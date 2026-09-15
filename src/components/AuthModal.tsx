import React, { useState } from 'react';
import { X, Mail, Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'LOGIN' | 'REGISTER';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'LOGIN',
}) => {
  const { login, register, loginWithGoogle } = useAuth();
  const [tab, setTab] = useState<'LOGIN' | 'REGISTER'>(defaultTab);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'BUYER' | 'SELLER' | 'DELIVERY_DRIVER'>('BUYER');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      if (tab === 'LOGIN') {
        const res = await login(email, password);
        if (res.success) {
          onClose();
        } else {
          setErrorMsg(res.error || 'Credenciais inválidas.');
        }
      } else {
        if (!name.trim()) {
          setErrorMsg('Nome é obrigatório.');
          setLoading(false);
          return;
        }
        const res = await register(email, password, name, role);
        if (res.success) {
          onClose();
        } else {
          setErrorMsg(res.error || 'Erro ao criar conta.');
        }
      }
    } catch {
      setErrorMsg('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMasterLogin = async () => {
    setEmail('admin@vendplus.com');
    setPassword('VendMaster2025!');
    setTab('LOGIN');
    setLoading(true);
    const res = await login('admin@vendplus.com', 'VendMaster2025!');
    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setErrorMsg(res.error || 'Erro ao conectar como Master.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-xl"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Acesso Seguro VEND+</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">
            {tab === 'LOGIN' ? 'Entre na sua conta' : 'Crie sua conta grátis'}
          </h2>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setTab('LOGIN');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              tab === 'LOGIN' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('REGISTER');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg transition-all ${
              tab === 'REGISTER' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cadastrar
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === 'REGISTER' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Perfil Principal</label>
                <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setRole('BUYER')}
                    className={`py-1.5 rounded-lg border text-center ${
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
                    className={`py-1.5 rounded-lg border text-center ${
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
                    className={`py-1.5 rounded-lg border text-center ${
                      role === 'DELIVERY_DRIVER'
                        ? 'bg-[#0B192C] text-white border-[#0B192C]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Entregador
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
            <input
              id="auth-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Senha</label>
            <input
              id="auth-password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Processando...' : tab === 'LOGIN' ? 'Entrar no VEND+' : 'Criar Conta'}
          </button>
        </form>

        {/* Google / Demo login shortcuts */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <button
            id="auth-google-btn"
            type="button"
            onClick={async () => {
              const res = await loginWithGoogle();
              if (res.success) onClose();
              else if (res.error) setErrorMsg(res.error);
            }}
            className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2"
          >
            <span>Continuar com Google</span>
          </button>

          <button
            id="auth-master-quick-btn"
            type="button"
            onClick={handleQuickMasterLogin}
            className="w-full py-2 text-[11px] font-bold text-purple-700 hover:bg-purple-50 rounded-xl transition-colors border border-purple-200"
          >
            ⚡ Acesso Rápido Master Owner (Admin)
          </button>
        </div>
      </div>
    </div>
  );
};
