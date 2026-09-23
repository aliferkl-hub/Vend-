import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Truck,
  Package,
  CreditCard,
  MapPin,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowLeft,
  QrCode,
  Copy,
  RefreshCw,
  KeyRound,
  ExternalLink,
  X,
} from 'lucide-react';
import { CartItem, Address, Negotiation } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useCart } from '../context/CartContext.tsx';

interface CheckoutViewProps {
  negotiationItem?: Negotiation | null;
  onOrderCreated: (orderId: number) => void;
  onBack: () => void;
}

interface PixOrderData {
  orderId: number;
  orderNumber: string;
  paymentId: number;
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  amountFormatted: string;
  deliveryCode: string;
}

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  negotiationItem,
  onOrderCreated,
  onBack,
}) => {
  const { user } = useAuth();
  const { items: cartItems, clearCart } = useCart();

  // If coming from an accepted negotiation, build single item
  const checkoutItems: CartItem[] = negotiationItem
    ? [
        {
          id: `neg-${negotiationItem.id}`,
          productId: negotiationItem.productId || undefined,
          serviceId: negotiationItem.serviceId || undefined,
          type: negotiationItem.productId ? 'PRODUCT' : 'SERVICE',
          title: negotiationItem.product?.name || negotiationItem.service?.name || 'Item Negociado',
          priceCents: negotiationItem.finalAgreedPriceCents || negotiationItem.currentOfferCents,
          quantity: 1,
          imageUrl: negotiationItem.product?.imageUrl || negotiationItem.service?.imageUrl || '',
          sellerId: negotiationItem.sellerId,
        },
      ]
    : cartItems;

  const [deliveryType, setDeliveryType] = useState<'SHIPPING' | 'PICKUP'>('SHIPPING');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'MERCADO_PAGO_CHECKOUT'>('PIX');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  // Payer info for Mercado Pago
  const [payerCpf, setPayerCpf] = useState('');

  // New address form modal/toggle
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newRecipient, setNewRecipient] = useState(user?.name || '');
  const [newPhone, setNewPhone] = useState(user?.phone || '');
  const [newStreet, setNewStreet] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newComplement, setNewComplement] = useState('');
  const [newNeighborhood, setNewNeighborhood] = useState('');
  const [newCity, setNewCity] = useState(user?.location?.split(',')[0] || 'São Paulo');
  const [newState, setNewState] = useState('SP');
  const [newCep, setNewCep] = useState('');

  // Mercado Pago config check
  const [mpConfigured, setMpConfigured] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Pix Modal
  const [pixOrderModal, setPixOrderModal] = useState<PixOrderData | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentApproved, setPaymentApproved] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/addresses');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
        if (data.length > 0) {
          const defaultAddr = data.find((a: Address) => a.isDefault) || data[0];
          setSelectedAddressId(defaultAddr.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const checkPaymentGateway = async () => {
    try {
      const res = await fetch('/api/payments/config-status');
      if (res.ok) {
        const data = await res.json();
        setMpConfigured(Boolean(data.configured));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAddresses();
    checkPaymentGateway();
  }, []);

  // Poll status while Pix Modal is open
  useEffect(() => {
    if (!pixOrderModal || paymentApproved) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const checkOrderStatus = async () => {
      try {
        const res = await fetch(`/api/payments/status/${pixOrderModal.paymentId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.approved) {
            setPaymentApproved(true);
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        }
      } catch {
        // silent
      }
    };

    pollingRef.current = setInterval(checkOrderStatus, 3500);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pixOrderModal, paymentApproved]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: newRecipient,
          phone: newPhone,
          street: newStreet,
          number: newNumber,
          complement: newComplement,
          neighborhood: newNeighborhood,
          city: newCity,
          state: newState,
          postalCode: newCep,
          isDefault: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchAddresses();
        setSelectedAddressId(data.address.id);
        setShowNewAddress(false);
      } else {
        const d = await res.json();
        alert(d.error || 'Erro ao salvar endereço.');
      }
    } catch {
      alert('Erro de conexão ao salvar endereço.');
    }
  };

  const handleFinishOrder = async () => {
    setErrorMsg(null);
    if (!user) {
      setErrorMsg('Você precisa estar logado para finalizar o pedido.');
      return;
    }

    if (deliveryType === 'SHIPPING' && !selectedAddressId && addresses.length === 0) {
      setErrorMsg('Adicione ou selecione um endereço de entrega para continuar.');
      return;
    }

    setLoading(true);
    try {
      // Check gateway configuration before creating any order
      if (!mpConfigured) {
        setErrorMsg('O Mercado Pago precisa ser configurado com o Access Token de produção no painel do administrador antes de receber pagamentos reais.');
        setLoading(false);
        return;
      }

      const payload = {
        items: checkoutItems.map((it) => ({
          productId: it.productId,
          serviceId: it.serviceId,
          quantity: it.quantity,
        })),
        deliveryType,
        addressId: deliveryType === 'SHIPPING' ? selectedAddressId : null,
        acceptedNegotiationId: negotiationItem?.id || null,
        paymentMethod,
      };

      // 1. Create order in PostgreSQL
      const resOrder = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const orderData = await resOrder.json();
      if (!resOrder.ok) {
        setErrorMsg(orderData.error || 'Erro ao gerar pedido.');
        setLoading(false);
        return;
      }

      if (!negotiationItem) {
        clearCart();
      }

      const createdOrderId = orderData.orderId;
      const deliveryCode = orderData.deliveryCode || '••••';

      // 2. Process chosen payment method
      if (paymentMethod === 'PIX') {
        // Generate Real Mercado Pago Pix
        const resPix = await fetch('/api/payments/mercadopago/order/pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: createdOrderId,
            payer: {
              email: user.email,
              name: user.name,
              cpf: payerCpf,
            },
          }),
        });

        const pixData = await resPix.json();
        if (!resPix.ok) {
          setErrorMsg(pixData.error || 'Pedido criado, mas houve erro ao gerar o Pix no Mercado Pago.');
          // Even if Pix fails, navigate to order view so user can retry
          setTimeout(() => onOrderCreated(createdOrderId), 2000);
          return;
        }

        setPixOrderModal({
          orderId: createdOrderId,
          orderNumber: orderData.orderNumber || String(createdOrderId),
          paymentId: pixData.paymentId,
          qrCode: pixData.qrCode || '',
          qrCodeBase64: pixData.qrCodeBase64,
          ticketUrl: pixData.ticketUrl,
          amountFormatted: pixData.amountFormatted || 'R$ ' + (pixData.amount || 0).toFixed(2),
          deliveryCode,
        });
        setPaymentApproved(false);
      } else {
        // Mercado Pago Checkout Pro Preference (Card / Boleto / MP Account)
        const resPref = await fetch(`/api/payments/create-preference/${createdOrderId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        const prefData = await resPref.json();
        if (resPref.ok && prefData.initPoint) {
          window.location.href = prefData.initPoint;
        } else {
          onOrderCreated(createdOrderId);
        }
      }
    } catch {
      setErrorMsg('Erro de conexão ao processar o pagamento com o Mercado Pago.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPixCopiaECola = () => {
    if (!pixOrderModal) return;
    navigator.clipboard.writeText(pixOrderModal.qrCode);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  const handleManualCheckOrderStatus = async () => {
    if (!pixOrderModal) return;
    setCheckingPayment(true);
    try {
      const res = await fetch(`/api/payments/status/${pixOrderModal.paymentId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.approved) {
          setPaymentApproved(true);
        } else {
          alert('O Mercado Pago ainda está aguardando a confirmação do pagamento pelo seu banco.');
        }
      }
    } catch {
      alert('Erro ao consultar status no Mercado Pago.');
    } finally {
      setCheckingPayment(false);
    }
  };

  // Subtotal preview
  const subtotalCents = checkoutItems.reduce((s, it) => s + it.priceCents * it.quantity, 0);
  const shippingCents = deliveryType === 'SHIPPING' ? 1490 : 0;
  const totalCents = subtotalCents + shippingCents;

  return (
    <div id="checkout-view" className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>
        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>Checkout Seguro VEND+ Mercado Pago</span>
        </div>
      </div>

      <h1 className="text-2xl font-black text-slate-900">Finalizar Compra</h1>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Steps (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* STEP 1: Delivery Mode */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-sky-500" />
              1. Forma de Recebimento
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setDeliveryType('SHIPPING')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  deliveryType === 'SHIPPING'
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span>Entrega Local Segura</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">R$ 14,90</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Entregador parceiro leva até seu endereço com confirmação por código de 4 dígitos.
                </p>
              </div>

              <div
                onClick={() => setDeliveryType('PICKUP')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  deliveryType === 'PICKUP'
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                    <Package className="w-4 h-4 text-sky-600" />
                    <span>Retirada no Local</span>
                  </div>
                  <span className="text-xs font-black text-emerald-600 uppercase">Grátis</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Combine o ponto de retirada diretamente com o vendedor após a confirmação.
                </p>
              </div>
            </div>
          </div>

          {/* STEP 2: Address (if shipping) */}
          {deliveryType === 'SHIPPING' && (
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  2. Endereço de Entrega
                </h2>
                <button
                  type="button"
                  onClick={() => setShowNewAddress(!showNewAddress)}
                  className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Endereço</span>
                </button>
              </div>

              {/* Existing addresses */}
              {addresses.length > 0 && !showNewAddress && (
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`block p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        selectedAddressId === addr.id
                          ? 'border-emerald-500 bg-emerald-50/30'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-1 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-xs">
                          <p className="font-bold text-slate-900">{addr.recipientName}</p>
                          <p className="text-slate-600">
                            {addr.street}, {addr.number} {addr.complement && `(${addr.complement})`}
                          </p>
                          <p className="text-slate-500">
                            {addr.neighborhood} — {addr.city}/{addr.state} • CEP {addr.postalCode}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* New address form */}
              {(showNewAddress || addresses.length === 0) && (
                <form onSubmit={handleSaveAddress} className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nome do destinatário *"
                      required
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                    <input
                      type="tel"
                      placeholder="Telefone *"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Rua / Avenida *"
                      required
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="Número *"
                      required
                      value={newNumber}
                      onChange={(e) => setNewNumber(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Complemento (Apto, bloco...)"
                      value={newComplement}
                      onChange={(e) => setNewComplement(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Bairro *"
                      required
                      value={newNeighborhood}
                      onChange={(e) => setNewNeighborhood(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Cidade *"
                      required
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Estado (ex: SP) *"
                      maxLength={2}
                      required
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="CEP *"
                      required
                      value={newCep}
                      onChange={(e) => setNewCep(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    Salvar Endereço
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STEP 3: Payment Method / Mercado Pago */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-500" />
              3. Forma de Pagamento (Mercado Pago Oficial)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option A: Pix */}
              <div
                onClick={() => setPaymentMethod('PIX')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'PIX'
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Pix Instantâneo (QR Code Oficial)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">
                    Mais Rápido
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Gera QR Code e Pix Copia e Cola reais do Mercado Pago com confirmação instantânea.
                </p>
              </div>

              {/* Option B: Card / Checkout Pro */}
              <div
                onClick={() => setPaymentMethod('MERCADO_PAGO_CHECKOUT')}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'MERCADO_PAGO_CHECKOUT'
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                    <CreditCard className="w-4 h-4 text-sky-600" />
                    <span>Cartão / Mercado Pago Pro</span>
                  </div>
                  <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full uppercase">
                    Até 12x
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  Pague com cartão de crédito, saldo do Mercado Pago ou parcelado.
                </p>
              </div>
            </div>

            {/* Optional CPF for Pix */}
            {paymentMethod === 'PIX' && (
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  CPF do Pagador (Opcional — agiliza identificação no banco):
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={payerCpf}
                  onChange={(e) => setPayerCpf(e.target.value)}
                  className="w-full sm:w-64 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right column: Order Total and Confirmation (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Resumo da Compra
            </h3>

            {/* Items mini list */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto">
              {checkoutItems.map((it) => (
                <div key={it.id} className="flex items-center gap-2.5 text-xs">
                  <img src={it.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{it.title}</p>
                    <p className="text-[11px] text-slate-500">Qtd: {it.quantity}</p>
                  </div>
                  <span className="font-bold text-slate-900">
                    {((it.priceCents * it.quantity) / 100).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-bold text-slate-900">
                  {(subtotalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxa de Entrega:</span>
                <span className="font-bold text-slate-900">
                  {deliveryType === 'SHIPPING' ? 'R$ 14,90' : 'Grátis'}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
              <span className="text-sm font-black text-slate-900">Total a Pagar:</span>
              <span className="text-2xl font-black text-slate-950">
                {(totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            {!mpConfigured && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Gateway Mercado Pago Pendente
                </p>
                <p className="text-[11px] leading-relaxed">
                  As credenciais de produção do Mercado Pago ainda não foram configuradas pelo administrador. Para segurança da transação, pagamentos reais estão bloqueados até a configuração.
                </p>
              </div>
            )}

            <button
              id="confirm-order-btn"
              disabled={loading || !mpConfigured}
              onClick={handleFinishOrder}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-black rounded-xl text-sm shadow-md transition-all active:scale-[0.99] disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Conectando ao Mercado Pago...</span>
                </>
              ) : !mpConfigured ? (
                <>
                  <AlertCircle className="w-5 h-5 text-slate-400" />
                  <span>Aguardando Configuração do Mercado Pago</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Pagar com Mercado Pago</span>
                </>
              )}
            </button>

            {/* Security notice */}
            <div className="bg-slate-900 text-slate-200 p-3 rounded-xl text-[11px] space-y-1">
              <p className="font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Segurança Mercado Pago Garantida
              </p>
              <p className="text-slate-400 leading-snug">
                Seu dinheiro fica protegido até a entrega ser confirmada pelo código de 4 dígitos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* REAL PIX MERCADO PAGO MODAL FOR ORDER */}
      {pixOrderModal && (
        <div
          id="order-pix-modal"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 relative my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Close */}
            <button
              onClick={() => onOrderCreated(pixOrderModal.orderId)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            {!paymentApproved ? (
              <>
                {/* Header */}
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Mercado Pago Oficial — PIX Instantâneo</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-950 pt-1">
                    Pedido #{pixOrderModal.orderNumber}
                  </h2>
                  <p className="text-sm font-bold text-emerald-600">
                    Total: {pixOrderModal.amountFormatted}
                  </p>
                </div>

                {/* Status Indicator */}
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

                {/* QR Code image */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <img
                    src={
                      pixOrderModal.qrCodeBase64
                        ? `data:image/png;base64,${pixOrderModal.qrCodeBase64}`
                        : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
                            pixOrderModal.qrCode
                          )}`
                    }
                    alt="QR Code PIX Mercado Pago"
                    className="w-52 h-52 object-contain bg-white p-2 rounded-xl shadow-xs"
                  />
                  <span className="text-[11px] text-slate-500 mt-2 font-medium">
                    Abra o app do seu banco e aponte a câmera
                  </span>
                </div>

                {/* Copia e Cola */}
                <div className="space-y-1.5">
                  <button
                    id="copy-order-pix-btn"
                    onClick={handleCopyPixCopiaECola}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{pixCopied ? 'Código PIX Copiado com Sucesso!' : 'Copiar Código PIX (Copia e Cola)'}</span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 space-y-2">
                  <button
                    id="check-order-payment-btn"
                    disabled={checkingPayment}
                    onClick={handleManualCheckOrderStatus}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {checkingPayment ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Verificando no Mercado Pago...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 text-slate-950" />
                        <span>Verificar Pagamento Agora</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onOrderCreated(pixOrderModal.orderId)}
                    className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 text-center"
                  >
                    Concluir e acompanhar no Painel de Pedidos
                  </button>
                </div>
              </>
            ) : (
              /* Success / Approved Celebration State */
              <div className="text-center space-y-4 py-4 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-md">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Pagamento Confirmado no Mercado Pago!</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Seu pedido #{pixOrderModal.orderNumber} foi pago com sucesso e já está sendo preparado.
                  </p>
                </div>

                {/* Secret 4-digit PIN */}
                <div className="bg-gradient-to-r from-[#0B192C] to-[#162A45] text-white p-4 rounded-2xl space-y-2 border border-slate-800">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400">
                    <KeyRound className="w-4 h-4" />
                    <span>Seu Código Secreto de Entrega (4 Dígitos)</span>
                  </div>
                  <div className="font-mono text-3xl font-black text-emerald-400 tracking-widest bg-emerald-500/20 py-2 rounded-xl border border-emerald-500/40">
                    {pixOrderModal.deliveryCode}
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Guarde este código! Informe ao entregador SOMENTE após receber seu produto na porta.
                  </p>
                </div>

                <button
                  onClick={() => onOrderCreated(pixOrderModal.orderId)}
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm shadow-md"
                >
                  Ver Meus Pedidos
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
