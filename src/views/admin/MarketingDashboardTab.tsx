import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Store,
  Package,
  ShoppingBag,
  Link,
  Plus,
  Copy,
  Check,
  QrCode as QrIcon,
  RefreshCw,
  ExternalLink,
  Share2,
  Filter,
  ArrowRight,
  Sparkles,
  MessageCircle,
  Globe,
  Video,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { marketingService } from '../../services/marketingService.ts';
import { QrCodeModal } from '../../components/QrCodeModal.tsx';

export const MarketingDashboardTab: React.FC = () => {
  const { authFetch } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Campaign Form State
  const [campaignName, setCampaignName] = useState('');
  const [campaignSource, setCampaignSource] = useState('instagram');
  const [campaignMedium, setCampaignMedium] = useState('social');
  const [campaignContent, setCampaignContent] = useState('');
  const [campaignDestination, setCampaignDestination] = useState('/marketplace');
  const [customDestination, setCustomDestination] = useState('');
  const [campaignIdInput, setCampaignIdInput] = useState('');
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [createdCampaignResult, setCreatedCampaignResult] = useState<any | null>(null);

  // QR Modal
  const [qrModalUrl, setQrModalUrl] = useState<string | null>(null);
  const [qrModalTitle, setQrModalTitle] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const fetchMarketingData = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/marketing/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching marketing dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketingData();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim() || !campaignSource.trim()) return;

    setCreatingCampaign(true);
    try {
      const dest = campaignDestination === 'custom' ? customDestination : campaignDestination;
      const res = await authFetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName.trim(),
          source: campaignSource.trim(),
          medium: campaignMedium.trim(),
          content: campaignContent.trim() || undefined,
          destination: dest || '/',
          campaignId: campaignIdInput.trim() || undefined,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setCreatedCampaignResult(result);
        setCampaignName('');
        setCampaignContent('');
        setCampaignIdInput('');
        fetchMarketingData();
      } else {
        const err = await res.json();
        alert(err.error || 'Erro ao criar campanha');
      }
    } catch (err: any) {
      alert('Falha na requisição de criação de campanha');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleCopy = async (url: string) => {
    const ok = await marketingService.copyToClipboard(url);
    if (ok) {
      setCopiedLink(url);
      setTimeout(() => setCopiedLink(null), 2500);
    }
  };

  const getSourceIcon = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes('whatsapp')) return <MessageCircle className="w-4 h-4 text-emerald-500" />;
    if (s.includes('instagram')) return <Share2 className="w-4 h-4 text-pink-500" />;
    if (s.includes('tiktok')) return <Video className="w-4 h-4 text-slate-800" />;
    if (s.includes('youtube')) return <Video className="w-4 h-4 text-red-500" />;
    if (s.includes('google')) return <Globe className="w-4 h-4 text-blue-500" />;
    if (s.includes('referral') || s.includes('indica')) return <Users className="w-4 h-4 text-purple-500" />;
    return <Link className="w-4 h-4 text-slate-400" />;
  };

  const m = data?.metrics || {};
  const funnel = data?.funnel || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            Marketing VEND+ & Aquisição
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rastreamento de campanhas com UTM, canais de aquisição, funil e conversão em tempo real.
          </p>
        </div>

        <button
          onClick={fetchMarketingData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Métricas
        </button>
      </div>

      {/* 1. Real Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-500" />
            Visitantes Únicos
          </div>
          <div className="text-2xl font-black text-slate-900">{m.uniqueVisitors || 0}</div>
          <div className="text-[10px] text-slate-400">{m.totalPageViews || 0} visualizações totais</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            Cadastros Totais
          </div>
          <div className="text-2xl font-black text-slate-900">{m.totalUsers || 0}</div>
          <div className="text-[10px] text-slate-400">
            {m.sellersCount || 0} vendedores · {m.buyersCount || 0} compradores
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-purple-500" />
            Lojas Criadas
          </div>
          <div className="text-2xl font-black text-slate-900">{m.storesCreated || 0}</div>
          <div className="text-[10px] text-slate-400">{m.productsPublished || 0} produtos ativos</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
            Pedidos & Conversões
          </div>
          <div className="text-2xl font-black text-slate-900">{m.paidOrders || 0}</div>
          <div className="text-[10px] text-slate-400">de {m.totalOrders || 0} pedidos criados</div>
        </div>
      </div>

      {/* 2. Real Marketing Funnel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-sky-600" />
            Funil de Conversão Real
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">
            Conversão Geral: <strong>{funnel?.conversionRates?.overall || 0}%</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {/* Step 1: Visitante */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1 text-center relative">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. Visitante</div>
            <div className="text-xl font-black text-slate-900">{funnel.visitors || 0}</div>
            <div className="text-[10px] text-slate-400">Sessões registradas</div>
          </div>

          {/* Step 2: Cadastro */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1 text-center relative">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2. Cadastro</div>
            <div className="text-xl font-black text-slate-900">{funnel.signups || 0}</div>
            <div className="text-[10px] text-emerald-600 font-bold">
              {funnel?.conversionRates?.visitorToSignup || 0}% do passo anterior
            </div>
          </div>

          {/* Step 3: Primeira Ação */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1 text-center relative">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3. Primeira Ação</div>
            <div className="text-xl font-black text-slate-900">{funnel.firstAction || 0}</div>
            <div className="text-[10px] text-emerald-600 font-bold">
              {funnel?.conversionRates?.signupToFirstAction || 0}% do passo anterior
            </div>
          </div>

          {/* Step 4: Loja / Produto */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1 text-center relative">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">4. Loja / Catálogo</div>
            <div className="text-xl font-black text-slate-900">{funnel.storeOrProduct || 0}</div>
            <div className="text-[10px] text-emerald-600 font-bold">
              {funnel?.conversionRates?.firstActionToStore || 0}% do passo anterior
            </div>
          </div>

          {/* Step 5: Compra */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1 text-center relative">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">5. Compra Concluída</div>
            <div className="text-xl font-black text-emerald-600">{funnel.purchases || 0}</div>
            <div className="text-[10px] text-emerald-600 font-bold">
              {funnel?.conversionRates?.storeToPurchase || 0}% do passo anterior
            </div>
          </div>
        </div>
      </div>

      {/* 3. Real Breakdown by Channel / Source */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-600" />
          Desempenho por Canal de Aquisição
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(data?.byChannel || []).map((ch: any) => (
            <div
              key={ch.channel}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 capitalize flex items-center gap-1.5">
                  {getSourceIcon(ch.channel)}
                  {ch.channel === 'user_referral' ? 'Indicação' : ch.channel}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">Canal</span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Visitantes:</span>
                  <strong className="text-slate-900">{ch.visitors}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Cadastros:</span>
                  <strong className="text-slate-900">{ch.signups}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Lojas Criadas:</span>
                  <strong className="text-slate-900">{ch.storesCreated}</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Compras:</span>
                  <strong className="text-emerald-600">{ch.purchases}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Campaign Link Generator */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-sky-600" />
            Criar Link de Campanha (UTM + QR Code)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Gere links rastreáveis com parâmetros UTM padronizados e QR Code para divulgar nas redes sociais e anúncios.
          </p>
        </div>

        <form onSubmit={handleCreateCampaign} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Campanha *</label>
            <input
              type="text"
              required
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Ex: Black Friday 2026, Lançamento Loja IA"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Canal (utm_source) *</label>
            <select
              value={campaignSource}
              onChange={(e) => setCampaignSource(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="facebook">Facebook</option>
              <option value="youtube">YouTube</option>
              <option value="google">Google</option>
              <option value="paid_ads">Anúncios Pagos (Ads)</option>
              <option value="qr_code">QR Code Impresso</option>
              <option value="outro">Outro Canal</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Mídia (utm_medium)</label>
            <select
              value={campaignMedium}
              onChange={(e) => setCampaignMedium(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              <option value="social">Social (Orgânico / Bio / Post)</option>
              <option value="stories">Stories / Reels</option>
              <option value="share">Compartilhamento Direto</option>
              <option value="cpc">Anúncio Pago (CPC/CPA)</option>
              <option value="video">Vídeo</option>
              <option value="qr_code">QR Code</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Página de Destino *</label>
            <select
              value={campaignDestination}
              onChange={(e) => setCampaignDestination(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            >
              <option value="/marketplace">Landing Marketplace (/marketplace)</option>
              <option value="/loja-ia">Landing Loja IA (/loja-ia)</option>
              <option value="/">Página Inicial VEND+ (/)</option>
              <option value="custom">URL Personalizada (Loja ou Produto)</option>
            </select>
          </div>

          {campaignDestination === 'custom' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Caminho Personalizado *</label>
              <input
                type="text"
                required
                value={customDestination}
                onChange={(e) => setCustomDestination(e.target.value)}
                placeholder="/loja/slug-da-loja ou /produto/123"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Conteúdo / Variação (utm_content)</label>
            <input
              type="text"
              value={campaignContent}
              onChange={(e) => setCampaignContent(e.target.value)}
              placeholder="Ex: banner_azul, video_01, stories_promo"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-3 pt-2">
            <button
              type="submit"
              disabled={creatingCampaign}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {creatingCampaign ? 'Gerando Link...' : 'Gerar Link de Campanha'}
            </button>
          </div>
        </form>

        {/* Created Campaign Output Card */}
        {createdCampaignResult && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                Link de Campanha Gerado com Sucesso!
              </span>
              <span className="text-[10px] text-emerald-700 font-mono">
                ID: {createdCampaignResult.campaignId}
              </span>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-emerald-200 font-mono text-xs text-slate-800 break-all select-all">
              {createdCampaignResult.fullUrl}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(createdCampaignResult.fullUrl)}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              >
                {copiedLink === createdCampaignResult.fullUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink === createdCampaignResult.fullUrl ? 'Copiado!' : 'Copiar Link'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setQrModalUrl(createdCampaignResult.fullUrl);
                  setQrModalTitle(createdCampaignResult.name);
                }}
                className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              >
                <QrIcon className="w-3.5 h-3.5" />
                Ver QR Code
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Existing Campaigns Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Campanhas Ativas & Links Rastreáveis</h3>
          <span className="text-xs text-slate-400">
            {data?.campaigns?.length || 0} campanha(s)
          </span>
        </div>

        {!data?.campaigns || data.campaigns.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhuma campanha criada ainda. Utilize o gerador acima para criar seu primeiro link rastreável.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-semibold">
                  <th className="pb-3">Campanha</th>
                  <th className="pb-3">Canal</th>
                  <th className="pb-3">Destino</th>
                  <th className="pb-3 text-center">Cliques</th>
                  <th className="pb-3 text-center">Conversões</th>
                  <th className="pb-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.campaigns.map((camp: any) => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vendmais.com';
                  const params = new URLSearchParams();
                  params.set('utm_source', camp.source);
                  if (camp.medium) params.set('utm_medium', camp.medium);
                  params.set('utm_campaign', camp.campaignId);
                  if (camp.content) params.set('utm_content', camp.content);
                  const fullUrl = `${origin}${camp.destination}?${params.toString()}`;

                  return (
                    <tr key={camp.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 font-semibold text-slate-900">
                        {camp.name}
                        <div className="text-[10px] text-slate-400 font-mono">{camp.campaignId}</div>
                      </td>
                      <td className="py-3 capitalize flex items-center gap-1">
                        {getSourceIcon(camp.source)}
                        <span>{camp.source}</span>
                      </td>
                      <td className="py-3 text-slate-500 font-mono text-[11px]">
                        {camp.destination}
                      </td>
                      <td className="py-3 text-center font-bold text-slate-700">
                        {camp.clicksCount || 0}
                      </td>
                      <td className="py-3 text-center font-bold text-emerald-600">
                        {camp.conversionsCount || 0}
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopy(fullUrl)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="Copiar Link"
                          >
                            {copiedLink === fullUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => {
                              setQrModalUrl(fullUrl);
                              setQrModalTitle(camp.name);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            title="Gerar QR Code"
                          >
                            <QrIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Recent Real Marketing Events */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">Eventos de Marketing Recentes</h3>

        {!data?.recentEvents || data.recentEvents.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">Nenhum evento registrado ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-semibold">
                  <th className="pb-3">Tipo de Evento</th>
                  <th className="pb-3">Canal (Source)</th>
                  <th className="pb-3">Campanha</th>
                  <th className="pb-3">Página de Entrada</th>
                  <th className="pb-3">Usuário</th>
                  <th className="pb-3 text-right">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentEvents.map((evt: any) => (
                  <tr key={evt.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 font-bold">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${
                          evt.event_type === 'purchase_completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : evt.event_type === 'signup'
                            ? 'bg-sky-100 text-sky-800'
                            : evt.event_type === 'store_created'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {evt.event_type}
                      </span>
                    </td>
                    <td className="py-2.5 capitalize">{evt.source || 'direto'}</td>
                    <td className="py-2.5 font-mono text-[11px] text-slate-600">{evt.campaign || '-'}</td>
                    <td className="py-2.5 font-mono text-[11px] text-slate-600">{evt.landing_path || '/'}</td>
                    <td className="py-2.5 text-slate-800">{evt.user_name || 'Visitante Anônimo'}</td>
                    <td className="py-2.5 text-right text-slate-400 text-[11px]">
                      {new Date(evt.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {qrModalUrl && (
        <QrCodeModal
          isOpen={Boolean(qrModalUrl)}
          onClose={() => setQrModalUrl(null)}
          title={qrModalTitle || 'Link de Campanha VEND+'}
          subtitle="Aponte a câmera do celular para abrir o link com parâmetros UTM"
          url={qrModalUrl}
        />
      )}
    </div>
  );
};
