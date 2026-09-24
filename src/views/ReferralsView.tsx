import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  QrCode as QrIcon,
  MessageCircle,
  Share2,
  Sparkles,
  ShoppingBag,
  Store,
  Clock,
  ArrowLeft,
  Gift,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { marketingService } from '../services/marketingService.ts';
import { QrCodeModal } from '../components/QrCodeModal.tsx';

interface ReferralsViewProps {
  onNavigate: (view: string, param?: any) => void;
}

export const ReferralsView: React.FC<ReferralsViewProps> = ({ onNavigate }) => {
  const { user, authFetch } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    marketingService.trackEvent({
      eventType: 'page_view',
      landingPath: '/indicacoes',
    });
  }, []);

  const fetchReferralsData = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/marketing/referrals/my');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchReferralsData();
    }
  }, [user]);

  const referralLink = data?.referralLink || (typeof window !== 'undefined' ? `${window.location.origin}/?ref=VEND${user?.id || ''}` : '');

  const handleCopy = async () => {
    const ok = await marketingService.copyToClipboard(referralLink);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsApp = () => {
    const text = 'Venha para o VEND+! Compre, venda e crie sua loja virtual com inteligência artificial e pagamento protegido:';
    marketingService.shareOnWhatsApp(text, referralLink);
  };

  const handleNativeShare = async () => {
    const text = 'Venha para o VEND+! Compre, venda e crie sua loja virtual:';
    const ok = await marketingService.shareNative('Convite VEND+', text, referralLink);
    if (!ok) {
      handleCopy();
    }
  };

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
          <Users className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Programa de Indicação VEND+</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Faça login na sua conta para acessar seu link exclusivo de indicação e acompanhar os amigos cadastrados.
        </p>
        <button
          onClick={() => onNavigate('home')}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
        >
          Voltar para o Início
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('profile')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Perfil
        </button>
        <div className="text-xs text-slate-400">Código: <span className="font-bold text-slate-900">{data?.referralCode || `VEND${user.id}`}</span></div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-sm">
        <div className="max-w-xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-semibold border border-white/10">
            <Gift className="w-3.5 h-3.5" />
            Minhas Indicações
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Convide amigos e acompanhe o crescimento</h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Compartilhe seu link exclusivo com amigos, compradores e lojistas. Cada pessoa que acessar ou se cadastrar
            pelo seu link fica registrada na sua rede.
          </p>
        </div>

        {/* Link Share Box */}
        <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/10 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full bg-slate-950/60 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 truncate select-all">
            {referralLink}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleCopy}
              className="flex-1 sm:flex-initial py-2 px-3 bg-white text-slate-950 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>

            <button
              onClick={handleWhatsApp}
              className="flex-1 sm:flex-initial py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </button>

            <button
              onClick={() => setIsQrModalOpen(true)}
              className="py-2 px-3 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              title="Gerar QR Code"
            >
              <QrIcon className="w-4 h-4" />
            </button>

            {typeof navigator !== 'undefined' && navigator.share && (
              <button
                onClick={handleNativeShare}
                className="py-2 px-3 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                title="Mais opções de compartilhamento"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-sky-500" />
            Pessoas Indicadas
          </div>
          <div className="text-2xl font-black text-slate-900">{data?.stats?.visitorsCount || 0}</div>
          <div className="text-[10px] text-slate-400">Acessos com seu link</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Check className="w-4 h-4 text-emerald-500" />
            Cadastros
          </div>
          <div className="text-2xl font-black text-slate-900">{data?.stats?.registeredCount || 0}</div>
          <div className="text-[10px] text-slate-400">Contas criadas</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Store className="w-4 h-4 text-purple-500" />
            Lojas Criadas
          </div>
          <div className="text-2xl font-black text-slate-900">{data?.stats?.storesCreatedTotal || 0}</div>
          <div className="text-[10px] text-slate-400">Lojas IA ativadas</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-amber-500" />
            Compras
          </div>
          <div className="text-2xl font-black text-slate-900">{data?.stats?.purchasesTotal || 0}</div>
          <div className="text-[10px] text-slate-400">Pedidos concluídos</div>
        </div>
      </div>

      {/* Referrals List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Histórico de Indicações</h3>
          <span className="text-xs text-slate-400 font-medium">
            {data?.referrals?.length || 0} registro(s)
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Carregando indicações...</div>
        ) : !data?.referrals || data.referrals.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-200 mx-auto" />
            <p className="text-xs font-bold text-slate-700">Nenhuma indicação registrada ainda</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Compartilhe seu link exclusivo com amigos no WhatsApp e redes sociais para começar a acompanhar aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-semibold">
                  <th className="pb-3">Indicado</th>
                  <th className="pb-3">Data</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-center">Lojas</th>
                  <th className="pb-3 text-center">Compras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.referrals.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 font-semibold text-slate-900">
                      {item.referredName}
                    </td>
                    <td className="py-3 text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'PURCHASED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.status === 'STORE_CREATED'
                            ? 'bg-purple-50 text-purple-700'
                            : item.status === 'REGISTERED'
                            ? 'bg-sky-50 text-sky-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.status === 'PURCHASED'
                          ? 'Comprou'
                          : item.status === 'STORE_CREATED'
                          ? 'Criou Loja'
                          : item.status === 'REGISTERED'
                          ? 'Cadastrado'
                          : 'Visitou'}
                      </span>
                    </td>
                    <td className="py-3 text-center font-bold text-slate-700">
                      {item.storesCreated || 0}
                    </td>
                    <td className="py-3 text-center font-bold text-slate-700">
                      {item.purchases || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Meu Link de Indicação VEND+"
        subtitle="Escaneie o QR Code para acessar pelo seu convite"
        url={referralLink}
      />
    </div>
  );
};
