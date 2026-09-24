import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  DollarSign,
  PlusCircle,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  Truck,
  CheckCircle,
  KeyRound,
  X,
  Wallet,
  Building2,
  ArrowDownRight,
  History,
  QrCode,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Order, Product, SellerPayoutAccount, PayoutRequest, SellerWalletSummary } from '../types.ts';

interface SellerDashboardViewProps {
  onNavigate: (view: string) => void;
  onSelectProduct: (product: Product) => void;
}

export const SellerDashboardView: React.FC<SellerDashboardViewProps> = ({
  onNavigate,
  onSelectProduct,
}) => {
  const { user } = useAuth();
  const [sales, setSales] = useState<Order[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [wallet, setWallet] = useState<SellerWalletSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Delivery code confirmation modal
  const [codeConfirmOrder, setCodeConfirmOrder] = useState<Order | null>(null);
  const [deliveryCodeInput, setDeliveryCodeInput] = useState('');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Payout Account configuration modal
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountType, setAccountType] = useState<'PIX' | 'BANK_ACCOUNT'>('PIX');
  const [pixKeyType, setPixKeyType] = useState<'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP'>('CPF');
  const [pixKey, setPixKey] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [agency, setAgency] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountTypeDetail, setAccountTypeDetail] = useState<'CORRENTE' | 'POUPANCA'>('CORRENTE');
  const [holderName, setHolderName] = useState(user?.name || '');
  const [holderDocument, setHolderDocument] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Payout Request modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  // Plan limits map
  const planLimits: Record<string, number> = {
    free: 10,
    basico: 50,
    premium: 150,
    lendario: 500,
  };

  const userPlan = user?.planSlug || 'free';
  const maxQuota = planLimits[userPlan] || 10;

  const fetchSellerData = async () => {
    try {
      // 1. Fetch sales orders
      const resSales = await fetch('/api/orders/my?tipo=vendas');
      if (resSales.ok) {
        const dataSales = await resSales.json();
        setSales(dataSales);
      }

      // 2. Fetch active products
      const resProducts = await fetch(user?.id ? `/api/products?sellerId=${user.id}&limit=100` : '/api/products?limit=50');
      if (resProducts.ok) {
        const dataProducts = await resProducts.json();
        const mine = (dataProducts.items || []).filter((p: Product) => p.sellerId === user?.id);
        setMyProducts(mine);
      }

      // 3. Fetch wallet summary
      const resWallet = await fetch('/api/payouts/wallet');
      if (resWallet.ok) {
        const dataWallet = await resWallet.json();
        setWallet(dataWallet);
        if (dataWallet.payoutAccount) {
          const acc = dataWallet.payoutAccount;
          setAccountType(acc.accountType);
          if (acc.pixKeyType) setPixKeyType(acc.pixKeyType);
          if (acc.pixKey) setPixKey(acc.pixKey);
          if (acc.bankName) setBankName(acc.bankName);
          if (acc.bankCode) setBankCode(acc.bankCode);
          if (acc.agency) setAgency(acc.agency);
          if (acc.accountNumber) setAccountNumber(acc.accountNumber);
          if (acc.accountTypeDetail) setAccountTypeDetail(acc.accountTypeDetail);
          if (acc.holderName) setHolderName(acc.holderName);
          if (acc.holderDocument) setHolderDocument(acc.holderDocument);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerData();
  }, []);

  // Somente pedidos com pagamento REALMENTE aprovado contam como vendas realizadas (Regras Obrigatórias 1, 2 e 5)
  const approvedSales = sales.filter(
    (s) => s.paymentStatus === 'APPROVED' && s.status !== 'AWAITING_PAYMENT' && s.status !== 'CANCELLED'
  );
  const totalGrossCents = approvedSales.reduce((sum, s) => sum + s.totalGrossCents, 0);
  const totalCommissionCents = approvedSales.reduce((sum, s) => sum + s.commissionCents, 0);
  const totalNetCents = approvedSales.reduce((sum, s) => sum + s.sellerNetCents, 0);

  const activeCount = myProducts.length;
  const quotaPercent = Math.min(100, Math.round((activeCount / maxQuota) * 100));

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        alert('Status do pedido atualizado com sucesso!');
        fetchSellerData();
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao atualizar pedido.');
      }
    } catch {
      alert('Erro de conexão.');
    }
  };

  // 4-Digit Delivery Code Validation
  const handleConfirmDeliveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeConfirmOrder) return;
    if (!deliveryCodeInput.trim() || deliveryCodeInput.trim().length !== 4) {
      setConfirmError('Digite o código de 4 dígitos informado pelo comprador.');
      return;
    }

    setConfirmLoading(true);
    setConfirmError(null);
    try {
      const res = await fetch('/api/deliveries/confirm-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: codeConfirmOrder.id,
          code: deliveryCodeInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Código validado com sucesso! Entrega confirmada e valor LIBERADO para repasse na sua carteira VEND+.');
        setCodeConfirmOrder(null);
        setDeliveryCodeInput('');
        fetchSellerData();
      } else {
        setConfirmError(data.error || 'Código incorreto ou inválido.');
      }
    } catch {
      setConfirmError('Erro de conexão ao validar o código.');
    } finally {
      setConfirmLoading(false);
    }
  };

  // Configure Payout Account Form Submit
  const handleSavePayoutAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);
    setAccountSaving(true);

    try {
      const res = await fetch('/api/payouts/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType,
          pixKeyType: accountType === 'PIX' ? pixKeyType : null,
          pixKey: accountType === 'PIX' ? pixKey.trim() : null,
          bankName: accountType === 'BANK_ACCOUNT' ? bankName.trim() : null,
          bankCode: accountType === 'BANK_ACCOUNT' ? bankCode.trim() : null,
          agency: accountType === 'BANK_ACCOUNT' ? agency.trim() : null,
          accountNumber: accountType === 'BANK_ACCOUNT' ? accountNumber.trim() : null,
          accountTypeDetail: accountType === 'BANK_ACCOUNT' ? accountTypeDetail : null,
          holderName: holderName.trim(),
          holderDocument: holderDocument.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert('Conta de recebimento configurada com sucesso!');
        setShowAccountModal(false);
        fetchSellerData();
      } else {
        setAccountError(data.error || 'Erro ao salvar conta de recebimento.');
      }
    } catch {
      setAccountError('Erro ao conectar com o servidor.');
    } finally {
      setAccountSaving(false);
    }
  };

  // Request Payout Submit
  const handleRequestPayout = async () => {
    setRequestError(null);
    setRequestLoading(true);

    try {
      const res = await fetch('/api/payouts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (res.ok) {
        setRequestSuccess(`Solicitação ${data.payoutRequest.requestNumber} enviada com sucesso! O repasse será realizado para sua conta cadastrada.`);
        setTimeout(() => {
          setShowRequestModal(false);
          setRequestSuccess(null);
        }, 2500);
        fetchSellerData();
      } else {
        setRequestError(data.error || 'Erro ao solicitar repasse.');
      }
    } catch {
      setRequestError('Erro ao comunicar com o servidor.');
    } finally {
      setRequestLoading(false);
    }
  };

  const pendingCents = wallet?.pendingBalanceCents ?? 0;
  const availableCents = wallet?.availableBalanceCents ?? 0;
  const totalPaidOut = wallet?.totalPaidOutCents ?? 0;
  const hasAccount = !!wallet?.payoutAccount;

  return (
    <div id="seller-dashboard-view" className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-emerald-500" />
            <span>Painel do Vendedor</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestão financeira transparente: controle de entregas, confirmações por código e repasses seguros.
          </p>
        </div>

        <button
          id="seller-new-listing-btn"
          onClick={() => onNavigate('sell')}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition-all self-start md:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Criar Novo Anúncio</span>
        </button>
      </div>

      {/* ÁREA DE SALDO VEND+ & CARTEIRA FINANCEIRA */}
      <div className="bg-gradient-to-br from-[#0B192C] to-[#1E3E62] text-white rounded-3xl p-6 sm:p-7 shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Saldo VEND+ & Repasses</h2>
              <p className="text-xs text-slate-300">
                Segurança ponta a ponta: repasses liberados somente após confirmação do código de recebimento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAccountModal(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600/80 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{hasAccount ? 'Alterar Conta de Recebimento' : 'Configurar Conta de Recebimento'}</span>
            </button>

            <button
              onClick={() => setShowRequestModal(true)}
              disabled={availableCents <= 0 || !hasAccount}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-black flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Receber meu Saldo</span>
            </button>
          </div>
        </div>

        {/* Financial Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Saldo Pendente */}
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
              <span>Saldo Pendente</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-amber-300 pt-1">
              {(pendingCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              Aguardando entrega e conferência do código de 4 dígitos pelo comprador.
            </p>
          </div>

          {/* Card 2: Saldo Disponível */}
          <div className="bg-slate-900/60 border border-emerald-500/40 rounded-2xl p-4 space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
              <span>Saldo Disponível</span>
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-emerald-300 pt-1">
              {(availableCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              {availableCents > 0
                ? 'Entrega confirmada pelo cliente! Pronto para solicitação de repasse.'
                : 'Nenhum valor disponível para repasse no momento.'}
            </p>
          </div>

          {/* Card 3: Total Repassado */}
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-sky-400 text-xs font-bold">
              <span>Total Recebido (Repasses)</span>
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-sky-300 pt-1">
              {(totalPaidOut / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              Valores já transferidos para sua conta cadastrada.
            </p>
          </div>

          {/* Card 4: Comissão VEND+ */}
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between text-rose-400 text-xs font-bold">
              <span>Comissão VEND+ ({userPlan === 'free' ? '7%' : '4%'})</span>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-rose-300 pt-1">
              {((wallet?.totalCommissionsCents ?? totalCommissionCents) / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              Retida automaticamente na plataforma conforme as regras de comissão.
            </p>
          </div>
        </div>

        {/* Account Status Snippet */}
        <div className="bg-slate-900/40 rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-400 block font-semibold">Conta de Recebimento Cadastrada:</span>
            {wallet?.payoutAccount ? (
              <p className="font-bold text-white">
                {wallet.payoutAccount.accountType === 'PIX' ? (
                  <>
                    <span className="text-emerald-400 font-black">PIX ({wallet.payoutAccount.pixKeyType})</span>: {wallet.payoutAccount.pixKey} • Titular: {wallet.payoutAccount.holderName}
                  </>
                ) : (
                  <>
                    <span className="text-sky-400 font-black">CONTA</span>: {wallet.payoutAccount.bankName} • Agência: {wallet.payoutAccount.agency} • Conta: {wallet.payoutAccount.accountNumber} • Titular: {wallet.payoutAccount.holderName}
                  </>
                )}
              </p>
            ) : (
              <p className="text-amber-300 font-bold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Nenhuma conta cadastrada. Configure sua chave Pix ou conta bancária para receber seus repasses.
              </p>
            )}
          </div>

          {!wallet?.payoutAccount && (
            <button
              onClick={() => setShowAccountModal(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs whitespace-nowrap transition cursor-pointer"
            >
              Configurar Agora
            </button>
          )}
        </div>
      </div>

      {/* PLAN LIMIT BAR */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Limite de Anúncios Ativos:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase">
              Plano {userPlan}
            </span>
          </div>

          <span className="text-xs font-black text-slate-900">
            {activeCount} de {maxQuota} anúncios ({quotaPercent}%)
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              quotaPercent >= 90 ? 'bg-rose-500' : quotaPercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${quotaPercent}%` }}
          />
        </div>
      </div>

      {/* HISTÓRICO DE REPASSES SOLICITADOS */}
      {wallet?.payoutRequests && wallet.payoutRequests.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <span>Histórico de Solicitações de Repasse</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Código</th>
                  <th className="pb-3">Data</th>
                  <th className="pb-3">Pedidos & Mercado Pago</th>
                  <th className="pb-3">Valor Líquido</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Data de Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {wallet.payoutRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="py-3 font-mono font-bold text-slate-900">{req.requestNumber}</td>
                    <td className="py-3 text-slate-500">
                      {new Date(req.requestedAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(req.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 text-slate-600">
                      {req.linkedOrders && req.linkedOrders.length > 0 ? (
                        <div className="space-y-1">
                          {req.linkedOrders.map((o) => (
                            <div key={o.orderId} className="flex items-center gap-1.5 font-mono text-[11px]">
                              <span className="font-bold text-slate-800">#{o.orderNumber}</span>
                              {o.mpPaymentId ? (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-50 text-sky-700 border border-sky-100">
                                  MP: {o.mpPaymentId}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">MP: pendente</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 font-black text-emerald-700">
                      {(req.netAmountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="py-3">
                      {req.status === 'PAID' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Pago na Conta
                        </span>
                      ) : req.status === 'PROCESSING' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          Em Processamento
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Solicitado
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right text-slate-500">
                      {req.paidAt ? new Date(req.paidAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SALES ORDERS LIST */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-sky-500" />
          <span>Pedidos de Venda Recebidos</span>
        </h2>

        {sales.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            Você ainda não recebeu pedidos de venda. Seus anúncios estão visíveis no marketplace!
          </p>
        ) : (
          <div className="space-y-3">
            {sales.map((order) => {
              const isDelivered = order.status === 'DELIVERED';
              const canVerifyCode =
                order.status === 'READY_FOR_PICKUP' ||
                order.status === 'IN_TRANSIT' ||
                order.status === 'OUT_FOR_DELIVERY' ||
                order.status === 'WAITING_CONFIRMATION' ||
                order.status === 'PREPARING';

              return (
                <div
                  key={order.id}
                  id={`seller-order-card-${order.id}`}
                  className="p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">
                      Pedido #{order.orderNumber} • Comprador: {order.buyer?.name}
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Bruto: {(order.totalGrossCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} |{' '}
                      Líquido vendedor: <strong className="text-emerald-700">{(order.sellerNetCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> |{' '}
                      Tipo: {order.deliveryType === 'PICKUP' ? 'Retirada no Local' : 'Entrega Local'}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        Status: {order.status}
                      </span>
                      {order.status === 'AWAITING_PAYMENT' || order.paymentStatus !== 'APPROVED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-500" />
                          Aguardando Pagamento Mercado Pago (Sem Saldo)
                        </span>
                      ) : (order.status === 'DELIVERED' && order.deliveryCodeUsed) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Repasse Disponível (Código Confirmado)
                        </span>
                      ) : order.payoutStatus === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                          <CheckCircle className="w-3 h-3" />
                          Repasse Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {order.status === 'DELIVERED'
                            ? 'Entregue — Aguardando Validação do Código de 4 Dígitos'
                            : 'Saldo em Escrow (Aguardando Entrega e Código)'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status transition buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {order.status === 'PAID' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'PREPARING')}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-2xs"
                      >
                        Iniciar Preparação
                      </button>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() =>
                          handleUpdateOrderStatus(
                            order.id,
                            order.deliveryType === 'PICKUP' ? 'READY_FOR_PICKUP' : 'IN_TRANSIT'
                          )
                        }
                        className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg text-xs cursor-pointer shadow-2xs"
                      >
                        {order.deliveryType === 'PICKUP' ? 'Pronto para Retirada' : 'Em Rota de Entrega'}
                      </button>
                    )}

                    {/* VALIDATE 4-DIGIT CODE BUTTON */}
                    {!isDelivered && canVerifyCode && (
                      <button
                        onClick={() => {
                          setCodeConfirmOrder(order);
                          setDeliveryCodeInput('');
                          setConfirmError(null);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Validar Código de Entrega</span>
                      </button>
                    )}

                    {isDelivered && (
                      <span className="px-3 py-1.5 bg-slate-100 text-slate-500 font-bold rounded-lg text-xs flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Entrega Concluída</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL CONFIGURAR CONTA DE RECEBIMENTO */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 relative my-8">
            <button
              onClick={() => setShowAccountModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <span>Conta de Recebimento dos Repasses</span>
              </h2>
              <p className="text-xs text-slate-500">
                Informe sua chave Pix ou dados bancários para onde os repasses do saldo VEND+ serão creditados.
              </p>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2 text-emerald-900 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Segurança Bancária VEND+</strong>: Nós NUNCA solicitamos senha bancária ou tokens de acesso. Apenas chave Pix ou dados da conta corrente para transferência.
              </span>
            </div>

            <form onSubmit={handleSavePayoutAccount} className="space-y-4 text-xs">
              {/* Type Switch */}
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAccountType('PIX')}
                  className={`flex-1 py-2 font-bold rounded-lg transition ${
                    accountType === 'PIX' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Chave Pix (Recomendado)
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('BANK_ACCOUNT')}
                  className={`flex-1 py-2 font-bold rounded-lg transition ${
                    accountType === 'BANK_ACCOUNT' ? 'bg-white text-slate-950 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Conta Bancária Tradicional
                </button>
              </div>

              {/* Titularidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Completo do Titular *</label>
                  <input
                    type="text"
                    required
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    placeholder="Nome igual ao documento"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CPF ou CNPJ do Titular *</label>
                  <input
                    type="text"
                    required
                    value={holderDocument}
                    onChange={(e) => setHolderDocument(e.target.value.replace(/\D/g, ''))}
                    placeholder="Apenas números"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {accountType === 'PIX' ? (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tipo de Chave *</label>
                      <select
                        value={pixKeyType}
                        onChange={(e) => setPixKeyType(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="CPF">CPF</option>
                        <option value="CNPJ">CNPJ</option>
                        <option value="EMAIL">E-mail</option>
                        <option value="PHONE">Telefone</option>
                        <option value="EVP">Chave Aleatória</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Chave Pix *</label>
                      <input
                        type="text"
                        required
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        placeholder="Informe sua chave Pix"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nome do Banco *</label>
                      <input
                        type="text"
                        required
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Ex: Nubank, Itaú, Bradesco"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tipo de Conta</label>
                      <select
                        value={accountTypeDetail}
                        onChange={(e) => setAccountTypeDetail(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="CORRENTE">Conta Corrente</option>
                        <option value="POUPANCA">Conta Poupança</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Agência *</label>
                      <input
                        type="text"
                        required
                        value={agency}
                        onChange={(e) => setAgency(e.target.value)}
                        placeholder="Ex: 0001"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Conta com Dígito *</label>
                      <input
                        type="text"
                        required
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Ex: 1234567-8"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {accountError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{accountError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={accountSaving}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-xl shadow-md transition cursor-pointer"
                >
                  {accountSaving ? 'Salvando...' : 'Salvar Conta de Recebimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SOLICITAR REPASSE DO SALDO DISPONÍVEL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 relative my-8">
            <button
              onClick={() => setShowRequestModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                <span>Solicitação de Repasse</span>
              </div>
              <h2 className="text-xl font-black text-slate-950 pt-1">
                Transferir Saldo Disponível
              </h2>
              <p className="text-xs text-slate-500">
                O valor liberado será transferido para sua conta cadastrada.
              </p>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1 text-center">
              <span className="text-xs text-emerald-800 font-semibold block">Valor a Receber</span>
              <div className="text-3xl font-black text-emerald-700">
                {(availableCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <span className="text-[10px] text-emerald-600">Comissões VEND+ de 7% já deduzidas</span>
            </div>

            {wallet?.payoutAccount && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
                <span className="text-slate-400 font-bold block">Destino da Transferência:</span>
                <p className="font-bold text-slate-800">
                  {wallet.payoutAccount.accountType === 'PIX'
                    ? `Chave Pix (${wallet.payoutAccount.pixKeyType}): ${wallet.payoutAccount.pixKey}`
                    : `${wallet.payoutAccount.bankName} • Ag: ${wallet.payoutAccount.agency} • Conta: ${wallet.payoutAccount.accountNumber}`}
                </p>
                <p className="text-[11px] text-slate-500">Titular: {wallet.payoutAccount.holderName}</p>
              </div>
            )}

            {requestSuccess && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{requestSuccess}</span>
              </div>
            )}

            {requestError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{requestError}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleRequestPayout}
                disabled={requestLoading || availableCents <= 0 || !!requestSuccess}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-xl shadow-md transition cursor-pointer"
              >
                {requestLoading ? 'Enviando...' : 'Confirmar Solicitação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VALIDAÇÃO DO CÓDIGO DE 4 DÍGITOS */}
      {codeConfirmOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 relative my-8">
            <button
              onClick={() => setCodeConfirmOrder(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                <KeyRound className="w-4 h-4 text-emerald-600" />
                <span>Confirmação Segura de Entrega</span>
              </div>
              <h2 className="text-xl font-black text-slate-950 pt-1">
                Validar Código do Pedido #{codeConfirmOrder.orderNumber}
              </h2>
              <p className="text-xs text-slate-500">
                Peça ao comprador os 4 dígitos que constam em "Meus Pedidos" dele.
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-1 text-xs text-amber-900">
              <p>
                Após digitar o código correto, a entrega será confirmada e o valor líquido de{' '}
                <strong>
                  {(codeConfirmOrder.sellerNetCents / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </strong>{' '}
                será <strong>LIBERADO PARA REPASSE</strong>!
              </p>
            </div>

            <form onSubmit={handleConfirmDeliveryCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código de 4 Dígitos do Comprador
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={deliveryCodeInput}
                  onChange={(e) => setDeliveryCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  autoFocus
                  className="w-full text-center text-3xl font-mono font-black tracking-widest py-3 px-4 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {confirmError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{confirmError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCodeConfirmOrder(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={confirmLoading || deliveryCodeInput.length !== 4}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  {confirmLoading ? 'Validando...' : 'Confirmar e Liberar Repasse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
