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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AdminViewProps {
  onRefreshCatalog: () => void;
  onNavigate?: (view: string, param?: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onRefreshCatalog, onNavigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PLANS' | 'FINANCE_PIX' | 'STORES' | 'PRODUCTS' | 'ORDERS' | 'USERS' | 'IMPORT'>('OVERVIEW');

  const [metrics, setMetrics] = useState<any>(null);
  const [financial, setFinancial] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [storesList, setStoresList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mercado Pago Health & Configuration
  const [mpHealth, setMpHealth] = useState<any>(null);
  const [mpTokenInput, setMpTokenInput] = useState('');
  const [mpKeyInput, setMpKeyInput] = useState('');
  const [mpSaving, setMpSaving] = useState(false);
  const [mpTesting, setMpTesting] = useState(false);
  const [mpFeedback, setMpFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Clear demo data
  const [clearingDemo, setClearingDemo] = useState(false);

  // Bulk import
  const [importJson, setImportJson] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

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

      // Fetch Mercado Pago health
      await fetchMpHealth();
    } catch (e) {
      console.error('Error fetching admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMpHealth = async () => {
    try {
      const res = await fetch('/api/admin/payments/mercadopago/health');
      if (res.ok) {
        const data = await res.json();
        setMpHealth(data);
      }
    } catch (e) {
      console.error('Error fetching MP health:', e);
    }
  };

  const handleTestMpConnection = async () => {
    setMpTesting(true);
    setMpFeedback(null);
    try {
      const res = await fetch('/api/admin/payments/mercadopago/test-connection', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.connected) {
        setMpFeedback({
          type: 'success',
          text: `Conexão bem-sucedida com Mercado Pago! Conta: ${data.nickname || data.email || 'Conta Oficial'} (Collector ID: ${data.collectorId}).`,
        });
      } else {
        setMpFeedback({
          type: 'error',
          text: `Falha no teste de conexão: ${data.error || 'Credencial não aceita pela API do Mercado Pago.'}`,
        });
      }
      await fetchMpHealth();
    } catch {
      setMpFeedback({
        type: 'error',
        text: 'Erro de comunicação ao testar endpoint do Mercado Pago.',
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
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMpFeedback({
          type: 'success',
          text: `Credenciais verificadas e salvas com sucesso! Conectado à conta: ${data.account?.nickname || data.account?.email || 'Mercado Pago Oficial'}.`,
        });
        setMpTokenInput('');
        await fetchMpHealth();
      } else {
        setMpFeedback({
          type: 'error',
          text: data.error || 'Erro ao validar credenciais do Mercado Pago.',
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
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-sky-500" />
                  <h3 className="font-black text-sm text-slate-900">Status Mercado Pago</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  {m?.mercadoPago?.status || 'ONLINE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase">Checkout Transparente</span>
                  <span className="font-bold text-slate-800 text-sm">Operacional</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase">Transações Processadas</span>
                  <span className="font-bold text-slate-800 text-sm">{m?.mercadoPago?.totalCount ?? 0} transações</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Processamento oficial de cartão e split de pagamentos para lojistas e vendedores.
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
          {/* Mercado Pago Live Health Status Card */}
          <div className="bg-gradient-to-r from-[#0B192C] to-[#162A45] rounded-3xl p-6 text-white border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Mercado Pago — Gateway de Produção</h3>
                  <p className="text-xs text-slate-300">
                    Fonte de verdade para cobranças reais, Pix instantâneo e Checkout Pro
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {mpHealth?.status === 'HEALTHY' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle className="w-4 h-4" />
                    <span>Conectado (Produção Oficial)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <AlertCircle className="w-4 h-4" />
                    <span>{mpHealth?.configured ? 'Falha de Conexão' : 'Token Pendente'}</span>
                  </span>
                )}
                <button
                  onClick={handleTestMpConnection}
                  disabled={mpTesting}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition text-xs font-bold flex items-center gap-1.5 border border-white/10 disabled:opacity-50 cursor-pointer"
                  title="Testar Conexão Oficial no endpoint /users/me do Mercado Pago"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${mpTesting ? 'animate-spin' : ''}`} />
                  <span>{mpTesting ? 'Testando...' : 'Testar Conexão Real'}</span>
                </button>
              </div>
            </div>

            {/* Account Details & Diagnostics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Status do Token</span>
                <span className={`font-black text-sm block mt-0.5 ${mpHealth?.configured ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {mpHealth?.configured ? 'Access Token configurado ✓' : 'Access Token não configurado'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {mpHealth?.source === 'ENV' ? 'Via Variável de Ambiente (Secrets)' : mpHealth?.source === 'DATABASE' ? 'Criptografado (AES-256-GCM)' : 'Pendente'}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Titular da Conta MP</span>
                <span className="font-bold text-white text-sm truncate block mt-0.5">
                  {mpHealth?.apiConnection?.nickname || mpHealth?.apiConnection?.email || 'Não Identificado'}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Collector ID (Vendedor)</span>
                <span className="font-bold text-white text-sm truncate block mt-0.5 font-mono">
                  {mpHealth?.apiConnection?.collectorId || '---'}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Liquidação Pix Instantânea</span>
                <span className="font-bold text-sky-400 text-sm block mt-0.5">
                  Ativa (Automação 24/7)
                </span>
              </div>
            </div>

            {/* Webhook Endpoint Display */}
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">URL do Webhook Mercado Pago:</span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  Status: {mpHealth?.webhook?.status || 'Ativo'}
                </span>
              </div>
              <div className="font-mono text-xs bg-slate-950/60 p-2 rounded-xl text-slate-300 border border-white/5 select-all">
                {mpHealth?.webhook?.configuredUrl || `${window.location.origin}/api/payments/mercadopago/webhook`}
              </div>
            </div>
          </div>

          {/* Form to Configure Mercado Pago Credentials */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-emerald-600" />
              <span>Configurar Credenciais do Mercado Pago (Master Owner)</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              O segredo pode ser configurado via <strong>Variável de Ambiente</strong> (<code className="font-mono">MERCADOPAGO_ACCESS_TOKEN</code>) ou inserido abaixo.
              Caso salvo pelo painel, ele é gravado com <strong>criptografia autenticada AES-256-GCM</strong> em repouso no banco de dados e <strong>nunca é exibido, retornado por APIs ou registrado em logs</strong>.
            </p>

            {mpFeedback && (
              <div
                className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
                  mpFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-50 text-rose-900 border border-rose-300'
                }`}
              >
                {mpFeedback.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{mpFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveMpCredentials} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Access Token de Produção (MERCADOPAGO_ACCESS_TOKEN) *
                </label>
                <input
                  type="password"
                  placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxx"
                  required
                  value={mpTokenInput}
                  onChange={(e) => setMpTokenInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Public Key (MERCADOPAGO_PUBLIC_KEY — Opcional para Frontend)
                </label>
                <input
                  type="text"
                  placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={mpKeyInput}
                  onChange={(e) => setMpKeyInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={mpSaving}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {mpSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Validando e Salvando Credenciais...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-slate-950" />
                      <span>Salvar e Testar Credenciais no Mercado Pago</span>
                    </>
                  )}
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
    </div>
  );
};
