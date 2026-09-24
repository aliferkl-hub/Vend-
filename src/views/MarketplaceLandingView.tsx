import React, { useEffect } from 'react';
import {
  ShoppingBag,
  ShieldCheck,
  Truck,
  ArrowRight,
  TrendingUp,
  CreditCard,
  MessageCircle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { ShareBar } from '../components/ShareBar.tsx';
import { marketingService } from '../services/marketingService.ts';

interface MarketplaceLandingViewProps {
  onNavigate: (view: string, param?: any) => void;
}

export const MarketplaceLandingView: React.FC<MarketplaceLandingViewProps> = ({ onNavigate }) => {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://vendmais.com/marketplace';

  useEffect(() => {
    marketingService.trackEvent({
      eventType: 'page_view',
      landingPath: '/marketplace',
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          Marketplace com Pagamento Seguro & Proteção Total
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
          VENDA. COMPRE. <br className="hidden sm:inline" />
          <span className="text-emerald-400">NEGOCIE. ENTREGUE.</span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          O VEND+ conecta compradores e vendedores locais com intermediação financeira Mercado Pago e liberação do dinheiro
          somente após a entrega confirmada por código de 4 dígitos.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('home')}
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
          >
            <span>Começar agora</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('sell')}
            className="w-full sm:w-auto px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition border border-white/10 flex items-center justify-center gap-2"
          >
            <span>Começar a vender</span>
          </button>
        </div>

        {/* Share Section */}
        <div className="max-w-md mx-auto pt-6 text-left">
          <ShareBar
            title="VEND+ Marketplace"
            shareText="Confira o VEND+ Marketplace: compre, venda e negocie com segurança e código de 4 dígitos:"
            url={currentUrl}
            type="MARKETPLACE"
          />
        </div>
      </div>

      {/* Pillars Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Comprar */}
        <div className="bg-slate-800/80 border border-slate-700/60 p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Comprar</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Encontre produtos novos e seminovos perto de você. Pague com Pix ou cartão de forma 100% protegida.
          </p>
        </div>

        {/* Vender */}
        <div className="bg-slate-800/80 border border-slate-700/60 p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Vender</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cadastre seus itens em segundos. Comissão justa e transparente com recebimento direto via Pix após entrega.
          </p>
        </div>

        {/* Negociar */}
        <div className="bg-slate-800/80 border border-slate-700/60 p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Negociar</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Faça contrapropostas diretas e chegue ao melhor valor em tempo real com o vendedor sem intermediários.
          </p>
        </div>

        {/* Entregar */}
        <div className="bg-slate-800/80 border border-slate-700/60 p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Código 4 Dígitos</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            O valor fica em garantia (escrow) e só é transferido ao vendedor quando o código de entrega é validado.
          </p>
        </div>
      </div>

      {/* Safety & Payments Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-12">
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              Segurança em Primeiro Lugar
            </div>
            <h2 className="text-2xl sm:text-3xl font-black">Pagamento Protegido até o Fim</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              O comprador não corre o risco de pagar e não receber. O vendedor tem a certeza de que o valor já está
              garantido no sistema antes de despachar o produto.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pt-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Checkout Oficial Mercado Pago</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Garantia de 4 dígitos na entrega</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Sem fraudes de comprovante falso</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Repasse automático após validação</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 w-full sm:w-80 p-6 bg-slate-900 rounded-2xl border border-slate-700 text-center space-y-4">
            <div className="text-xs font-bold text-slate-400">Pronto para começar?</div>
            <div className="text-xl font-black text-white">Junte-se ao VEND+</div>
            <button
              onClick={() => onNavigate('home')}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
            >
              Entrar no Marketplace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
