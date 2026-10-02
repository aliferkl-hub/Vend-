import React, { useState } from 'react';
import { X, Bell, Check, Sparkles, ShoppingBag, Store, Share2 } from 'lucide-react';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSegment?: 'BUYER' | 'SELLER' | 'AFFILIATE';
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  isOpen,
  onClose,
  defaultSegment = 'BUYER',
}) => {
  const [segment, setSegment] = useState<'BUYER' | 'SELLER' | 'AFFILIATE'>(defaultSegment);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [categoryInterest, setCategoryInterest] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, informe um e-mail válido.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/growth/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || null,
          phone: phone.trim() || null,
          segment,
          categoryInterest: categoryInterest.trim() || null,
        }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao registrar.');
      }
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center shadow-xs">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Você está na lista!</h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Registramos seu interesse com sucesso. Avisaremos você em primeira mão sobre novidades, lançamentos e oportunidades no VEND+.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              Concluir
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                <Bell className="w-3.5 h-3.5" />
                <span>Comunidade VEND+</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">Quero ser avisado</h3>
              <p className="text-xs text-slate-500">
                Estamos construindo a primeira comunidade do VEND+. Deixe seu contato para receber novidades prioritárias.
              </p>
            </div>

            {/* Segment Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSegment('BUYER')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  segment === 'BUYER'
                    ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 font-bold shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 text-xs'
                }`}
              >
                <ShoppingBag className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                <span className="text-[11px]">Comprar</span>
              </button>

              <button
                type="button"
                onClick={() => setSegment('SELLER')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  segment === 'SELLER'
                    ? 'border-sky-500 bg-sky-50/80 text-sky-900 font-bold shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 text-xs'
                }`}
              >
                <Store className="w-4 h-4 mx-auto mb-1 text-sky-600" />
                <span className="text-[11px]">Vender</span>
              </button>

              <button
                type="button"
                onClick={() => setSegment('AFFILIATE')}
                className={`p-2.5 rounded-xl border text-center transition ${
                  segment === 'AFFILIATE'
                    ? 'border-purple-500 bg-purple-50/80 text-purple-900 font-bold shadow-2xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 text-xs'
                }`}
              >
                <Share2 className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                <span className="text-[11px]">Divulgar</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Seu E-mail *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nome (opcional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    WhatsApp (opcional)
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Categoria de maior interesse
                </label>
                <input
                  type="text"
                  value={categoryInterest}
                  onChange={(e) => setCategoryInterest(e.target.value)}
                  placeholder="Ex: Celulares, Informática, Moda, Games"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {error}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {loading ? 'Cadastrando...' : 'Quero receber avisos'}
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-center leading-tight">
                Seus dados serão utilizados apenas para comunicações oficiais do VEND+. Nunca enviamos spam.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
