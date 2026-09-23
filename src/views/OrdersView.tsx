import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff,
  QrCode,
  Copy,
  RefreshCw,
  X,
  CreditCard,
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

  // Mercado Pago Payment modal for awaiting payment orders
  const [activePaymentOrder, setActivePaymentOrder] = useState<any | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

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

  // Poll for payment completion while payment modal is open
  useEffect(() => {
    if (!activePaymentOrder) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const checkOrderStatus = async () => {
      try {
        const res = await fetch(`/api/payments/order/${activePaymentOrder.orderId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.approved || data.orderStatus === 'PAID') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            alert('Pagamento confirmado com sucesso pelo Mercado Pago!');
            setActivePaymentOrder(null);
            await fetchOrders();
          }
        }
      } catch {
        // silent
      }
    };

    pollingRef.current = setInterval(checkOrderStatus, 4000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activePaymentOrder]);

  const handleOpenPayment = async (order: Order) => {
    try {
      const res = await fetch('/api/payments/mercadopago/order/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          payer: { email: user?.email, name: user?.name },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setActivePaymentOrder({
          orderId: order.id,
          orderNumber: order.orderNumber,
          amountFormatted: (order.totalGrossCents / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }),
          paymentId: data.paymentId,
          qrCode: data.qrCode,
          qrCodeBase64: data.qrCodeBase64,
          ticketUrl: data.ticketUrl,
        });
        setPixCopied(false);
      } else {
        alert(data.error || 'Erro ao gerar pagamento no Mercado Pago.');
      }
    } catch {
      alert('Erro de conexão com o Mercado Pago.');
    }
  };

  const handlePayCheckoutPro = async (orderId: number) => {
    try {
      const res = await fetch(`/api/payments/create-preference/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.initPoint) {
        window.location.href = data.initPoint;
      } else {
        alert(data.error || 'Erro ao abrir Checkout Pro.');
      }
    } catch {
      alert('Erro ao conectar com Mercado Pago.');
    }
  };

  const handleManualCheckStatus = async () => {
    if (!activePaymentOrder) return;
    setCheckingPayment(true);
    try {
      const res = await fetch(`/api/payments/order/${activePaymentOrder.orderId}/status`);
      const data = await res.json();
      if (data.approved || data.orderStatus === 'PAID') {
        alert('Pagamento aprovado pelo Mercado Pago!');
        setActivePaymentOrder(null);
        await fetchOrders();
      } else {
        alert('O Mercado Pago ainda está aguardando o pagamento.');
      }
    } catch {
      alert('Erro ao consultar status no Mercado Pago.');
    } finally {
      setCheckingPayment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AWAITING_PAYMENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            <span>Aguardando Pagamento Mercado Pago</span>
          </span>
        );
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Pago — Em Separação</span>
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Truck className="w-3.5 h-3.5" />
            <span>Em Trânsito com Entregador</span>
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Entregue com Sucesso</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Cancelado</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div id="orders-view" className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Meus Pedidos</h1>
        <p className="text-xs text-slate-500 mt-1">
          Acompanhe suas compras, status de pagamento Mercado Pago e códigos seguros de entrega de 4 dígitos.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Carregando pedidos...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Você ainda não fez nenhum pedido</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Explore o marketplace do VEND+, compre de lojas e vendedores locais com entrega segura.
            </p>
          </div>
          <button
            onClick={() => onNavigate('marketplace')}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-sm cursor-pointer"
          >
            Explorar Produtos
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isDelivered = order.status === 'DELIVERED';
            const isAwaitingPayment = order.status === 'AWAITING_PAYMENT';
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
                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.status)}
                    {isAwaitingPayment && (
                      <button
                        onClick={() => handleOpenPayment(order)}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Pagar Agora</span>
                      </button>
                    )}
                  </div>
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
                {order.deliveryType === 'SHIPPING' && !isAwaitingPayment && (
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
                    <span className="text-slate-500">{isAwaitingPayment ? 'Total a Pagar: ' : 'Total: '}</span>
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

      {/* MODAL PAGAMENTO MERCADO PAGO DO PEDIDO */}
      {activePaymentOrder && (
        <div
          id="order-payment-modal"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setActivePaymentOrder(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Pagar Pedido via Mercado Pago</span>
              </div>
              <h2 className="text-xl font-black text-slate-950 pt-1">
                Pedido #{activePaymentOrder.orderNumber}
              </h2>
              <p className="text-sm font-bold text-emerald-600">
                Valor: {activePaymentOrder.amountFormatted}
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-amber-900 text-xs font-bold">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <span>Aguardando transferência Pix</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-amber-700 font-normal">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Auto-verificando</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <img
                src={
                  activePaymentOrder.qrCodeBase64
                    ? `data:image/png;base64,${activePaymentOrder.qrCodeBase64}`
                    : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
                        activePaymentOrder.qrCode
                      )}`
                }
                alt="QR Code PIX Mercado Pago"
                className="w-52 h-52 object-contain bg-white p-2 rounded-xl shadow-xs"
              />
              <span className="text-[11px] text-slate-500 mt-2 font-medium">
                Abra o app do seu banco e aponte a câmera
              </span>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(activePaymentOrder.qrCode);
                setPixCopied(true);
                setTimeout(() => setPixCopied(false), 3000);
              }}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>{pixCopied ? 'Código PIX Copiado com Sucesso!' : 'Copiar Código PIX (Copia e Cola)'}</span>
            </button>

            <div className="pt-2 space-y-2">
              <button
                disabled={checkingPayment}
                onClick={handleManualCheckStatus}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {checkingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Consultando Mercado Pago...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-slate-950" />
                    <span>Verificar Pagamento Agora</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handlePayCheckoutPro(activePaymentOrder.orderId)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pagar com Cartão / Checkout Pro Mercado Pago</span>
              </button>

              <button
                onClick={() => setActivePaymentOrder(null)}
                className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 text-center"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
