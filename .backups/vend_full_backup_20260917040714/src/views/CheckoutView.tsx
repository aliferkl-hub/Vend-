import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { CartItem, Address, Negotiation } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useCart } from '../context/CartContext.tsx';

interface CheckoutViewProps {
  negotiationItem?: Negotiation | null;
  onOrderCreated: (orderId: number) => void;
  onBack: () => void;
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
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

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
  const [mpConfigured, setMpConfigured] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      const payload = {
        items: checkoutItems.map((it) => ({
          productId: it.productId,
          serviceId: it.serviceId,
          quantity: it.quantity,
        })),
        deliveryType,
        addressId: deliveryType === 'SHIPPING' ? selectedAddressId : null,
        acceptedNegotiationId: negotiationItem?.id || null,
      };

      const res = await fetch('/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao gerar pedido.');
        setLoading(false);
        return;
      }

      if (!negotiationItem) {
        clearCart();
      }

      onOrderCreated(data.orderId);
    } catch {
      setErrorMsg('Erro de conexão com o servidor de pedidos.');
    } finally {
      setLoading(false);
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
          <span>Checkout Seguro VEND+</span>
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
                          name="selectedAddress"
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-1 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div className="text-xs space-y-0.5 text-slate-700">
                          <p className="font-bold text-slate-900">
                            {addr.recipientName} • {addr.phone}
                          </p>
                          <p>
                            {addr.street}, nº {addr.number} {addr.complement ? `- ${addr.complement}` : ''}
                          </p>
                          <p className="text-slate-500">
                            {addr.neighborhood}, {addr.city} - {addr.state} (CEP: {addr.postalCode})
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Form to add address */}
              {(showNewAddress || addresses.length === 0) && (
                <form onSubmit={handleSaveAddress} className="bg-slate-50 p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold text-slate-900">Cadastrar Endereço:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Nome de quem vai receber *"
                      required
                      value={newRecipient}
                      onChange={(e) => setNewRecipient(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Telefone / WhatsApp *"
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

          {/* STEP 3: Payment Notice / Mercado Pago */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-500" />
              3. Forma de Pagamento
            </h2>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>Mercado Pago Oficial (PIX Instantâneo, Cartão ou Boleto)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Ao clicar em &quot;Confirmar e Gerar Pedido&quot;, o pedido será registrado de forma segura no banco de dados com seu código exclusivo de entrega de 4 dígitos.
              </p>

              {!mpConfigured && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs">
                  <strong>Aviso de Configuração:</strong> O token do Mercado Pago ainda precisa ser preenchido nas variáveis de ambiente (<code className="font-mono">MERCADOPAGO_ACCESS_TOKEN</code>) para processar transações reais de cartão/PIX. O pedido será registrado normalmente em modo seguro no banco de dados PostgreSQL.
                </div>
              )}
            </div>
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

            <button
              id="confirm-order-btn"
              disabled={loading}
              onClick={handleFinishOrder}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{loading ? 'Gerando Pedido...' : 'Confirmar e Gerar Pedido'}</span>
            </button>

            {/* Security notice */}
            <div className="bg-slate-900 text-slate-200 p-3 rounded-xl text-[11px] space-y-1">
              <p className="font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Código de 4 Dígitos Gerado Automaticamente
              </p>
              <p className="text-slate-400 leading-snug">
                Você receberá seu PIN exclusivo na tela de confirmação e no painel de pedidos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
