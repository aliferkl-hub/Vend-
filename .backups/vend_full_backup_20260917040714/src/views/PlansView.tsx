import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Plan } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface PlansViewProps {
  onNavigate: (view: string) => void;
}

interface PixPaymentModalData {
  paymentId: number;
  externalReference: string;
  pixKey: string;
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
  status: string;
}

export const PlansView: React.FC<PlansViewProps> = ({ onNavigate }) => {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribingSlug, setSubscribingSlug] = useState<string | null>(null);

  // Dedicated PIX Modal state exclusively for plan subscriptions
  const [pixModalData, setPixModalData] = useState<PixPaymentModalData | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [confirmingPix, setConfirmingPix] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

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

    // 2. PAID PLAN: opens dedicated PIX modal with key 11973479473 & QR Code
    setSubscribingSlug(plan.slug);
    try {
      const res = await fetch('/api/plans/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, planSlug: plan.slug }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao gerar pagamento PIX do plano.');
        return;
      }

      setPixModalData(data);
      setPixCopied(false);
      setKeyCopied(false);
      setActivationSuccess(null);
    } catch {
      alert('Erro de conexão ao gerar PIX do plano.');
    } finally {
      setSubscribingSlug(null);
    }
  };

  const handleCopyCopiaECola = () => {
    if (!pixModalData) return;
    navigator.clipboard.writeText(pixModalData.copiaECola);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  const handleCopyPixKey = () => {
    if (!pixModalData) return;
    navigator.clipboard.writeText(pixModalData.pixKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 3000);
  };

  const handleConfirmPixPayment = async () => {
    if (!pixModalData) return;
    setConfirmingPix(true);
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
      if (res.ok) {
        setActivationSuccess(data.message || `Plano ${pixModalData.plan.name} ativado com sucesso!`);
        await refreshUser();
        setTimeout(() => {
          setPixModalData(null);
          setActivationSuccess(null);
        }, 2500);
      } else {
        alert(data.error || 'Não foi possível confirmar o pagamento. Tente novamente.');
      }
    } catch {
      alert('Erro de conexão ao validar pagamento.');
    } finally {
      setConfirmingPix(false);
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
          Planos transparentes pensados para quem quer começar ou transformar seu negócio em uma máquina de vendas com Inteligência Artificial e fornecedores integrados.
        </p>
      </div>

      {/* Plan Cards Grid */}
      {loading ? (
        <div className="text-center text-slate-400 py-16 text-sm">Carregando planos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = user?.planSlug === plan.slug;
            const isLegendary = plan.slug === 'lendario';
            const isPremium = plan.slug === 'premium';
            const isBasic = plan.slug === 'basico';

            const priceFormatted =
              plan.priceCents === 0
                ? 'Grátis'
                : (plan.priceCents / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  });

            return (
              <div
                key={plan.id}
                id={`plan-card-${plan.slug}`}
                className={`rounded-3xl p-6 transition-all flex flex-col justify-between border-2 relative ${
                  isLegendary
                    ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white border-amber-500/80 shadow-2xl'
                    : isPremium
                    ? 'bg-white border-sky-500 shadow-xl ring-2 ring-sky-400/20'
                    : isBasic
                    ? 'bg-white border-emerald-500/50 shadow-md'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                {/* Popular Pill */}
                {isPremium && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-[11px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
                    Mais Popular
                  </div>
                )}
                {isLegendary && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[11px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md">
                    Alta Performance
                  </div>
                )}

                <div className="space-y-5">
                  {/* Badge & Plan Name */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg ${
                        isLegendary
                          ? 'bg-amber-400 text-slate-950'
                          : isPremium
                          ? 'bg-sky-500 text-white'
                          : isBasic
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {plan.name}
                    </span>

                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 border border-emerald-500/40">
                        Plano Atual
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-3xl sm:text-4xl font-black ${
                          isLegendary ? 'text-white' : 'text-slate-950'
                        }`}
                      >
                        {priceFormatted}
                      </span>
                      {plan.priceCents > 0 && (
                        <span
                          className={`text-xs font-semibold ${
                            isLegendary ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          /mês
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-1.5 font-medium ${
                        isLegendary ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      Taxa de comissão por venda: <strong>{plan.commissionPercent}%</strong>
                    </p>
                  </div>

                  {/* Limites e Recursos */}
                  <div className={`pt-4 border-t ${isLegendary ? 'border-slate-800' : 'border-slate-100'} space-y-3 text-xs`}>
                    <div className="font-bold text-[11px] uppercase tracking-wider text-slate-400">
                      Limites & Funcionalidades
                    </div>

                    <div className="flex items-start gap-2">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isLegendary ? 'text-amber-400' : 'text-emerald-500'}`} />
                      <span>
                        Até <strong>{plan.maxActiveListings} anúncios</strong> ativos no marketplace
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isLegendary ? 'text-amber-400' : 'text-emerald-500'}`} />
                      <span>
                        {plan.priceCents === 0
                          ? 'Vitrine padrão no marketplace'
                          : 'Criação de Loja Virtual Própria com IA'}
                      </span>
                    </div>

                    {plan.priceCents > 0 && (
                      <div className="flex items-start gap-2">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isLegendary ? 'text-amber-400' : 'text-emerald-500'}`} />
                        <span>Acesso ao Catálogo Homologado VEND+</span>
                      </div>
                    )}

                    {isPremium || isLegendary ? (
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                        <span>
                          <strong>Suíte Comercial IA:</strong> Copy, títulos SEO, posts & anúncios
                        </span>
                      </div>
                    ) : null}

                    {isLegendary && (
                      <div className="flex items-start gap-2 text-amber-300 font-bold">
                        <Crown className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                        <span>Prioridade máxima no algoritmo e gerente de conta</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-6 mt-4">
                  <button
                    id={`subscribe-plan-btn-${plan.slug}`}
                    disabled={isCurrent || subscribingSlug === plan.slug}
                    onClick={() => handleSubscribeClick(plan)}
                    className={`w-full py-3.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      isCurrent
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                        : isLegendary
                        ? 'bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-slate-950 shadow-lg'
                        : isPremium
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg'
                        : isBasic
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <span>
                      {isCurrent
                        ? 'Seu Plano Atual'
                        : subscribingSlug === plan.slug
                        ? 'Processando...'
                        : plan.priceCents === 0
                        ? 'Permanecer no Grátis'
                        : `Assinar ${plan.name} via PIX`}
                    </span>
                    {!isCurrent && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Value Proposition & Security Notice */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 shadow-xl max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Liberação Imediata via PIX</h4>
              <p className="text-xs text-slate-400 mt-1">
                Ao confirmar o pagamento do plano, os recursos premium são ativados no mesmo instante na sua conta.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Sua Loja Completa em 2 Minutos</h4>
              <p className="text-xs text-slate-400 mt-1">
                A IA cria identidade, banners e cadastra produtos com a sua margem de lucro personalizada.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Sem Fidelidade ou Multas</h4>
              <p className="text-xs text-slate-400 mt-1">
                Alterne ou cancele seu plano quando quiser. Total transparência para o seu negócio crescer.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* DEDICATED PIX PAYMENT MODAL FOR PLANS (Section 4) */}
      {pixModalData && (
        <div
          id="plan-pix-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 relative max-h-[92vh] overflow-y-auto">
            {/* Close */}
            <button
              onClick={() => setPixModalData(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Pagamento do Plano por PIX</span>
              </div>
              <h2 className="text-xl font-black text-slate-950 pt-1">
                {pixModalData.plan.name} — {pixModalData.amountFormatted}
              </h2>
              <p className="text-xs text-slate-500">
                Pague pelo aplicativo do seu banco para ativar sua assinatura.
              </p>
            </div>

            {/* Status: Aguardando Pagamento */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center gap-2 text-amber-900 text-xs font-bold">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <span>Status: Aguardando pagamento</span>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <img
                src={pixModalData.qrCodeUrl}
                alt="QR Code PIX do Plano"
                className="w-52 h-52 object-contain bg-white p-2 rounded-xl shadow-xs"
              />
              <span className="text-[11px] text-slate-400 mt-2 font-medium">
                Aponte a câmera no app do seu banco
              </span>
            </div>

            {/* Chave PIX Oficial */}
            <div className="p-3 bg-slate-100 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Chave PIX do Plano:</span>
                <button
                  onClick={handleCopyPixKey}
                  className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 text-[11px]"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{keyCopied ? 'Copiada!' : 'Copiar Chave'}</span>
                </button>
              </div>
              <div className="font-mono text-xs font-black text-slate-900 bg-white p-2 rounded border border-slate-200 select-all">
                {pixModalData.pixKey}
              </div>
            </div>

            {/* Código PIX Copia e Cola */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">Código Pix Copia e Cola:</span>
              </div>
              <button
                id="copy-pix-code-btn"
                onClick={handleCopyCopiaECola}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-[0.99]"
              >
                <Copy className="w-4 h-4" />
                <span>{pixCopied ? 'Código PIX Copiado com Sucesso!' : 'Copiar Código PIX'}</span>
              </button>
            </div>

            {/* Success Message */}
            {activationSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{activationSuccess}</span>
              </div>
            )}

            {/* Confirmation Button */}
            <div className="pt-2 space-y-2">
              <button
                id="confirm-pix-plan-btn"
                disabled={confirmingPix || !!activationSuccess}
                onClick={handleConfirmPixPayment}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                {confirmingPix ? (
                  <span>Validando e ativando plano...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-slate-950" />
                    <span>Já fiz o PIX — Confirmar e Ativar Plano</span>
                  </>
                )}
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
