import React, { useState } from 'react';
import {
  MapPin,
  Truck,
  Package,
  MessageSquare,
  ShieldCheck,
  Heart,
  Share2,
  ArrowLeft,
  Store as StoreIcon,
  CheckCircle,
  AlertTriangle,
  ShoppingBag,
  ZoomIn,
  X,
} from 'lucide-react';
import { Product, DirectBuyIntent } from '../types.ts';
import { useCart } from '../context/CartContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import { NegotiationModal } from '../components/NegotiationModal.tsx';
import { ShareBar } from '../components/ShareBar.tsx';
import { marketingService } from '../services/marketingService.ts';

interface ProductDetailViewProps {
  product: Product;
  onBack: () => void;
  onBuyNow: (intent: DirectBuyIntent) => void;
  onNavigateToStore?: (slug: string) => void;
  onNegotiationStarted: (negotiationId: number) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  onBack,
  onBuyNow,
  onNavigateToStore,
  onNegotiationStarted,
}) => {
  const { addItem } = useCart();
  const { user } = useAuth();

  const allImagesList = React.useMemo(() => {
    const list: string[] = [];
    if (product.imageUrl) list.push(product.imageUrl);

    const extra = (product.productImages || product.images || []) as any[];
    extra.forEach((img) => {
      const u = typeof img === 'string' ? img : img.url || img.imageUrl;
      if (u && !list.includes(u)) {
        list.push(u);
      }
    });

    return list.length > 0 ? list : [product.imageUrl];
  }, [product]);

  const [activeImage, setActiveImage] = useState<string>(product.imageUrl || allImagesList[0]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isNegModalOpen, setIsNegModalOpen] = useState(false);
  const [addedToast, setAddedToast] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  React.useEffect(() => {
    marketingService.trackEvent({
      eventType: 'page_view',
      landingPath: `/produto/${product.id}`,
      productId: product.id,
      storeId: product.storeId || undefined,
    });
    const originalTitle = document.title;
    document.title = `${product.name} — VEND+`;
    return () => {
      document.title = originalTitle;
    };
  }, [product.id, product.name, product.storeId]);

  const productShareUrl = React.useMemo(() => {
    return marketingService.buildProductShareUrl(product.slug || product.id, 'whatsapp');
  }, [product.id, product.slug]);

  const formattedPrice = (product.priceCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const formattedOriginalPrice = product.originalPriceCents
    ? (product.originalPriceCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    : null;

  const discountPercent = product.originalPriceCents
    ? Math.round(((product.originalPriceCents - product.priceCents) / product.originalPriceCents) * 100)
    : 0;

  const handleAddToCart = () => {
    if (product.stock <= 0) {
      return;
    }

    const res = addItem({
      productId: product.id,
      type: 'PRODUCT',
      title: product.name,
      name: product.name,
      priceCents: product.priceCents,
      price: product.priceCents / 100,
      quantity: 1,
      imageUrl: product.imageUrl,
      image: product.imageUrl,
      sellerId: product.sellerId,
      sellerName: product.seller?.name || 'Vendedor VEND+',
      stock: product.stock,
    });

    if (res.success) {
      setAddedToast(true);
      setTimeout(() => setAddedToast(false), 3000);
    }
  };

  const handleBuyNow = () => {
    if (product.stock <= 0) {
      return;
    }

    const qty = 1;
    const subtotal = product.priceCents * qty;
    const initialDeliveryType: 'SHIPPING' | 'PICKUP' = product.offersDelivery ? 'SHIPPING' : 'PICKUP';
    const shippingFee = initialDeliveryType === 'SHIPPING' ? 1490 : 0;

    const intent: DirectBuyIntent = {
      intentId: `BUY_NOW_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      productId: product.id,
      sellerId: product.sellerId,
      sellerName: product.seller?.name || 'Vendedor VEND+',
      buyerId: user?.id,
      name: product.name,
      title: product.name,
      image: product.imageUrl,
      imageUrl: product.imageUrl,
      unitPriceCents: product.priceCents,
      priceCents: product.priceCents,
      quantity: qty,
      variations: null,
      subtotalCents: subtotal,
      deliveryType: initialDeliveryType,
      shippingFeeCents: shippingFee,
      totalCents: subtotal + shippingFee,
      createdAt: new Date().toISOString(),
    };

    onBuyNow(intent);
  };

  const handleStartOffer = async (offerCents: number, message: string): Promise<boolean> => {
    if (!user) {
      alert('Faça login ou crie uma conta para negociar este produto.');
      return false;
    }

    try {
      const res = await fetch('/api/negotiations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          offerCents,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao enviar proposta.');
        return false;
      }

      alert('Proposta enviada ao vendedor com sucesso!');
      onNegotiationStarted(data.negotiationId);
      return true;
    } catch {
      alert('Erro de conexão ao enviar proposta.');
      return false;
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      alert('Entre na sua conta para salvar favoritos.');
      return;
    }
    try {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemType: 'PRODUCT', itemId: product.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsFavorited(data.favorited);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="product-detail-view" className="space-y-6 pb-20">
      {/* Back button */}
      <button
        id="product-back-btn"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para listagem</span>
      </button>

      {/* Main product grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Images (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-2xs overflow-hidden">
            <div className="aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 relative flex items-center justify-center group">
              <img
                src={activeImage}
                alt={product.name}
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />

              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-xs transition shadow-sm"
                title="Ampliar foto"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                    product.condition === 'NOVO'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-900/90 text-white'
                  }`}
                >
                  {product.condition === 'NOVO' ? 'Produto Novo' : 'Produto Usado'}
                </span>
                {product.stock <= 0 && (
                  <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                    Sem Estoque
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Additional thumbnails if available */}
          {allImagesList.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {allImagesList.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(imgUrl)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 bg-slate-50 flex items-center justify-center transition ${
                    activeImage === imgUrl ? 'border-sky-500 ring-2 ring-sky-200' : 'border-slate-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}

          {/* Description Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-3">
            <h3 className="text-base font-black text-slate-900">Descrição do Produto</h3>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {product.description}
            </div>
          </div>
        </div>

        {/* Right column: Purchase & Seller actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5">
            {/* Category & Location */}
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-md">
                {product.category?.name || 'Geral'}
              </span>
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {product.location}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-black text-slate-950 leading-tight">
              {product.name}
            </h1>

            {/* Price Box */}
            <div className="pt-2 border-t border-slate-100">
              {discountPercent > 0 && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-400 line-through">
                    {formattedOriginalPrice}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {discountPercent}% OFF
                  </span>
                </div>
              )}
              <div className="text-3xl font-black text-slate-950">
                {formattedPrice}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Pagamento seguro via PIX, Boleto ou Cartão com confirmação por código de 4 dígitos.
              </p>
            </div>

            {/* Delivery & Pickup checks */}
            <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-medium text-slate-700">
                <Truck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  {product.offersDelivery
                    ? 'Entrega Local disponível (código de 4 dígitos na entrega)'
                    : 'Entrega não disponível para este item'}
                </span>
              </div>
              <div className="flex items-center gap-2 font-medium text-slate-700">
                <Package className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <span>
                  {product.offersPickup
                    ? 'Retirada em mãos disponível com o vendedor'
                    : 'Apenas entrega'}
                </span>
              </div>
            </div>

            {/* Actions: Buy Now, Add to Cart, Negotiate */}
            <div className="space-y-2.5 pt-2">
              {product.stock <= 0 ? (
                <>
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>Produto VEND+ — sem estoque no momento</span>
                  </div>

                  <button
                    id="buy-now-btn"
                    disabled
                    className="w-full py-3.5 bg-slate-200 text-slate-400 font-bold rounded-xl text-sm cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>Produto VEND+ — sem estoque no momento</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="add-to-cart-btn"
                      disabled
                      className="py-2.5 bg-slate-100 text-slate-400 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Sem estoque</span>
                    </button>

                    {product.allowsNegotiation ? (
                      <button
                        id="open-negotiate-btn"
                        onClick={() => setIsNegModalOpen(true)}
                        className="py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold border border-amber-200 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4 text-amber-600" />
                        <span>Negociar Preço</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="py-2.5 bg-slate-100 text-slate-400 font-medium rounded-xl text-xs flex items-center justify-center gap-1 cursor-not-allowed"
                      >
                        <span>Preço Fixo</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <button
                    id="buy-now-btn"
                    onClick={handleBuyNow}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm shadow-md transition-transform active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <span>Comprar Agora</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="add-to-cart-btn"
                      onClick={handleAddToCart}
                      className="py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold border border-sky-200 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Adicionar ao Carrinho</span>
                    </button>

                    {product.allowsNegotiation ? (
                      <button
                        id="open-negotiate-btn"
                        onClick={() => setIsNegModalOpen(true)}
                        className="py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold border border-amber-200 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4 text-amber-600" />
                        <span>Negociar Preço</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="py-2.5 bg-slate-100 text-slate-400 font-medium rounded-xl text-xs flex items-center justify-center gap-1 cursor-not-allowed"
                      >
                        <span>Preço Fixo</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Favorite & Share */}
              <div className="flex items-center justify-between pt-1">
                <button
                  id="fav-detail-btn"
                  onClick={handleToggleFavorite}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-rose-500 transition-colors"
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{isFavorited ? 'Salvo nos favoritos' : 'Favoritar produto'}</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link do produto copiado!');
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Compartilhar</span>
                </button>
              </div>

              {addedToast && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Produto adicionado ao carrinho com sucesso!</span>
                </div>
              )}
            </div>

            {/* Seller profile box */}
            {product.seller && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Informações do Vendedor
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                      {product.seller.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{product.seller.name}</h4>
                      <p className="text-[11px] text-slate-500">{product.seller.location || 'Brasil'}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                    {product.seller.planSlug ? `Plano ${product.seller.planSlug}` : 'Vendedor'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Social Sharing & QR Code */}
          <ShareBar
            title={product.name}
            shareText={`Confira ${product.name} por ${formattedPrice} no VEND+:`}
            url={productShareUrl}
            type="PRODUCT"
          />

          {/* Safety & Protocol Banner */}
          <div className="bg-[#0B192C] text-slate-200 rounded-2xl p-4 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Proteção Contra Golpes VEND+</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Nunca pague fora do marketplace VEND+. Ao receber sua compra com o entregador, passe o código de 4 dígitos somente após verificar o produto.
            </p>
          </div>
        </div>
      </div>

      {/* Negotiation Modal */}
      <NegotiationModal
        item={product}
        itemType="PRODUCT"
        isOpen={isNegModalOpen}
        onClose={() => setIsNegModalOpen(false)}
        onSubmitOffer={handleStartOffer}
      />

      {/* Lightbox Zoom Modal */}
      {isLightboxOpen && (
        <div
          id="product-detail-lightbox"
          onClick={() => setIsLightboxOpen(false)}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-2 rounded-full bg-white/10"
              title="Fechar"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activeImage}
              alt={product.name}
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
