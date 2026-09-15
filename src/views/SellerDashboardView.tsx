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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Order, Product } from '../types.ts';

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
  const [loading, setLoading] = useState(true);

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
      // Fetch sales orders
      const resSales = await fetch('/api/orders/my?tipo=vendas');
      if (resSales.ok) {
        const dataSales = await resSales.json();
        setSales(dataSales);
      }

      // Fetch active products
      const resProducts = await fetch('/api/products?limit=50');
      if (resProducts.ok) {
        const dataProducts = await resProducts.json();
        // Filter my products
        const mine = (dataProducts.items || []).filter((p: Product) => p.sellerId === user?.id);
        setMyProducts(mine);
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

  const totalGrossCents = sales.reduce((sum, s) => sum + s.totalGrossCents, 0);
  const totalCommissionCents = sales.reduce((sum, s) => sum + s.commissionCents, 0);
  const totalNetCents = sales.reduce((sum, s) => sum + s.sellerNetCents, 0);

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
            Gestão completa de vendas, produtos, comissões e saldo líquido
          </p>
        </div>

        <button
          id="seller-new-listing-btn"
          onClick={() => onNavigate('sell')}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition-all self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Criar Novo Anúncio</span>
        </button>
      </div>

      {/* PLAN LIMIT BAR (Section 14) */}
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

        {quotaPercent >= 80 && (
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-amber-700 font-semibold">
              Você está próximo do limite do seu plano ({userPlan}).
            </span>
            <button
              onClick={() => onNavigate('plans')}
              className="text-sky-600 font-bold hover:underline"
            >
              Fazer Upgrade de Plano →
            </button>
          </div>
        )}
      </div>

      {/* FINANCIAL METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Bruto em Vendas
          </span>
          <div className="text-2xl font-black text-slate-950">
            {(totalGrossCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-[11px] text-slate-400">{sales.length} pedidos recebidos</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Comissão VEND+ ({userPlan === 'free' ? '7%' : '4%'})
          </span>
          <div className="text-2xl font-black text-rose-600">
            {(totalCommissionCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-[11px] text-slate-400">Retida automaticamente na plataforma</p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Saldo Líquido do Vendedor
          </span>
          <div className="text-2xl font-black text-emerald-600">
            {(totalNetCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>
          <p className="text-[11px] text-slate-400">Liberado após confirmação de entrega</p>
        </div>
      </div>

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
            {sales.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    Pedido #{order.orderNumber} • Comprador: {order.buyer?.name}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Valor bruto: {(order.totalGrossCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} |{' '}
                    Líquido vendedor: <strong className="text-emerald-700">{(order.sellerNetCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    Status: {order.status}
                  </span>
                </div>

                {/* Status transition buttons */}
                <div className="flex items-center gap-2">
                  {order.status === 'PAID' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, 'PREPARING')}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                    >
                      Iniciar Preparação
                    </button>
                  )}
                  {order.status === 'PREPARING' && (
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, 'READY_FOR_PICKUP')}
                      className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-xs"
                    >
                      Pronto para Envio / Retirada
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
