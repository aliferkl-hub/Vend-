import React, { useState, useEffect } from 'react';
import {
  Share2,
  DollarSign,
  TrendingUp,
  Link as LinkIcon,
  Copy,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Award,
  Wallet,
  Clock,
  Send,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { QrCodeModal } from '../components/QrCodeModal.tsx';
import { marketingService } from '../services/marketingService.ts';

interface AffiliatesViewProps {
  onNavigate: (view: string, param?: any) => void;
  onSelectProduct?: (product: any) => void;
}

export const AffiliatesView: React.FC<AffiliatesViewProps> = ({ onNavigate }) => {
  const { user, authFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);

  // Registration state
  const [registering, setRegistering] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pixKeyType, setPixKeyType] = useState('CPF');
  const [pixKey, setPixKey] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LINKS' | 'COMMISSIONS' | 'SETTINGS'>('OVERVIEW');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalUrl, setQrModalUrl] = useState('');

  // Payout request modal / form
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmountCents, setPayoutAmountCents] = useState<number>(0);
  const [payoutPixKey, setPayoutPixKey] = useState('');
  const [payoutPixType, setPayoutPixType] = useState('CPF');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  const fetchAffiliateProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch('/api/growth/affiliates/me');
      if (res.ok) {
        const data = await res.json();
        setAffiliateData(data);
        if (data.affiliate?.pixKey) {
          setPixKey(data.affiliate.pixKey);
          setPayoutPixKey(data.affiliate.pixKey);
        }
        if (data.affiliate?.pixKeyType) {
          setPixKeyType(data.affiliate.pixKeyType);
          setPayoutPixType(data.affiliate.pixKeyType);
        }
      }

      // Fetch links and commissions if registered
      const [linksRes, commRes] = await Promise.all([
        authFetch('/api/growth/affiliates/links'),
        authFetch('/api/growth/affiliates/commissions'),
      ]);

      if (linksRes.ok) {
        const linksData = await linksRes.json();
        setLinks(linksData.links || []);
      }
      if (commRes.ok) {
        const commData = await commRes.json();
        setCommissions(commData.commissions || []);
      }
    } catch (err) {
      console.error('Error fetching affiliate profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    marketingService.trackEvent({
      eventType: 'page_view',
      landingPath: '/divulgar',
    });
    fetchAffiliateProfile();
  }, [user]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      alert('Você precisa concordar com as regras do programa de afiliados.');
      return;
    }
    setRegistering(true);
    try {
      const res = await authFetch('/api/growth/affiliates/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pixKeyType: pixKey ? pixKeyType : null,
          pixKey: pixKey ? pixKey.trim() : null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchAffiliateProfile();
      } else {
        alert(data.error || 'Erro ao realizar cadastro.');
      }
    } catch {
      alert('Erro de conexão ao cadastrar.');
    } finally {
      setRegistering(false);
    }
  };

  const handleUpdatePixKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixKey.trim()) {
      alert('Informe uma chave PIX válida.');
      return;
    }
    try {
      const res = await authFetch('/api/growth/affiliates/pix-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pixKeyType,
          pixKey: pixKey.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Chave PIX atualizada com sucesso!');
        fetchAffiliateProfile();
      } else {
        alert(data.error || 'Erro ao atualizar chave PIX.');
      }
    } catch {
      alert('Erro de conexão.');
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutError(null);
    setPayoutSuccess(null);
    setPayoutLoading(true);

    try {
      const res = await authFetch('/api/growth/affiliates/payout-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: payoutAmountCents,
          pixKey: payoutPixKey.trim(),
          pixKeyType: payoutPixType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPayoutSuccess(data.message || 'Solicitação de saque enviada com sucesso!');
        await fetchAffiliateProfile();
        setTimeout(() => {
          setIsPayoutModalOpen(false);
          setPayoutSuccess(null);
        }, 2000);
      } else {
        setPayoutError(data.error || 'Erro ao solicitar saque.');
      }
    } catch {
      setPayoutError('Falha de conexão com o servidor.');
    } finally {
      setPayoutLoading(false);
    }
  };

  const affiliate = affiliateData?.affiliate;
  const isRegistered = affiliateData?.isRegistered && affiliate?.status === 'ACTIVE';

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const genericAffiliateUrl = affiliate?.affiliateCode
    ? `${baseUrl}/hub?aff=${affiliate.affiliateCode}`
    : `${baseUrl}/hub`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const openQrModal = (url: string) => {
    setQrModalUrl(url);
    setShowQrModal(true);
  };

  const formatBRL = (cents: number) => {
    return ((cents || 0) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div id="affiliates-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24">
      {/* 1. HEADER SECTION */}
      <section className="bg-gradient-to-br from-[#060D17] via-[#0B1A2F] to-[#0A2239] text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <Award className="w-3.5 h-3.5" />
              <span>Programa Oficial • VEND+ Afiliados</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Divulgue produtos reais. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
                Ganhe comissão garantida via PIX.
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Compartilhe ofertas no WhatsApp, Instagram, TikTok e Facebook. Sem taxa de inscrição, com rastreamento transparente e liberação por código de 4 dígitos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              onClick={() => onNavigate('hub')}
              className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black rounded-2xl text-xs sm:text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-slate-950" />
              <span>Ver Produtos no HUB</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('seja-vendedor')}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold border border-white/15 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Também quero vender</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. MAIN CONTENT (UNAUTHENTICATED OR NOT REGISTERED) */}
      {!user ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-6 shadow-2xs max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <Share2 className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Faça login para se tornar um Divulgador</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Para gerar links rastreáveis e receber suas comissões via PIX com segurança, acesse ou crie sua conta gratuita no VEND+.
            </p>
          </div>
          <button
            onClick={() => onNavigate('login')}
            className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            <span>Entrar ou Cadastrar Gratuitamente</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : !isRegistered ? (
        /* ONBOARDING / ATIVAÇÃO DE AFILIADO COM 1 CLIQUE */
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-2xs max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Ativação Instantânea</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Pronto para faturar como Afiliado VEND+?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
              Olá, <strong>{user.name}</strong>! Ative sua credencial de divulgador agora mesmo. Sem mensalidade, sem burocracia.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center justify-center mb-2">1</span>
              <h4 className="text-xs font-bold text-slate-900">Gere seus Links</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Escolha qualquer produto elegível no HUB e pegue seu link exclusivo ou QR Code.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 text-xs font-black flex items-center justify-center mb-2">2</span>
              <h4 className="text-xs font-bold text-slate-900">Compartilhe</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Publique no WhatsApp, TikTok, Instagram e Facebook com tracking garantido de 30 dias.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-xs font-black flex items-center justify-center mb-2">3</span>
              <h4 className="text-xs font-bold text-slate-900">Receba no PIX</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Após a entrega confirmada por código de 4 dígitos, a comissão é liberada para saque.
              </p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-6 pt-4 border-t border-slate-100">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Dados Opcionais de Recebimento
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Chave PIX</label>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="PHONE">Telefone</option>
                    <option value="EVP">Chave Aleatória (EVP)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Chave PIX (Pode definir depois)</label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="Sua chave PIX para repasses"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-slate-50 border border-slate-200">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-600">
                Concordo com os termos do Programa VEND+ Afiliados. Compreendo que as comissões só são liberadas após a entrega do produto confirmada pelo comprador com o código de 4 dígitos.
              </span>
            </label>

            <button
              type="submit"
              disabled={registering || !acceptedTerms}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {registering ? (
                <span>Ativando credencial...</span>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  <span>Quero Ser um Afiliado VEND+</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* PAINEL COMPLETO DO AFILIADO ATIVO */
        <div className="space-y-8">
          {/* LINK GERAL E ATALHOS */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wide">
                    Afiliado Ativo
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Código: {affiliate.affiliateCode}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  Seu Link Geral de Divulgação
                </h2>
                <p className="text-xs text-slate-500">
                  Qualquer compra feita por quem entrar através deste link atribuirá a comissão para você.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openQrModal(genericAffiliateUrl)}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-slate-600" />
                  <span>QR Code</span>
                </button>
                <button
                  onClick={() => copyToClipboard(genericAffiliateUrl)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {copiedLink ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2 overflow-hidden">
              <span className="text-xs font-mono text-slate-700 truncate select-all">{genericAffiliateUrl}</span>
            </div>
          </div>

          {/* MÉTRICAS REAIS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-sky-500" /> Cliques
              </span>
              <div className="text-2xl font-black text-slate-900">{affiliate.totalClicks || 0}</div>
              <p className="text-[10px] text-slate-400">Tráfego gerado</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-indigo-500" /> Vendas
              </span>
              <div className="text-2xl font-black text-slate-900">{affiliate.totalOrders || 0}</div>
              <p className="text-[10px] text-slate-400">Pedidos atribuídos</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Em Garantia
              </span>
              <div className="text-2xl font-black text-amber-600">
                {formatBRL(affiliate.pendingCommissionCents)}
              </div>
              <p className="text-[10px] text-slate-400">Aguardando entrega</p>
            </div>

            <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-600" /> Disponível
              </span>
              <div className="text-2xl font-black text-emerald-700">
                {formatBRL(affiliate.availableCommissionCents)}
              </div>
              <button
                disabled={affiliate.availableCommissionCents < 1000}
                onClick={() => {
                  setPayoutAmountCents(affiliate.availableCommissionCents);
                  setIsPayoutModalOpen(true);
                }}
                className="text-[11px] font-black text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 disabled:opacity-50 cursor-pointer pt-0.5"
              >
                Solicitar Saque PIX <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Já Pago
              </span>
              <div className="text-2xl font-black text-slate-900">
                {formatBRL(affiliate.paidCommissionCents)}
              </div>
              <p className="text-[10px] text-slate-400">Repasses recebidos</p>
            </div>
          </div>

          {/* TABS DE DETALHES */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setActiveTab('OVERVIEW')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'OVERVIEW'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                Links Rastreáveis ({links.length})
              </button>
              <button
                onClick={() => setActiveTab('COMMISSIONS')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'COMMISSIONS'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                Histórico de Comissões ({commissions.length})
              </button>
              <button
                onClick={() => setActiveTab('SETTINGS')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'SETTINGS'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                Configurar Chave PIX
              </button>
            </div>

            {/* TAB LINKS */}
            {activeTab === 'OVERVIEW' && (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Seus Links Gerados</h3>
                    <p className="text-xs text-slate-500">
                      Links diretos para produtos específicos criados a partir do VEND+ HUB.
                    </p>
                  </div>
                  <button
                    onClick={() => onNavigate('hub')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Escolher Mais Produtos no HUB</span>
                  </button>
                </div>

                {links.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-xs">Você ainda não gerou links específicos de produtos.</p>
                    <button
                      onClick={() => onNavigate('hub')}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Acessar o HUB e gerar meu 1º link
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {links.map((link) => {
                      const fullUrl = link.fullUrl || `${baseUrl}/hub?aff=${affiliate.affiliateCode}&prod=${link.productId || ''}`;
                      return (
                        <div key={link.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {link.productName || 'Link de Divulgação'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono">
                                Código: {link.code}
                              </span>
                            </div>
                            <p className="text-[11px] font-mono text-slate-400 truncate">{fullUrl}</p>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right text-xs">
                              <span className="text-slate-400 block text-[10px]">Cliques</span>
                              <strong className="text-slate-900">{link.clicksCount || 0}</strong>
                            </div>
                            <div className="text-right text-xs">
                              <span className="text-slate-400 block text-[10px]">Vendas</span>
                              <strong className="text-emerald-600">{link.conversionsCount || 0}</strong>
                            </div>

                            <button
                              onClick={() => copyToClipboard(fullUrl)}
                              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                              title="Copiar Link"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openQrModal(fullUrl)}
                              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                              title="Ver QR Code"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB COMISSÕES */}
            {activeTab === 'COMMISSIONS' && (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Extrato de Comissões</h3>
                  <p className="text-xs text-slate-500">
                    Transparência total em cada pedido atribuído pelo seu link.
                  </p>
                </div>

                {commissions.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                    Nenhuma comissão registrada ainda. Comece a divulgar seus links!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Data</th>
                          <th className="py-2.5 px-3">Pedido</th>
                          <th className="py-2.5 px-3">Produto</th>
                          <th className="py-2.5 px-3">Valor da Venda</th>
                          <th className="py-2.5 px-3">Sua Comissão</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {commissions.map((comm) => (
                          <tr key={comm.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 text-slate-500">
                              {new Date(comm.createdAt).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              #{comm.orderId}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{comm.productName || 'Produto'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{formatBRL(comm.orderTotalCents)}</td>
                            <td className="py-2.5 px-3 font-black text-emerald-600">
                              {formatBRL(comm.commissionCents)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  comm.status === 'AVAILABLE'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : comm.status === 'PAID'
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {comm.status === 'AVAILABLE'
                                  ? 'Disponível'
                                  : comm.status === 'PAID'
                                  ? 'Pago'
                                  : 'Garantia 4 Dígitos'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONFIG PIX */}
            {activeTab === 'SETTINGS' && (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs max-w-xl space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900">Chave PIX para Recebimento</h3>
                  <p className="text-xs text-slate-500">
                    Defina onde você deseja receber seus saques de comissão do VEND+.
                  </p>
                </div>

                <form onSubmit={handleUpdatePixKey} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Chave</label>
                    <select
                      value={pixKeyType}
                      onChange={(e) => setPixKeyType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    >
                      <option value="CPF">CPF</option>
                      <option value="CNPJ">CNPJ</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="PHONE">Telefone</option>
                      <option value="EVP">Chave Aleatória (EVP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Chave PIX</label>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Digite sua chave PIX"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Salvar Chave PIX
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE SAQUE PIX */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">Solicitar Saque PIX</h3>
              </div>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {payoutSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200">
                {payoutSuccess}
              </div>
            )}

            {payoutError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-bold border border-rose-200">
                {payoutError}
              </div>
            )}

            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Valor Disponível para Saque
                </label>
                <div className="text-xl font-black text-emerald-600">
                  {formatBRL(affiliate?.availableCommissionCents)}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Saque mínimo: R$ 10,00</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipo de Chave PIX</label>
                <select
                  value={payoutPixType}
                  onChange={(e) => setPayoutPixType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="PHONE">Telefone</option>
                  <option value="EVP">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Chave PIX de Destino</label>
                <input
                  type="text"
                  value={payoutPixKey}
                  onChange={(e) => setPayoutPixKey(e.target.value)}
                  placeholder="Sua chave PIX"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={payoutLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {payoutLoading ? 'Enviando...' : 'Confirmar Saque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      <QrCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        url={qrModalUrl}
        title="QR Code de Divulgação VEND+"
      />
    </div>
  );
};
