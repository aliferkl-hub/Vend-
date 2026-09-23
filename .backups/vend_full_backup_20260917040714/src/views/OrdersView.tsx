import React, { useState, useEffect } from 'react';
import {
  Package,
  Truck,
  ShieldCheck,
  CheckCircle,
  Clock,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  ShoppingBag,
} from 'lucide-react';
import { Order } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface OrdersViewProps {
  onNavigate: (view: string) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedCodeOrderId, setRevealedCodeOrderId] = useState<number | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders/my');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-xs font-bold">Entregue</span>;
      case 'OUT_FOR_DELIVERY':
        return <span className="bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse">Saiu para Entrega</span>;
      case 'IN_TRANSIT':
        return <span className="bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full text-xs font-bold">Em Transporte</span>;
      case 'PREPARING':
        return <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-bold">Em Preparação</span>;
      case 'PAID':
        return <span className="bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full text-xs font-bold">Pagamento Aprovado</span>;
      case 'CANCELLED':
        return <span className="bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full text-xs font-bold">Cancelado</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full text-xs font-bold">Aguardando Pagamento</span>;
    }
  };

  return (
    <div id="orders-view" className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Package className="w-6 h-6 text-sky-500" />
          <span>Meus Pedidos de Compra</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Acompanhe o status e visualize seu código exclusivo de 4 dígitos para liberação da entrega
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400">
          Carregando pedidos...
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Você ainda não fez nenhum pedido</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Visite a página inicial para explorar produtos e ofertas disponíveis perto de você.
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs"
          >
            Explorar Produtos
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isDelivered = order.status === 'DELIVERED';
            const isRevealed = revealedCodeOrderId === order.id;

            return (
              <div
                key={order.id}
                id={`order-card-${order.id}`}
                className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-5"
              >
                {/* Header: Number & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Pedido #{order.orderNumber}
                    </span>
                    <p className="text-xs text-slate-500">
                      Realizado em {new Date(order.createdAt).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-14 h-14 rounded-xl object-cover bg-slate-100 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                        <p className="text-[11px] text-slate-500">
                          Quantidade: {item.quantity} ×{' '}
                          {(item.unitPriceCents / 100).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </p>
                      </div>
                      <span className="text-xs font-black text-slate-900">
                        {(item.subtotalCents / 100).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CRITICAL: 4-Digit Delivery Code Box */}
                {order.deliveryType === 'SHIPPING' && (
                  <div
                    id={`delivery-code-box-${order.id}`}
                    className={`rounded-2xl p-4 border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                      isDelivered
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-gradient-to-r from-[#0B192C] to-[#162A45] text-white border-slate-800'
                    }`}
                  >
                    <div className="space-y-1 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-emerald-400">
                        <KeyRound className="w-4 h-4" />
                        <span>Código Secreto de Entrega (4 Dígitos)</span>
                      </div>
                      <p className={`text-[11px] ${isDelivered ? 'text-slate-500' : 'text-slate-300'} max-w-md`}>
                        {isDelivered
                          ? 'Código já utilizado e entrega finalizada com sucesso.'
                          : 'Atenção: informe estes 4 dígitos ao entregador SOMENTE após receber e conferir o pacote na sua porta!'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`font-mono text-2xl sm:text-3xl font-black tracking-widest px-4 py-2 rounded-xl shadow-xs ${
                          isDelivered
                            ? 'bg-slate-200 text-slate-500 line-through'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        {isDelivered ? 'UTILIZADO' : isRevealed ? order.deliveryCode : '• • • •'}
                      </div>

                      {!isDelivered && (
                        <button
                          type="button"
                          onClick={() => setRevealedCodeOrderId(isRevealed ? null : order.id)}
                          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                          title={isRevealed ? 'Ocultar código' : 'Revelar código'}
                        >
                          {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer Total */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="text-slate-500">
                    <span>Forma: </span>
                    <strong className="text-slate-700">
                      {order.deliveryType === 'SHIPPING' ? 'Entrega Local' : 'Retirada no Local'}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500">Total Pago: </span>
                    <span className="text-base font-black text-slate-950">
                      {(order.totalGrossCents / 100).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
