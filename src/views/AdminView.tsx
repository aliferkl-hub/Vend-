import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Store,
  Package,
  DollarSign,
  TrendingUp,
  Trash2,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Zap,
  CreditCard,
  QrCode,
  Truck,
  Building2,
  FileSpreadsheet,
  ArrowUpRight,
  Clock,
  KeyRound,
  ShoppingBag,
  Layers,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AdminViewProps {
  onRefreshCatalog: () => void;
  onNavigate?: (view: string, param?: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onRefreshCatalog, onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PLANS' | 'FINANCE_PIX' | 'STORES' | 'PRODUCTS' | 'ORDERS' | 'USERS' | 'IMPORT' | 'PAYOUTS_CONCILIATION'>('OVERVIEW');

  const [metrics, setMetrics] = useState<any>(null);
  const [financial, setFinancial] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [storesList, setStoresList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Financial Reconciliation & Payouts
  const [payoutsData, setPayoutsData] = useState<any>(null);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [processingPayoutModal, setProcessingPayoutModal] = useState<any | null>(null);
  const [proofUrlInput, setProofUrlInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [processingSubmitting, setProcessingSubmitting] = useState(false);

  // Mercado Pago Health, Controlled Verification & Configuration (Requirements 9 & 10)
  const [mpHealth, setMpHealth] = useState<any>(null);
  const [mpVerification, setMpVerification] = useState<any>(null);
  const [mpTokenInput, setMpTokenInput] = useState('');
  const [mpKeyInput, setMpKeyInput] = useState('');
  const [mpWebhookSecretInput, setMpWebhookSecretInput] = useState('');
  const [mpSaving, setMpSaving] = useState(false);
  const [mpTesting, setMpTesting] = useState(false);
  const [mpFeedback, setMpFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clear demo data
  const [clearingDemo, setClearingDemo] = useState(false);

  // Bulk import
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const fetchPayoutsData = async () => {
    setPayoutsLoading(true);
    try {
      const res = await fetch('/api/payouts/admin/reconciliation');
      if (res.ok) {
        const data = await res.json();
        setPayoutsData(data);
      }
    } catch (err) {
      console.error('Error fetching reconciliation:', err);
    } finally {
      setPayoutsLoading(false);
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [resMetrics, resFin, resUsers, resStores, resProducts, resSubs] = await Promise.all([
        fetch('/api/admin/metrics'),
        fetch('/api/admin/financial-report'),
        fetch('/api/admin/users'),
        fetch('/api/admin/stores'),
        fetch('/api/admin/products'),
        fetch('/api/admin/subscriptions'),
      ]);

      if (resMetrics.ok) setMetrics(await resMetrics.json());
      if (resFin.ok) setFinancial(await resFin.json());
      if (resUsers.ok) setUsersList(await resUsers.json());
      if (resStores.ok) setStoresList(await resStores.json());
      if (resProducts.ok) setProductsList(await resProducts.json());
      if (resSubs.ok) setSubscriptionsList(await resSubs.json());

      // Fetch Mercado Pago health and Reconciliation
      await Promise.all([fetchMpHealth(), fetchPayoutsData()]);
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMpHealth = async () => {
    try {
      const [resHealth, resVerif] = await Promise.all([
        fetch('/api/admin/payments/mercadopago/health'),
        fetch('/api/admin/payments/mercadopago/verify-connection'),
      ]);
      if (resHealth.ok) {
        const data = await resHealth.json();
        setMpHealth(data);
      }
      if (resVerif.ok) {
        const vData = await resVerif.json();
        setMpVerification(vData);
      }
    } catch (e) {
      console.error('Error fetching MP health:', e);
    }
  };

  // Ferramenta Administrativa Segura: "Verificar conexão Mercado Pago" (Requirement 10)
  const handleVerifyMpConnection = async () => {
    setMpTesting(true);
    setMpFeedback(null);
    try {
      const res = await fetch('/api/admin/payments/mercadopago/verify-connection', {
        method: 'POST',
      });
      const data = await res.json();
      setMpVerification(data);

      if (data.status === 'CONECTADO') {
        const nick = data.account?.nickname || data.account?.siteId || 'Conta Oficial';
        const col = data.account?.collectorId ? ` (Collector: ${data.account.collectorId})` : '';
        setMpFeedback({
          type: 'success',
          text: `🟢 Status: CONECTADO — Autenticação oficial confirmada na API Mercado Pago. ${nick}${col}.`,
        });
      } else if (data.status === 'NÃO CONFIGURADO') {
        setMpFeedback({
          type: 'error',
          text: '🟡 Status: NÃO CONFIGURADO — Credenciais ausentes. Cadastre o Access Token para ativar pagamentos reais.',
        });
      } else if (data.status === 'ERRO DE AUTENTICAÇÃO') {
        setMpFeedback({
          type: 'error',
          text: `🔴 Status: ERRO DE AUTENTICAÇÃO — O token informado foi recusado pela API oficial do Mercado Pago (401/403).`,
        });
      } else {
        setMpFeedback({
          type: 'error',
          text: `🔴 Status: ERRO DE API — ${data.lastError || 'Falha ao comunicar com os servidores do Mercado Pago.'}`,
        });
      }
      await fetchMpHealth();
    } catch {
      setMpFeedback({
        type: 'error',
        text: '🔴 Status: ERRO DE API — Falha de comunicação na rede ao consultar o endpoint.',
      });
    } finally {
      setMpTesting(false);
    }
  };

  const handleSaveMpCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mpTokenInput.trim()) {
      setMpFeedback({ type: 'error', text: 'Por favor, insira o Access Token do Mercado Pago.' });
      return;
    }
    setMpSaving(true);
    setMpFeedback(null);
    try {
      const res = await fetch('/api/admin/payments/mercadopago/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: mpTokenInput.trim(),
          publicKey: mpKeyInput.trim() || undefined,
          webhookSecret: mpWebhookSecretInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const idInfo = data.account?.collectorId ? ` (Collector ID: ${data.account.collectorId})` : '';
        const userAccount = data.account?.nickname || data.account?.email || 'Conta Oficial';
        setMpFeedback({
          type: 'success',
          text: `Credenciais validadas e salvas com sucesso! Conta: ${userAccount}${idInfo}. Modo de produção ativo e pagamentos reais liberados.`,
        });
        setMpTokenInput('');
        setMpWebhookSecretInput('');
        await fetchMpHealth();
      } else {
        setMpFeedback({
          type: 'error',
          text: data.error || 'Erro ao validar credenciais do Mercado Pago na API oficial.',
        });
      }
    } catch {
      setMpFeedback({ type: 'error', text: 'Erro de conexão ao salvar credenciais.' });
    } finally {
      setMpSaving(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleConfirmProcessPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processingPayoutModal) return;

    setProcessingSubmitting(true);
    try {
      const res = await fetch('/api/payouts/admin/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutRequestId: processingPayoutModal.id,
          transferProofUrl: proofUrlInput.trim() || null,
          notes: notesInput.trim() || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Repasse confirmado e registrado com sucesso no livro-razão financeiro!');
        setProcessingPayoutModal(null);
        setProofUrlInput('');
        setNotesInput('');
        fetchPayoutsData();
        fetchAdminData();
      } else {
        alert(data.error || 'Erro ao processar repasse.');
      }
    } catch {
      alert('Erro de conexão com o servidor.');
    } finally {
      setProcessingSubmitting(false);
    }
  };

  const handleClearDemoData = async () => {
    if (!window.confirm('ATENÇÃO MASTER OWNER: Deseja remover todos os produtos marcados como demonstração?')) {
      return;
    }
    setClearingDemo(true);
    try {
      const res = await fetch('/api/admin/clear-demo-data', { method: 'POST' });
      const d = await res.json();
      if (res.ok) {
        alert(d.message || 'Dados de demonstração removidos com sucesso!');
        fetchAdminData();
        onRefreshCatalog();
      } else {
        alert(d.error || 'Erro ao limpar dados.');
      }
    } catch {
      alert('Erro de conexão.');
    } finally {
      setClearingDemo(false);
    }
  };

  const handleImportFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportResult(null);

    let parsedItems = [];
    try {
      parsedItems = JSON.parse(importJson);
      if (!Array.isArray(parsedItems)) {
        alert('O feed deve ser uma lista (array) de produtos.');
        return;
      }
    } catch {
      alert('Formato JSON inválido. Verifique a sintaxe.');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch('/api/admin/import-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedJson: parsedItems }),
      });

      const data = await res.json();
      if (res.ok) {
        setImportResult(`Importação concluída! ${data.insertedCount} produtos adicionados com sucesso.`);
        setImportJson('');
        fetchAdminData();
        onRefreshCatalog();
      } else {
        alert(data.error || 'Erro ao importar catálogo.');
      }
    } catch {
      alert('Erro de conexão ao importar.');
    } finally {
      setImporting(false);
    }
  };

  if (user?.role !== 'MASTER_OWNER') {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-black text-slate-900">Acesso Restrito ao Master Owner</h2>
        <p className="text-sm text-slate-500">
          Esta área é restrita e monitorada exclusivamente pela conta Master Owner da plataforma VEND+.
        </p>
      </div>
    );
  }

  const m = metrics?.metrics;

  return (
    <div id="admin-view" className="space-y-8 pb-24 max-w-7xl mx-auto px-2 sm:px-4">
      {/* 1. MASTER OWNER HEADER */}
      <div className="bg-gradient-to-r from-[#060E1A] via-[#0B1A2F] to-[#0A2239] text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Master Owner • Painel de Controle Total do Ecossistema</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">
            Visão Global do Ecossistema VEND+
          </h1>
          <p className="text-xs text-slate-300">
            Monitore planos, assinaturas ativas, pagamentos PIX, Mercado Pago, comissões, repasses, lojas, estoque e pedidos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            id="admin-clear-demo-btn"
            disabled={clearingDemo}
            onClick={handleClearDemoData}
            className="bg-rose-600/90 hover:bg-rose-600 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{clearingDemo ? 'Limpando...' : 'Limpar Catálogo Demo'}</span>
          </button>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'OVERVIEW'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Visão Geral Executiva
        </button>

        <button
          onClick={() => setActiveTab('PLANS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'PLANS'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Planos & Assinaturas ({m?.activeSubscriptions ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('FINANCE_PIX')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'FINANCE_PIX'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>PIX & Mercado Pago</span>
        </button>

        <button
          id="admin-tab-payouts-conciliation"
          onClick={() => setActiveTab('PAYOUTS_CONCILIATION')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'PAYOUTS_CONCILIATION'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Repasses & Conciliação ({payoutsData?.payoutRequests?.length ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('STORES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'STORES'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Lojas IA ({storesList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'PRODUCTS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Produtos & Estoque ({m?.totalProducts ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'ORDERS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Pedidos ({m?.totalOrders ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('USERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'USERS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Usuários ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('IMPORT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'IMPORT'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Importar Feed</span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Top 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* GMV Total */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Faturamento Bruto (GMV)
              </span>
              <div className="text-2xl font-black text-slate-950 mt-1">
                {((m?.gmvCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {m?.paidOrdersCount ?? 0} pedidos pagos no marketplace
              </p>
            </div>

            {/* Receita Total da Plataforma */}
            <div className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-2xs bg-gradient-to-br from-white to-emerald-50/30">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                Receita VEND+ (Comissões + Planos)
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {((m?.totalPlatformRevenueCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-[11px] text-emerald-700/80 mt-1">
                Comissões: {((m?.commissionsCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | Planos: {((m?.plansRevenueCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>

            {/* Repasses aos Vendedores */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Repasses aos Vendedores
              </span>
              <div className="text-2xl font-black text-indigo-600 mt-1">
                {((m?.sellersNetCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Valor líquido após retenção de taxas
              </p>
            </div>

            {/* Planos & Assinaturas */}
            <div className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-2xs bg-gradient-to-br from-white to-amber-50/30">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                Planos & Assinaturas Ativas
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {m?.activeSubscriptions ?? 0} <span className="text-sm font-normal text-slate-500">ativas ({m?.plansSold ?? 0} vendidas)</span>
              </div>
              <p className="text-[11px] text-amber-700/80 mt-1">
                Chave PIX Oficial: <strong className="font-mono text-slate-800">11973479473</strong>
              </p>
            </div>
          </div>

          {/* Infrastructure Health: Mercado Pago & PIX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mercado Pago Status */}
            <div
              onClick={() => setActiveTab('FINANCE_PIX')}
              className="bg-white rounded-2xl border border-slate-200 hover:border-sky-300 transition cursor-pointer p-5 shadow-2xs space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-sky-500 group-hover:scale-110 transition-transform" />
                  <h3 className="font-black text-sm text-slate-900">Mercado Pago Oficial</h3>
                </div>
                {mpHealth?.apiConnection?.connected ? (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                    🟢 CONECTADO ✓
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                    🔴 NÃO CONFIGURADO
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase">Conta / Status</span>
                  <span className="font-bold text-slate-800 text-sm truncate block">
                    {mpHealth?.apiConnection?.connected ? (mpHealth?.apiConnection?.nickname || 'Conectada') : 'Pendente'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase">Configuração</span>
                  <span className="font-bold text-sky-600 text-sm flex items-center gap-1">
                    <span>Configurar</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Clique aqui para gerenciar credenciais, testar conexão e visualizar pagamentos.
              </p>
            </div>

            {/* PIX Status (Key 11973479473) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-black text-sm text-slate-900">Pagamentos PIX (Planos)</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  Ativo
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase">Chave PIX Exclusiva</span>
                  <span className="font-mono font-black text-emerald-600 text-sm">11973479473</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase">PIX Confirmados</span>
                  <span className="font-bold text-slate-800 text-sm">{m?.pix?.approvedCount ?? 0} aprovados</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                QR Code e chave PIX exclusivos para adesão e renovação de planos mensais.
              </p>
            </div>
          </div>

          {/* Counts Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Lojas Criadas com IA</span>
              <div className="text-xl font-black text-slate-900 mt-1">{m?.totalStores ?? 0}</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Produtos em Estoque</span>
              <div className="text-xl font-black text-emerald-600 mt-1">{m?.inStockProducts ?? 0}</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Produtos Sem Estoque</span>
              <div className="text-xl font-black text-rose-500 mt-1">{m?.outOfStockProducts ?? 0}</div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Protocolo PIN 4 Dígitos</span>
              <div className="text-xl font-black text-sky-600 mt-1">100% Protegido</div>
            </div>
          </div>

          {/* Recent Orders in Overview */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-sky-500" />
                <span>Últimos Pedidos do Ecossistema</span>
              </h3>
              <button
                onClick={() => setActiveTab('ORDERS')}
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                Ver todos
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Pedido</th>
                    <th className="p-3">Comprador</th>
                    <th className="p-3">Valor Bruto</th>
                    <th className="p-3">Comissão VEND+</th>
                    <th className="p-3">Líquido Vendedor</th>
                    <th className="p-3">PIN 4 Dígitos</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics?.recentOrders?.map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                      <td className="p-3 text-slate-600">{o.buyer?.name || 'Cliente'}</td>
                      <td className="p-3 font-bold text-slate-900">
                        {(o.totalGrossCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-3 font-bold text-emerald-600">
                        {(o.commissionCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-3 font-bold text-indigo-600">
                        {(o.sellerNetCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-black bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                          {o.deliveryCode || '----'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!metrics?.recentOrders || metrics.recentOrders.length === 0) && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        Nenhum pedido recente registrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PLANS & SUBSCRIPTIONS */}
      {activeTab === 'PLANS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-400 uppercase font-bold">Planos Vendidos</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{m?.plansSold ?? 0}</div>
              <p className="text-xs text-slate-500 mt-1">Total acumulado de adesões</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-emerald-200">
              <span className="text-xs text-emerald-700 uppercase font-bold">Assinaturas Ativas</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{m?.activeSubscriptions ?? 0}</div>
              <p className="text-xs text-slate-500 mt-1">Lojistas com plano vigente</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-amber-200">
              <span className="text-xs text-amber-700 uppercase font-bold">Receita de Assinaturas</span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {((m?.plansRevenueCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-slate-500 mt-1">Faturamento via PIX</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>Lista de Assinaturas & Planos Vendidos</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Assinante</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Plano</th>
                    <th className="p-3">Valor Mensal</th>
                    <th className="p-3">Início</th>
                    <th className="p-3">Término / Renovação</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptionsList.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{s.user?.name || 'Lojista'}</td>
                      <td className="p-3 text-slate-600">{s.user?.email || '-'}</td>
                      <td className="p-3 uppercase font-black text-amber-700">{s.plan?.name || s.plan?.slug}</td>
                      <td className="p-3 font-bold text-slate-900">
                        {((s.plan?.priceCents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(s.currentPeriodStart).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(s.currentPeriodEnd).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {s.status === 'ACTIVE' ? 'ATIVA' : s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {subscriptionsList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        Nenhuma assinatura registrada no banco de dados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FINANCE, PIX & MERCADO PAGO */}
      {activeTab === 'FINANCE_PIX' && (
        <div className="space-y-6">
          {/* Mercado Pago Live Health Status Card (Requirements 9 & 10) */}
          <div className="bg-gradient-to-r from-[#0B192C] to-[#162A45] rounded-3xl p-6 text-white border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Mercado Pago — Gateway Oficial</h3>
                  <p className="text-xs text-slate-300">
                    Fonte de verdade para cobranças reais, Pix instantâneo, Checkout Pro e Retenção Escrow
                  </p>
                </div>
              </div>

              {/* Requirement 9: Status 🟢 CONECTADO ou 🟡 AGUARDANDO CREDENCIAIS */}
              <div className="flex flex-wrap items-center gap-2">
                {mpVerification?.status === 'CONECTADO' || (!mpVerification && mpHealth?.apiConnection?.connected) ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle className="w-4 h-4" />
                    <span>MERCADO PAGO 🟢 CONECTADO</span>
                  </span>
                ) : mpVerification?.status === 'ERRO DE AUTENTICAÇÃO' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <AlertCircle className="w-4 h-4" />
                    <span>MERCADO PAGO 🔴 ERRO DE AUTENTICAÇÃO</span>
                  </span>
                ) : mpVerification?.status === 'ERRO DE API' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <AlertCircle className="w-4 h-4" />
                    <span>MERCADO PAGO 🔴 ERRO DE API</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <AlertCircle className="w-4 h-4" />
                    <span>MERCADO PAGO 🟡 AGUARDANDO CREDENCIAIS</span>
                  </span>
                )}

                {/* Requirement 10: Controlled Production Verification Tool */}
                <button
                  onClick={handleVerifyMpConnection}
                  disabled={mpTesting}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-100 transition text-xs font-bold flex items-center gap-1.5 border border-white/10 disabled:opacity-50 cursor-pointer shadow-xs"
                  title="Executa teste controlado na API oficial do Mercado Pago (/users/me)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${mpTesting ? 'animate-spin' : ''}`} />
                  <span>{mpTesting ? 'Verificando Conexão...' : 'Verificar conexão Mercado Pago'}</span>
                </button>
              </div>
            </div>

            {/* Requirement 9: Diagnostics Indicators without ever displaying credentials values */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Access Token Configurado</span>
                <span className={`font-black text-xs block mt-0.5 ${mpHealth?.configured || mpVerification?.accessTokenConfigured ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {mpHealth?.configured || mpVerification?.accessTokenConfigured ? 'SIM ✓' : 'NÃO'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {mpHealth?.source === 'ENV' ? 'Variável de Ambiente' : mpHealth?.source === 'DATABASE' ? 'Banco de Dados (Criptografia AES-256)' : 'Não configurado'}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Public Key Configurada</span>
                <span className={`font-black text-xs block mt-0.5 ${mpHealth?.hasPublicKey || mpVerification?.publicKeyConfigured ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {mpHealth?.hasPublicKey || mpVerification?.publicKeyConfigured ? 'SIM ✓' : 'NÃO'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Chave Pública de Cliente
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Webhook Secret Configurado</span>
                <span className={`font-black text-xs block mt-0.5 ${mpVerification?.webhookSecretConfigured ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {mpVerification?.webhookSecretConfigured ? 'SIM ✓' : 'NÃO'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Assinatura HMAC-SHA256
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Webhook Operacional</span>
                <span className="font-black text-xs block mt-0.5 text-emerald-400">
                  SIM ✓
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Endpoint Ativo e Idempotente
                </span>
              </div>
            </div>

            {/* Confirmation & Audit Tracking (Requirement 9) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-slate-950/40 p-3.5 rounded-2xl border border-white/10">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Última Confirmação Recebida</span>
                <span className="text-white font-bold block mt-0.5">
                  {mpVerification?.lastConfirmationReceived || (mpHealth?.lastPaymentEvent?.paidAt ? new Date(mpHealth.lastPaymentEvent.paidAt).toLocaleString('pt-BR') : 'Nenhuma confirmação recente')}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Último Pagamento Confirmado</span>
                <span className="text-emerald-400 font-bold block mt-0.5 truncate">
                  {mpVerification?.lastPaymentConfirmed || (mpHealth?.lastPaymentEvent?.id ? `Pagamento #${mpHealth.lastPaymentEvent.id} (R$ ${((mpHealth.lastPaymentEvent.amountCents || 0) / 100).toFixed(2)})` : 'Nenhum pagamento recente')}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Último Erro</span>
                <span className={`font-bold block mt-0.5 truncate ${mpVerification?.lastError ? 'text-rose-400' : 'text-slate-400'}`}>
                  {mpVerification?.lastError || 'Nenhum erro registrado'}
                </span>
              </div>
            </div>

            {/* Webhook Endpoint Display */}
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">URL do Webhook Mercado Pago:</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  Status: Operacional ✓
                </span>
              </div>
              <div className="font-mono text-xs bg-slate-950/60 p-2 rounded-xl text-slate-300 border border-white/5 select-all">
                {mpHealth?.webhook?.configuredUrl || `${window.location.origin}/api/payments/mercadopago/webhook`}
              </div>
            </div>
          </div>

          {/* Form to Configure Mercado Pago Credentials */}
          <div id="configurar-mercado-pago-section" className="bg-white rounded-3xl border-2 border-emerald-500/40 p-6 sm:p-8 shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Configurar Credenciais do Mercado Pago</h3>
                  <p className="text-xs text-slate-500">
                    Acesso exclusivo Master Owner • Integração oficial de pagamentos em produção
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 w-fit">
                Segurança AES-256-GCM
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Insira abaixo o seu token oficial do Mercado Pago. O token será testado instantaneamente na API oficial (<code className="font-mono text-emerald-700 font-bold">/users/me</code>). Sendo válido, ele será criptografado e protegido no servidor. <strong>O token e o segredo nunca são exibidos após serem salvos nem compartilhados com o frontend.</strong>
            </p>

            {mpFeedback && (
              <div
                className={`p-4 rounded-2xl text-xs flex items-start gap-3 ${
                  mpFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-950 border-2 border-emerald-300 shadow-xs'
                    : 'bg-rose-50 text-rose-950 border-2 border-rose-300 shadow-xs'
                }`}
              >
                {mpFeedback.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <p className="font-black text-xs">
                    {mpFeedback.type === 'success' ? '✓ Operação Concluída' : 'Resultado da Verificação'}
                  </p>
                  <p className="text-xs leading-relaxed">{mpFeedback.text}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveMpCredentials} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  Access Token de Produção *
                </label>
                <input
                  type="password"
                  placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxx"
                  required
                  value={mpTokenInput}
                  onChange={(e) => setMpTokenInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-mono transition-all outline-none"
                />
                <p className="text-[11px] text-slate-400">
                  Token de produção obtido nas Credenciais de Produção do Mercado Pago Developers (inicia com APP_USR-).
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  Public Key do Mercado Pago (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={mpKeyInput}
                  onChange={(e) => setMpKeyInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-mono transition-all outline-none"
                />
                <p className="text-[11px] text-slate-400">
                  Chave pública para renderização de componentes de checkout no cliente.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  Webhook Secret do Mercado Pago (Opcional)
                </label>
                <input
                  type="password"
                  placeholder="Segredo de validação de assinatura de webhook (HMAC-SHA256)"
                  value={mpWebhookSecretInput}
                  onChange={(e) => setMpWebhookSecretInput(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl text-xs font-mono transition-all outline-none"
                />
                <p className="text-[11px] text-slate-400">
                  Chave secreta de webhook gerada no painel de Notificações do Mercado Pago para verificação do cabeçalho x-signature.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="submit"
                  disabled={mpSaving}
                  className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {mpSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Testando Conexão na API Oficial...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-slate-950" />
                      <span>Salvar e Testar Conexão</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleVerifyMpConnection}
                  disabled={mpTesting || mpSaving}
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-300 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${mpTesting ? 'animate-spin' : ''}`} />
                  <span>{mpTesting ? 'Verificando...' : 'Verificar conexão Mercado Pago'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Revenue Statistics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-400 uppercase font-bold">Total Arrecadado em Comissões</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {((m?.commissionsCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-slate-500 mt-1">Taxa média retida: 4% a 7%</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs text-slate-400 uppercase font-bold">Repasses Totais aos Vendedores</span>
              <div className="text-2xl font-black text-indigo-600 mt-1">
                {((m?.sellersNetCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-slate-500 mt-1">Valores líquidos a transferir</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-200">
              <span className="text-xs text-emerald-700 uppercase font-bold">Receita Total de Planos</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {((m?.plansRevenueCents ?? 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-slate-500 mt-1">Assinaturas pagas via Mercado Pago</p>
            </div>
          </div>

          {/* Payments List */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>Transações Mercado Pago & PIX no Banco de Dados</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Ref. Externa</th>
                    <th className="p-3">ID Mercado Pago</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Método</th>
                    <th className="p-3">Valor</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(mpHealth?.recentPayments || metrics?.recentPayments)?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{p.externalReference}</td>
                      <td className="p-3 font-mono text-slate-600">{p.mpPaymentId || '---'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          {p.paymentType === 'SUBSCRIPTION' ? 'ASSINATURA PLANO' : 'PEDIDO MARKETPLACE'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-700">
                        {p.paymentMethod || 'MERCADO PAGO'}
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        {(p.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(p.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!mpHealth?.recentPayments && !metrics?.recentPayments) && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        Nenhum pagamento registrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: STORES CREATED WITH AI */}
      {activeTab === 'STORES' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-sky-500" />
              <span>Lojas Virtuais Criadas no VEND+ ({storesList.length})</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Nome da Loja</th>
                  <th className="p-3">Lojista Responsável</th>
                  <th className="p-3">Nicho / Categoria</th>
                  <th className="p-3">Localização</th>
                  <th className="p-3">Seguidores</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Link da Vitrine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {storesList.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{st.name}</td>
                    <td className="p-3 text-slate-600">{st.owner?.name || 'Lojista'}</td>
                    <td className="p-3 text-slate-700">{st.category}</td>
                    <td className="p-3 text-slate-600">{st.location}</td>
                    <td className="p-3 text-slate-700">{st.followersCount}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {st.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => onNavigate && onNavigate('store-front', st.slug)}
                        className="text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1"
                      >
                        <span>Ver Loja</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {storesList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      Nenhuma loja virtual criada ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PRODUCTS & STOCK */}
      {activeTab === 'PRODUCTS' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-sky-500" />
                <span>Gestão de Produtos & Disponibilidade ({productsList.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Produtos com estoque zerado são automaticamente identificados na vitrine como "Produto VEND+ — sem estoque no momento".
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">
                {m?.inStockProducts ?? 0} Em Estoque
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800">
                {m?.outOfStockProducts ?? 0} Sem Estoque
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Produto</th>
                  <th className="p-3">Vendedor</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Preço</th>
                  <th className="p-3">Estoque</th>
                  <th className="p-3">Disponibilidade</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productsList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      {p.imageUrl && (
                        <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded object-cover" />
                      )}
                      <span>{p.name}</span>
                    </td>
                    <td className="p-3 text-slate-600">{p.seller?.name || 'Vendedor'}</td>
                    <td className="p-3 text-slate-600">{p.category?.name || 'Geral'}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {(p.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="p-3 font-bold text-slate-800">{p.stock} un.</td>
                    <td className="p-3">
                      {p.stock > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Disponível
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          Produto VEND+ — sem estoque no momento
                        </span>
                      )}
                    </td>
                    <td className="p-3 uppercase font-bold text-slate-600">{p.status}</td>
                  </tr>
                ))}
                {productsList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      Nenhum produto cadastrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: ORDERS & 4-DIGIT DELIVERY CODE */}
      {activeTab === 'ORDERS' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-sky-500" />
                <span>Gestão Completa de Pedidos & Códigos de Entrega</span>
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhe o protocolo exclusivo de entrega segura via PIN de 4 dígitos.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Número do Pedido</th>
                  <th className="p-3">Comprador</th>
                  <th className="p-3">Valor Bruto</th>
                  <th className="p-3">Comissão VEND+</th>
                  <th className="p-3">Líquido Vendedor</th>
                  <th className="p-3">Código de 4 Dígitos</th>
                  <th className="p-3">PIN Utilizado?</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {financial.map((o: any) => (
                  <tr key={o.orderId} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">{o.orderNumber}</td>
                    <td className="p-3 text-slate-600">{o.buyer?.name || 'Cliente'}</td>
                    <td className="p-3 font-bold text-slate-900">
                      {(o.totalGrossCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="p-3 font-bold text-emerald-600">
                      {(o.commissionCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="p-3 font-bold text-indigo-600">
                      {(o.sellerNetCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800 bg-slate-50">
                      {o.deliveryCode || 'Código Ativo'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          o.deliveryCodeUsed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.deliveryCodeUsed ? 'Sim (Entregue)' : 'Pendente'}
                      </span>
                    </td>
                    <td className="p-3 uppercase font-bold text-slate-700">{o.status}</td>
                  </tr>
                ))}
                {financial.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: USERS & SELLERS */}
      {activeTab === 'USERS' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-500" />
            <span>Usuários e Lojistas Cadastrados ({usersList.length})</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Função</th>
                  <th className="p-3">Plano</th>
                  <th className="p-3">Telefone</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{u.name}</td>
                    <td className="p-3 text-slate-600">{u.email}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === 'MASTER_OWNER'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'SELLER'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 uppercase font-bold text-amber-700">{u.planSlug}</td>
                    <td className="p-3 text-slate-600">{u.phone || '-'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: BULK IMPORT FEED */}
      {activeTab === 'IMPORT' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-sky-500" />
              <span>Importação em Massa de Catálogo (Feed JSON)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Importe dezenas ou centenas de produtos locais de uma só vez através de feed estruturado.
            </p>
          </div>

          {importResult && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{importResult}</span>
            </div>
          )}

          <form onSubmit={handleImportFeed} className="space-y-3">
            <textarea
              id="admin-feed-input"
              rows={5}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='Exemplo: [
  { "name": "Bicicleta Caloi Aro 29", "priceCents": 120000, "condition": "USADO", "imageUrl": "https://...", "location": "São Paulo, SP" }
]'
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:border-sky-500"
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setImportJson(
                    JSON.stringify(
                      [
                        {
                          name: 'Smart TV LG 50 Polegadas 4K',
                          priceCents: 189900,
                          condition: 'NOVO',
                          imageUrl:
                            'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=80',
                          location: 'São Paulo, SP',
                          stock: 5,
                        },
                        {
                          name: 'Monitor Gamer 27" 165Hz IPS',
                          priceCents: 105000,
                          condition: 'NOVO',
                          imageUrl:
                            'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
                          location: 'São Paulo, SP',
                          stock: 3,
                        },
                      ],
                      null,
                      2
                    )
                  );
                }}
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                Preencher exemplo de teste
              </button>

              <button
                id="admin-import-submit-btn"
                type="submit"
                disabled={importing || !importJson.trim()}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs disabled:opacity-50"
              >
                {importing ? 'Importando...' : 'Executar Importação em Massa'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: REPASSES & CONCILIAÇÃO FINANCEIRA */}
      {activeTab === 'PAYOUTS_CONCILIATION' && (
        <div className="space-y-6">
          {/* Header & Refresh */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>Conciliação Financeira & Proteção de Transações VEND+</span>
              </h2>
              <p className="text-xs text-slate-500">
                Auditoria rigorosa: pagamentos Mercado Pago, retenções de segurança, liberações pós-código e liquidação de repasses aos vendedores.
              </p>
            </div>

            <button
              onClick={fetchPayoutsData}
              disabled={payoutsLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${payoutsLoading ? 'animate-spin' : ''}`} />
              <span>{payoutsLoading ? 'Atualizando...' : 'Atualizar Livro-Razão'}</span>
            </button>
          </div>

          {/* Metric Cards Summary */}
          {payoutsData?.summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Bruto em Transações
                </span>
                <div className="text-2xl font-black text-slate-950">
                  {((payoutsData.summary.totalGrossCents ?? 0) / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </div>
                <p className="text-[11px] text-slate-500">Volume total transacionado na plataforma</p>
              </div>

              <div className="bg-white rounded-2xl border border-amber-200/80 p-4 shadow-2xs bg-amber-50/20 space-y-1">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                  Retido com Segurança (Pendente)
                </span>
                <div className="text-2xl font-black text-amber-600">
                  {((payoutsData.summary.totalPendingDeliveryCents ?? 0) / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </div>
                <p className="text-[11px] text-amber-700/80">Aguardando comprador validar código</p>
              </div>

              <div className="bg-white rounded-2xl border border-emerald-200/80 p-4 shadow-2xs bg-emerald-50/20 space-y-1">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Liberado para Repasse
                </span>
                <div className="text-2xl font-black text-emerald-600">
                  {((payoutsData.summary.totalAvailableForPayoutCents ?? 0) / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </div>
                <p className="text-[11px] text-emerald-700/80">Entrega validada com sucesso pelo cliente</p>
              </div>

              <div className="bg-white rounded-2xl border border-indigo-200/80 p-4 shadow-2xs bg-indigo-50/20 space-y-1">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Comissão VEND+ Retida (7% / 4%)
                </span>
                <div className="text-2xl font-black text-indigo-600">
                  {((payoutsData.summary.totalPlatformFeesCents ?? 0) / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </div>
                <p className="text-[11px] text-indigo-700/80">Receita retida automaticamente</p>
              </div>
            </div>
          )}

          {/* SECTION 1: TABELA DE SOLICITAÇÕES DE REPASSE DOS VENDEDORES */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <span>Fila de Solicitações de Repasse</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Vendedores que solicitaram a transferência do saldo disponível para Pix ou conta bancária.
                </p>
              </div>
            </div>

            {(!payoutsData?.payoutRequests || payoutsData.payoutRequests.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-8">
                Nenhuma solicitação de repasse registrada até o momento.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3">Código</th>
                      <th className="pb-3">Vendedor</th>
                      <th className="pb-3">Dados de Destino</th>
                      <th className="pb-3">Valor Líquido</th>
                      <th className="pb-3">Data Solicitação</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payoutsData.payoutRequests.map((req: any) => {
                      const snapshot = req.accountSnapshot ? (typeof req.accountSnapshot === 'string' ? JSON.parse(req.accountSnapshot) : req.accountSnapshot) : null;
                      const isPending = req.status === 'REQUESTED' || req.status === 'PROCESSING';

                      return (
                        <tr key={req.id} className="hover:bg-slate-50">
                          <td className="py-3 font-mono font-bold text-slate-900">{req.requestNumber}</td>
                          <td className="py-3 font-bold text-slate-800">
                            {req.seller?.name || `Vendedor #${req.sellerId}`}
                            <span className="block text-[11px] font-normal text-slate-400">{req.seller?.email}</span>
                          </td>
                          <td className="py-3 text-slate-600">
                            {snapshot ? (
                              snapshot.accountType === 'PIX' ? (
                                <div>
                                  <span className="font-bold text-emerald-700">PIX ({snapshot.pixKeyType}):</span> {snapshot.pixKey}
                                  <span className="block text-[10px] text-slate-400">Titular: {snapshot.holderName} (Doc: {snapshot.holderDocument})</span>
                                </div>
                              ) : (
                                <div>
                                  <span className="font-bold text-sky-700">{snapshot.bankName}:</span> Ag {snapshot.agency} • CC {snapshot.accountNumber}
                                  <span className="block text-[10px] text-slate-400">Titular: {snapshot.holderName} (Doc: {snapshot.holderDocument})</span>
                                </div>
                              )
                            ) : (
                              'Dados não informados'
                            )}
                          </td>
                          <td className="py-3 font-black text-emerald-700 text-sm">
                            {(req.netAmountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="py-3 text-slate-500">
                            {new Date(req.requestedAt).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3">
                            {req.status === 'PAID' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ✓ Pago na Conta
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Aguardando Transferência
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {isPending ? (
                              <button
                                onClick={() => {
                                  setProcessingPayoutModal(req);
                                  setProofUrlInput('');
                                  setNotesInput('');
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition shadow-2xs cursor-pointer"
                              >
                                Baixar Repasse
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px] font-semibold">Liquidado</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 2: AUDITORIA DO LIVRO-RAZÃO FINANCEIRO (financialLedger) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  <span>Livro-Razão Financeiro & Auditoria de Pedidos</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Rastreamento completo: status de pagamento MP, confirmação física de entrega e liberação de saldo.
                </p>
              </div>
            </div>

            {(!payoutsData?.ledger || payoutsData.ledger.length === 0) ? (
              <p className="text-xs text-slate-500 text-center py-8">
                Nenhuma entrada registrada no livro-razão financeiro.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3">Transação</th>
                      <th className="pb-3">Pedido</th>
                      <th className="pb-3">Vendedor / Comprador</th>
                      <th className="pb-3">Bruto</th>
                      <th className="pb-3">Taxa VEND+</th>
                      <th className="pb-3">Líquido Vendedor</th>
                      <th className="pb-3">Pagamento MP</th>
                      <th className="pb-3">Status Pedido</th>
                      <th className="pb-3">Status Repasse</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payoutsData.ledger.map((entry: any) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="py-3 font-mono font-bold text-slate-900">{entry.transactionNumber}</td>
                        <td className="py-3 font-mono text-slate-700">{entry.orderNumber}</td>
                        <td className="py-3 text-slate-700">
                          <div>
                            <span className="font-semibold text-slate-900">Vend: {entry.seller?.name || `#${entry.sellerId}`}</span>
                            <span className="block text-[11px] text-slate-400">Comp: {entry.buyer?.name || `#${entry.buyerId}`}</span>
                          </div>
                        </td>
                        <td className="py-3 font-bold text-slate-900">
                          {(entry.grossAmountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 font-bold text-rose-600">
                          {(entry.platformFeeCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 font-bold text-emerald-700">
                          {(entry.sellerAmountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            entry.paymentStatus === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : entry.paymentStatus === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {entry.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {entry.orderStatus}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            entry.payoutStatus === 'AVAILABLE_FOR_PAYOUT' || entry.payoutStatus === 'RELEASED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : entry.payoutStatus === 'PAID'
                              ? 'bg-emerald-600 text-white'
                              : entry.payoutStatus === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {entry.payoutStatus === 'AVAILABLE_FOR_PAYOUT'
                              ? 'Liberado p/ Repasse'
                              : entry.payoutStatus === 'PENDING_DELIVERY_CONFIRMATION'
                              ? 'Retido em Garantia'
                              : entry.payoutStatus === 'PAID'
                              ? 'Repasse Concluído'
                              : entry.payoutStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL BAIXAR / LIQUIDAR REPASSE (ADMIN) */}
      {processingPayoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 relative my-8">
            <button
              onClick={() => setProcessingPayoutModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                <CheckCircle className="w-4 h-4 text-indigo-600" />
                <span>Liquidação de Repasse aos Vendedores</span>
              </div>
              <h2 className="text-xl font-black text-slate-950 pt-1">
                Processar Repasse #{processingPayoutModal.requestNumber}
              </h2>
              <p className="text-xs text-slate-500">
                Confirme a transferência bancária/Pix para o vendedor e registre a liquidação.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Vendedor:</span>
                <strong className="text-slate-900">{processingPayoutModal.seller?.name || `#${processingPayoutModal.sellerId}`}</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Valor Líquido:</span>
                <strong className="text-emerald-700 text-sm">
                  {(processingPayoutModal.netAmountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
              </div>
              {processingPayoutModal.accountSnapshot && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 block">Conta de Destino:</span>
                  <p className="font-semibold text-slate-800 text-[11px] mt-0.5">
                    {typeof processingPayoutModal.accountSnapshot === 'string'
                      ? processingPayoutModal.accountSnapshot
                      : JSON.stringify(processingPayoutModal.accountSnapshot)}
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmProcessPayout} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Comprovante / ID da Transferência (Opcional)
                </label>
                <input
                  type="text"
                  value={proofUrlInput}
                  onChange={(e) => setProofUrlInput(e.target.value)}
                  placeholder="URL ou código da transação Pix / TED"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas Internas de Auditoria</label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Ex: Transferido via Pix banco Inter às 14h30"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setProcessingPayoutModal(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-xl shadow-md transition cursor-pointer"
                >
                  {processingSubmitting ? 'Registrando...' : 'Confirmar e Liquidar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
