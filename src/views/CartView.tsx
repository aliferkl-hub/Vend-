import React from 'react';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';

interface CartViewProps {
  onProceedToCheckout: () => void;
  onContinueShopping: () => void;
}

export const CartView: React.FC<CartViewProps> = ({
  onProceedToCheckout,
  onContinueShopping,
}) => {
  const { items, removeItem, updateQuantity, clearCart, subtotalCents, totalItemsCount } = useCart();

  const formattedSubtotal = (subtotalCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  if (items.length === 0) {
    return (
      <div id="empty-cart-view" className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Seu carrinho está vazio</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Explore os produtos locais disponíveis no marketplace VEND+ e adicione itens ao seu carrinho.
        </p>
        <button
          id="cart-continue-shopping-btn"
          onClick={onContinueShopping}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-6 py-3 rounded-xl font-bold text-xs transition-colors"
        >
          Explorar Produtos
        </button>
      </div>
    );
  }

  return (
    <div id="cart-view" className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-sky-500" />
            <span>Meu Carrinho ({totalItemsCount})</span>
          </h1>
          <p className="text-xs text-slate-500">Revise seus itens antes de prosseguir para a entrega</p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Limpar carrinho</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Items List (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              id={`cart-item-${item.id}`}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center gap-4"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-16 h-16 rounded-xl object-cover bg-slate-100 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-slate-900 truncate">{item.title}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Vendedor: <span className="font-semibold text-slate-700">{item.sellerName || 'Local'}</span>
                </p>
                <div className="text-sm font-black text-slate-950 mt-1">
                  {((item.priceCents * item.quantity) / 100).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </div>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-slate-700 hover:bg-slate-200"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-bold text-slate-900 px-1">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-slate-700 hover:bg-slate-200"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeItem(item.id)}
                className="text-slate-400 hover:text-rose-500 p-1 rounded-lg"
                title="Remover item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={onContinueShopping}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 pt-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continuar Comprando</span>
          </button>
        </div>

        {/* Order Summary (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Resumo do Pedido
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal dos itens:</span>
                <span className="font-bold text-slate-900">{formattedSubtotal}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Frete / Entrega:</span>
                <span className="font-bold text-emerald-600">Calculado no checkout</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-900">Total Previsto:</span>
              <span className="text-xl font-black text-slate-950">{formattedSubtotal}</span>
            </div>

            <button
              id="cart-checkout-btn"
              onClick={onProceedToCheckout}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>Ir para o Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Protegido por código de 4 dígitos na entrega</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
