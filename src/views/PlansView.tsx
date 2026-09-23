import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  Zap,
  Crown,
  Sparkles,
  Shield,
  ArrowRight,
  Copy,
  QrCode,
  CheckCircle,
  AlertCircle,
  Clock,
  Store,
  TrendingUp,
  X,
  CreditCard,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Plan } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface PlansViewProps {
  onNavigate: (view: string) => void;
}

interface PixPaymentModalData {
  paymentId: number;
  mpPaymentId?: string;
  externalReference: string;
  plan: {
    id: number;
    name: string;
    slug: string;
    priceCents: number;
  };
  amountCents: number;
  amountFormatted: string;
  copiaECola: string;
  qrCodeUrl: string;
  ticketUrl?: string;
  status: string;
}

export const PlansView: React.FC<PlansViewProps> = ({ onNavigate }) => {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);

  // Dedicated Real Mercado Pago Modal state
  const [pixModalData, setPixModalData] = useState<PixPaymentModalData | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // Real-time Polling while modal is open
  useEffect(() => {
    if (!pixModalData || activationSuccess) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch('/api/plans/confirm-pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: pixModalData.paymentId,
            planSlug: pixModalData.plan.slug,
          }),
        });

        const data = await res.json();
        if (res.ok && data.approved) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setActivationSuccess(data.message || `Plano ${pixModalData.plan.name} ativado com sucesso!`);
          await refreshUser();
          setTimeout(() => {
            setPixModalData(null);
            setActivationSuccess(null);
          }, 3500);
        }
      } catch (err) {
        // Silently ignore polling transient errors
      }
    };

    // Poll every 3.5 seconds
    pollingRef.current = setInterval(checkStatus, 3500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pixModalData, activationSuccess]);

  const handleSubscribeClick = async (plan: Plan) => {
    if (!user) {
      alert('Faça login ou crie sua conta para assinar um plano.');
      return;
    }

    if (user.planSlug === plan.slug) {
      alert('Você já está ativo neste plano!');
      return;
    }

    // 1. FREE PLAN: activated immediately
    if (plan.priceCents === 0) {
      setSubscribingSlug(plan.slug);
      try {
        const res = await fetch('/api/plans/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planSlug: plan.slug }),
        });

        const data = await res.json();
        if (res.ok) {
          alert(`Plano ${plan.name} ativado com sucesso!`);
          await refreshUser();
        } else {
          alert(data.error || 'Erro ao ativar plano.');
        }
      } catch {
        alert('Erro de conexão ao processar ativação.');
      } finally {
        setSubscribingSlug(null);
      }
      return;
    }

    // 2. PAID PLAN: opens real Mercado Pago PIX modal
    setSubscribingSlug(plan.slug);
    try {
      const res = await fetch('/api/plans/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          planSlug: plan.slug,
          payer: {
            email: user.email,
            name: user.name,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao gerar pagamento PIX do plano via Mercado Pago.');
        return;
      }

      setPixModalData(data);
      setPixCopied(false);
      setStatusFeedback(null);
      setActivationSuccess(null);
    } catch {
      alert('Erro de conexão ao gerar PIX do plano.');
    } finally {
      setSubscribingSlug(null);
    }
  };

  const handlePayViaCardPreference = async () => {
    if (!pixModalData) return;
    try {
      const res = await fetch('/api/plans/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: pixModalData.plan.id, planSlug: pixModalData.plan.slug }),
      });
      const data = await res.json();
      if (res.ok && data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        alert(data.error || 'Erro ao abrir checkout do Mercado Pago.');
      }
    } catch {
      alert('Erro de conexão com o Mercado Pago.');
    }
  };

  const handleCopyCopiaECola = () => {
    if (!pixModalData) return;
    navigator.clipboard.writeText(pixModalData.copiaECola);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  const handleManualCheckPayment = async () => {
    if (!pixModalData) return;
    setCheckingPayment(true);
    setStatusFeedback(null);

    try {
      const res = await fetch('/api/plans/confirm-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: pixModalData.paymentId,
          planSlug: pixModalData.plan.slug,
        }),
      });

      const data = await res.json();
      if (res.ok && data.approved) {
        setActivationSuccess(data.message || `Plano ${pixModalData.plan.name} ativado com sucesso!`);
        await refreshUser();
        setTimeout(() => {
          setPixModalData(null);
          setActivationSuccess(null);
        }, 3000);
      } else {
        setStatusFeedback(data.message || 'O Mercado Pago ainda está aguardando o pagamento.');
      }
    } catch {
      setStatusFeedback('Erro de conexão ao verificar status no Mercado Pago.');
    } finally {
      setCheckingPayment(false);
    }
  };

  return (
    <div id="plans-view" className="space-y-12 pb-24 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>VEND+ PLANOS — Potencialize sua Operação</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Crie sua loja com IA, reduza taxas e escale suas vendas
        </h1>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Planos transparentes com pagamento integrado ao Mercado Pago (Pix instantâneo e Cartão). Liberação automática após a confirmação.
        </p>
      </div>

      {/* Plan Cards Grid */}
      {loading ? (
        <div className="text-center text-slate-400 py-16 text-sm">Carregando planos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => {
            const isCurrent = user?.planSlug === p.slug;
            const isPro = p.slug === 'pro';
            const isVip = p.slug === 'vip';
            const isStart = p.slug === 'start';
            const isFree = p.slug === 'free';

            const features: string[] = Array.isArray(p.features)
              ? p.features
              : typeof p.features === 'string'
              ? JSON.parse(p.features || '[]')
              : [];

            return (
              <div
                key={p.id}
                id={`plan-card-${p.slug}`}
                className={`relative rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 ${
                  isPro
                    ? 'bg-gradient-to-b from-[#0B192C] to-[#162A45] text-white shadow-xl shadow-sky-950/20 border-2 border-emerald-500 scale-[1.02]'
                    : isVip
                    ? 'bg-gradient-to-b from-purple-950 to-slate-900 text-white shadow-lg border border-purple-500/40'
                    : 'bg-white border border-slate-200 shadow-2xs hover:shadow-md'
                }`}
              >
                {/* Popular Badge */}
                {isPro && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 px-3.5 py-1 rounded-full text-[11px] font-black tracking-wider uppercase shadow-md flex items-center gap-1">
                    <Sparkles className="w-3 h-3 fill-slate-950" />
                    <span>Mais Escolhido</span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                        isPro
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isVip
                          ? 'bg-purple-500/20 text-purple-300'
                          : isStart
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {p.name}
                    </span>
                    {isPro && <Crown className="w-5 h-5 text-emerald-400" />}
                    {isVip && <Zap className="w-5 h-5 text-purple-400" />}
                  </div>

                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black">
                        {(p.priceCents / 100).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                      <span className={`text-xs ${isPro || isVip ? 'text-slate-400' : 'text-slate-500'}`}>
                        /mês
                      </span>
                    </div>
                    <p className={`text-xs mt-1.5 ${isPro || isVip ? 'text-slate-300' : 'text-slate-500'}`}>
                      {p.description}
                    </p>
                  </div>

                  {/* Highlights Pill */}
                  <div
                    className={`p-3 rounded-2xl text-xs space-y-1 ${
                      isPro || isVip ? 'bg-white/5 border border-white/10' : 'bg-slate-50 border border-slate-100'
                    }`}
                  >
                    <div className="flex justify-between font-semibold">
                      <span>Comissão por Venda:</span>
                      <span className={isPro ? 'text-emerald-400 font-bold' : isVip ? 'text-purple-300 font-bold' : 'text-slate-900 font-bold'}>
                        {p.commissionPercent}%
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Anúncios Ativos:</span>
                      <span className="font-bold">
                        {p.maxActiveListings >= 9999 ? 'Ilimitados' : `Até ${p.maxActiveListings}`}
                      </span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 pt-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wider block ${isPro || isVip ? 'text-slate-400' : 'text-slate-400'}`}>
                      Recursos inclusos:
                    </span>
                    <ul className="space-y-2">
                      {features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs leading-snug">
                          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isPro ? 'text-emerald-400' : isVip ? 'text-purple-400' : 'text-emerald-600'}`} />
                          <span className={isPro || isVip ? 'text-slate-200' : 'text-slate-700'}>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-6">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-3 rounded-xl text-xs font-bold bg-slate-200 text-slate-500 cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Seu Plano Atual</span>
                    </button>
                  ) : (
                    <button
                      id={`subscribe-btn-${p.slug}`}
                      disabled={subscribingSlug === p.slug}
                      onClick={() => handleSubscribeClick(p)}
                      className={`w-full py-3 rounded-xl text-xs font-black shadow-sm transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                        isPro
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-emerald-500/25'
                          : isVip
                          ? 'bg-purple-500 hover:bg-purple-400 text-white font-black shadow-purple-500/25'
                          : isFree
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      }`}
                    >
                      <span>
                        {subscribingSlug === p.slug
                          ? 'Processando no Mercado Pago...'
                          : isFree
                          ? 'Ativar Grátis'
                          : 'Assinar com Mercado Pago (Pix)'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REAL MERCADO PAGO PIX MODAL */}
      {pixModalData && (
        <div
          id="pix-payment-modal"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Close */}
            <button
              onClick={() => setPixModalData(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Mercado Pago Oficial — PIX Instantâneo</span>
              </div>
              <h2 className="text-xl font-black text-slate-950 pt-1">
                {pixModalData.plan.name} — {pixModalData.amountFormatted}
              </h2>
              <p className="text-xs text-slate-500">
                Pague pelo aplicativo do seu banco para ativar sua assinatura automaticamente.
              </p>
            </div>

            {/* Status Live Indicator */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-900 text-xs font-bold">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <span>Aguardando pagamento no banco</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-amber-700 font-normal">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Auto-verificando</span>
              </div>
            </div>

            {/* Real Mercado Pago QR Code */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <img
                src={pixModalData.qrCodeUrl}
                alt="QR Code PIX Mercado Pago"
                className="w-52 h-52 object-contain bg-white p-2 rounded-xl shadow-xs"
              />
              <span className="text-[11px] text-slate-500 mt-2 font-medium">
                Abra o app do seu banco e escaneie o QR Code
              </span>
            </div>

            {/* Código PIX Copia e Cola Oficial */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Código Pix Copia e Cola Oficial:</span>
              </div>
              <button
                id="copy-pix-code-btn"
                onClick={handleCopyCopiaECola}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>{pixCopied ? 'Código PIX Copiado com Sucesso!' : 'Copiar Código PIX (Copia e Cola)'}</span>
              </button>
            </div>

            {/* Feedback / Status */}
            {statusFeedback && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-sky-600" />
                <span>{statusFeedback}</span>
              </div>
            )}

            {/* Success Message */}
            {activationSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{activationSuccess}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                id="check-pix-status-btn"
                disabled={checkingPayment || !!activationSuccess}
                onClick={handleManualCheckPayment}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {checkingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Verificando no Mercado Pago...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-slate-950" />
                    <span>Verificar Pagamento Agora</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePayViaCardPreference}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pagar com Cartão / Checkout Pro Mercado Pago</span>
              </button>

              <button
                onClick={() => setPixModalData(null)}
                className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 text-center"
              >
                Fechar e pagar mais tarde
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
