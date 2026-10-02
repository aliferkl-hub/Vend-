import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Share2,
  TrendingUp,
  Store,
  Tag,
  DollarSign,
  ArrowRight,
  Bell,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Flame,
  Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { PromoteProductModal } from '../components/PromoteProductModal.tsx';
import { WaitlistModal } from '../components/WaitlistModal.tsx';
import { marketingService } from '../services/marketingService.ts';

interface HubViewProps {
  onNavigate: (view: string, param?: any) => void;
  onSelectProduct?: (product: any) => void;
}

export const HubView: React.FC<HubViewProps> = ({ onNavigate, onSelectProduct }) => {
  const { user, authFetch } = useAuth();
  const [hubData, setHubData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [affiliateProfile, setAffiliateProfile] = useState<any>(null);

  // Modals
  const [selectedProductToPromote, setSelectedProductToPromote] = useState<any | null>(null);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const fetchHubData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/growth/hub');
      if (res.ok) {
        const data = await res.json();
        setHubData(data);
      }

      if (user) {
        const affRes = await authFetch('/api/growth/affiliates/me');
        if (affRes.ok) {
          const affData = await affRes.json();
          if (affData.isRegistered) {
            setAffiliateProfile(affData.affiliate);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching Hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    marketingService.trackEvent({
      eventType: 'page_view',
      landingPath: '/hub',
    });
    fetchHubData();
  }, [user]);

  const eligibleProducts = hubData?.eligibleProducts || [];
  const campaigns = hubData?.campaigns || [];
  const stores = hubData?.eligibleStores || [];
  const isEmpty = hubData?.isEmpty || eligibleProducts.length === 0;

  return (
    <div id="hub-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 pb-24">
      {/* 1. HERO BANNER DO HUB */}
      <section className="bg-gradient-to-br from-[#060D17] via-[#0B1A2F] to-[#0A2239] text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Share2 className="w-3.5 h-3.5" />
              <span>VEND+ HUB • Centro de Oportunidades & Divulgação</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Divulgue produtos reais. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
                Fature comissões diretas via PIX.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Escolha produtos elegíveis da rede VEND+, gere links rastreáveis para suas redes sociais e receba repasses seguros por vendas confirmadas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            {affiliateProfile ? (
              <button
                onClick={() => onNavigate('affiliates-dashboard')}
                className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-2xl text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Award className="w-4 h-4 text-slate-950" />
                <span>Meu Painel de Afiliado</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onNavigate('affiliates')}
                className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-2xl text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Seja um Afiliado VEND+</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setIsWaitlistOpen(true)}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold border border-white/15 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Receber Alertas de Produtos</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. CAMPANHAS ATIVAS DE GROWTH */}
      {campaigns.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-black text-slate-900">Campanhas Oficiais em Andamento</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((camp: any) => (
              <div
                key={camp.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition space-y-2"
              >
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">
                  {camp.targetAudience === 'SELLERS' ? 'Vendedores' : camp.targetAudience === 'AFFILIATES' ? 'Afiliados' : 'Geral'}
                </span>
                <h3 className="text-sm font-bold text-slate-900">{camp.name}</h3>
                <p className="text-xs text-slate-500">
                  {camp.benefitValue || 'Benefícios especiais para os primeiros parceiros da comunidade VEND+.'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. VITRINE DE PRODUTOS ELEGÍVEIS */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>Produtos Disponíveis para Divulgação ({eligibleProducts.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Produtos cadastrados por vendedores verificados com comissão garantida por venda.
            </p>
          </div>

          <button
            onClick={() => onNavigate('search')}
            className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 self-start sm:self-auto"
          >
            Ver todo o marketplace <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isEmpty ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-16 text-center space-y-4 shadow-2xs max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <Store className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900">
                Os primeiros produtos VEND+ aparecerão aqui em breve
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
                Estamos começando a rede de divulgação VEND+. Faça parte dos primeiros lojistas a publicar ou deixe seu contato para ser avisado assim que novos itens forem listados.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setIsWaitlistOpen(true)}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span>Quero ser avisado</span>
              </button>

              <button
                onClick={() => onNavigate('seja-vendedor')}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Store className="w-4 h-4" />
                <span>Cadastrar Minha Loja</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {eligibleProducts.map((prod: any) => {
              const formattedPrice = (prod.priceCents / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              });
              const formattedCommission = (prod.estimatedCommissionCents / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              });

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition overflow-hidden flex flex-col justify-between group"
                >
                  <div
                    onClick={() => onSelectProduct && onSelectProduct(prod)}
                    className="cursor-pointer"
                  >
                    <div className="aspect-square bg-slate-100 overflow-hidden relative">
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-bold">
                          Sem foto
                        </div>
                      )}

                      <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-xs text-emerald-400 text-[10px] font-black tracking-wide border border-white/10">
                        {prod.effectiveCommissionPercent}% Comissão
                      </div>
                    </div>

                    <div className="p-4 space-y-1.5">
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-sky-600 transition-colors">
                        {prod.name}
                      </h3>
                      <div className="text-base font-black text-slate-900">{formattedPrice}</div>
                      <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <span>Você ganha:</span>
                        <strong className="text-xs">{formattedCommission}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      type="button"
                      onClick={() => setSelectedProductToPromote(prod)}
                      className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Divulgar Produto</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. LOJAS PARCEIRAS */}
      {stores.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-purple-600" />
                <span>Lojas Oficiais da Rede VEND+</span>
              </h2>
              <p className="text-xs text-slate-500">Vitrines virtuais ativas e verificadas</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {stores.map((st: any) => (
              <div
                key={st.id}
                onClick={() => onNavigate('store-front', st.slug)}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition cursor-pointer flex items-center gap-3 group"
              >
                <img
                  src={st.logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${st.slug}`}
                  alt={st.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-purple-600 transition-colors">
                    {st.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate">{st.category || 'Loja Oficial'}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. SEGURANÇA E REGRAS FINANCEIRAS */}
      <section className="bg-slate-100 rounded-3xl p-6 sm:p-8 border border-slate-200 text-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          <span>Transparência e Regras Financeiras VEND+</span>
        </div>
        <h3 className="text-lg sm:text-xl font-black text-slate-900">
          Como funciona a remuneração de afiliados?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600 pt-1">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
            <strong className="text-slate-900 block text-xs">1. Divulgação com link próprio</strong>
            <p>Seus links registram cliques e atribuem o comprador com modelo de último clique válido.</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
            <strong className="text-slate-900 block text-xs">2. Garantia de entrega 4 dígitos</strong>
            <p>O dinheiro fica protegido no escrow e a comissão se torna disponível logo após a confirmação da entrega.</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-1">
            <strong className="text-slate-900 block text-xs">3. Repasse direto via PIX</strong>
            <p>Solicite o recebimento no seu painel com repasse transparente direto na sua chave PIX.</p>
          </div>
        </div>
      </section>

      {/* Modals */}
      {selectedProductToPromote && (
        <PromoteProductModal
          isOpen={true}
          onClose={() => setSelectedProductToPromote(null)}
          product={selectedProductToPromote}
          affiliateCode={affiliateProfile?.affiliateCode}
        />
      )}

      <WaitlistModal
        isOpen={isWaitlistOpen}
        onClose={() => setIsWaitlistOpen(false)}
        defaultSegment="AFFILIATE"
      />
    </div>
  );
};
