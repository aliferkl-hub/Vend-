import React, { useState, useEffect } from 'react';
import {
  Store,
  ArrowLeft,
  Share2,
  ShieldCheck,
  Truck,
  CreditCard,
  MessageCircle,
  HelpCircle,
  ShoppingBag,
  ExternalLink,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  ChevronDown,
  Plus,
  Minus,
  Check,
} from 'lucide-react';
import { useCart } from '../context/CartContext.tsx';
import { ResponsiveProductImage } from '../components/ResponsiveProductImage.tsx';

interface StoreFrontViewProps {
  storeSlug: string;
  onNavigate: (view: string, data?: any) => void;
}

export const StoreFrontView: React.FC<StoreFrontViewProps> = ({ storeSlug, onNavigate }) => {
  const { addItem } = useCart();

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadStore() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/stores/${storeSlug}`);
        if (!res.ok) {
          throw new Error('Loja não encontrada ou indisponível.');
        }
        const data = await res.json();
        setStoreData(data);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar loja.');
      } finally {
        setLoading(false);
      }
    }

    if (storeSlug) {
      loadStore();
    }
  }, [storeSlug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!storeData) return;
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(
      `Olá! Dá uma olhada nessa loja oficial no VEND+:\n*${storeData.name}*\n${storeData.themeConfig?.slogan || ''}\n\n👉 Acesse: `
    );
    window.open(`https://api.whatsapp.com/send?text=${text}${url}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Carregando loja virtual...</p>
        </div>
      </div>
    );
  }

  if (error || !storeData) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4 text-center">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <Store className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Loja Não Encontrada</h2>
          <p className="text-xs text-slate-500">{error || 'Esta loja pode ter sido pausada ou o endereço digitado está incorreto.'}</p>
          <button
            onClick={() => onNavigate('home')}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold transition"
          >
            Voltar ao Marketplace Geral VEND+
          </button>
        </div>
      </div>
    );
  }

  const theme = storeData.themeConfig || {};
  const colors = theme.colors || {
    primary: '#0F172A',
    secondary: '#0284C7',
    accent: '#10B981',
  };

  const products = storeData.products || [];

  // Filter products by category
  const filteredProducts =
    selectedCategory === 'ALL'
      ? products
      : products.filter((p: any) => p.category?.name === selectedCategory || p.categorySlug === selectedCategory);

  // Categories list
  const categoryNames = Array.from(new Set(products.map((p: any) => p.category?.name).filter(Boolean)));

  return (
    <div id="store-front-view" className="min-h-screen bg-slate-50 pb-16">
      {/* Top Bar for back to VEND+ marketplace */}
      <div className="bg-slate-900 text-white text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white transition font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao VEND+ Marketplace
          </button>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 hidden sm:inline">Loja Oficial Verificada VEND+</span>
            <button
              onClick={handleCopyLink}
              className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              {copiedLink ? 'Link Copiado!' : 'Compartilhar'}
            </button>
          </div>
        </div>
      </div>

      {/* Store Header Banner */}
      <div
        id="store-front-header"
        className="text-white py-10 px-4 sm:px-6 relative overflow-hidden shadow-sm"
        style={{
          backgroundColor: colors.primary,
          backgroundImage: `linear-gradient(135deg, ${colors.primary} 0%, #000000 100%)`,
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          <img
            src={storeData.logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${storeData.slug}`}
            alt={storeData.name}
            className="w-24 h-24 rounded-2xl object-cover bg-white shadow-md border-2 border-white/20 shrink-0"
          />

          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-300 text-[11px] font-semibold border border-white/10 mb-2">
              <ShieldCheck className="w-3 h-3" />
              Garantia e Pagamento Seguro VEND+
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{storeData.name}</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              {theme.slogan || storeData.description || 'Os melhores produtos com garantia e pronta entrega.'}
            </p>

            {/* Badges / metadata */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4 text-xs text-slate-300">
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>{storeData.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>{storeData.hours || 'Seg a Sex: 08:00 - 18:00'}</span>
              </div>
              {storeData.phone && (
                <a
                  href={`https://wa.me/55${storeData.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-emerald-400 font-semibold hover:underline"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Hero Promotion & Highlights */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Garantia VEND+ 100% Segura</div>
              <div className="text-[11px] text-slate-500">Seu dinheiro protegido até a entrega</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Envio Expresso ou Retirada</div>
              <div className="text-[11px] text-slate-500">Entrega rápida na sua região</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900">Pix ou Cartão em até 12x</div>
              <div className="text-[11px] text-slate-500">Checkout transparente Mercado Pago</div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Showcase */}
      <div id="store-catalog-section" className="max-w-6xl mx-auto px-4 sm:px-6 mt-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Catálogo da Loja</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {filteredProducts.length} produto(s) disponível(is) com pronta entrega
            </p>
          </div>

          {/* Category filter pills */}
          {categoryNames.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                Todos
              </button>
              {categoryNames.map((cat: any) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500 text-sm">
            Nenhum produto encontrado nesta categoria.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((prod: any) => {
              const price = prod.priceCents / 100;
              const installments = (price / 10).toFixed(2);

              return (
                <div
                  key={prod.id}
                  id={`store-product-card-${prod.id}`}
                  className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
                >
                  {/* Image container */}
                  <div
                    onClick={() => setSelectedProduct(prod)}
                    className="relative aspect-square bg-slate-100 overflow-hidden cursor-pointer"
                  >
                    <ResponsiveProductImage
                      product={prod}
                      alt={prod.name}
                      className="group-hover:scale-105 transition-transform duration-300"
                      containerClassName="w-full h-full"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-white/95 text-slate-800 font-bold text-[10px] shadow-sm">
                      {prod.condition || 'NOVO'}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {prod.category?.name || 'Geral'}
                      </div>
                      <h3
                        onClick={() => setSelectedProduct(prod)}
                        className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5 cursor-pointer hover:text-sky-600 transition"
                      >
                        {prod.name}
                      </h3>
                    </div>

                    <div>
                      <div className="text-lg font-black text-slate-900">
                        {price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        ou até 10x de R$ {installments} sem juros
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {prod.stock <= 0 ? (
                          <div className="flex-1 py-2 px-2 bg-amber-50 border border-amber-300 rounded-xl text-[11px] font-bold text-amber-800 text-center">
                            Produto VEND+ — sem estoque no momento
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              addItem({
                                productId: prod.id,
                                type: 'PRODUCT',
                                title: prod.name,
                                name: prod.name,
                                priceCents: prod.priceCents,
                                price: prod.priceCents / 100,
                                imageUrl: prod.imageUrl,
                                image: prod.imageUrl,
                                sellerId: prod.sellerId || storeData?.userId || storeData?.id,
                                sellerName: storeData?.name || 'Loja Parceira',
                                stock: prod.stock,
                                quantity: 1,
                              });
                            }}
                            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Adicionar
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedProduct(prod)}
                          className="px-3 py-2 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 transition"
                        >
                          Detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* About & FAQ Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-14 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* About Card */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600">
            <Store className="w-4 h-4" />
            Sobre a {storeData.name}
          </div>
          <h3 className="text-lg font-bold text-slate-900">Nossa História & Compromisso</h3>
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
            {theme.aboutText ||
              `A ${storeData.name} é uma loja oficial e parceira homologada do ecossistema VEND+. Nosso compromisso é entregar produtos de alta qualidade com procedência, suporte ágil e envio com garantia de ponta a ponta.`}
          </p>

          <div className="pt-2 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
            <div>
              <strong>Localização:</strong> {storeData.location}
            </div>
            <div>
              <strong>Horário:</strong> {storeData.hours}
            </div>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600">
            <HelpCircle className="w-4 h-4" />
            Dúvidas Frequentes (FAQ)
          </div>
          <h3 className="text-lg font-bold text-slate-900">Perguntas Comuns</h3>

          <div className="space-y-2">
            {(theme.faq || [
              {
                question: 'Os produtos têm garantia?',
                answer: 'Sim! Todos os produtos anunciados possuem garantia legal de 90 dias com suporte direto e respaldo do VEND+.',
              },
              {
                question: 'Como funciona o envio e a entrega?',
                answer: 'Entregamos via motoboy parceiro no mesmo dia para regiões próximas, envio nacional pelos Correios e retirada presencial.',
              },
              {
                question: 'Quais formas de pagamento são aceitas?',
                answer: 'Aceitamos Pix com aprovação imediata, cartão de crédito em até 12x via Mercado Pago e boleto bancário.',
              },
            ]).map((faqItem: any, idx: number) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full text-left p-3.5 flex items-center justify-between text-xs font-bold text-slate-900 bg-slate-50 hover:bg-slate-100 transition"
                  >
                    <span>{faqItem.question}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="p-3.5 text-xs text-slate-600 bg-white border-t border-slate-100 leading-relaxed">
                      {faqItem.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {selectedProduct.category?.name || 'Geral'}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">{selectedProduct.name}</h2>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="aspect-square bg-slate-100 rounded-xl overflow-hidden">
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex flex-col justify-between space-y-4">
                <div>
                  <div className="text-2xl font-black text-slate-900">
                    {(selectedProduct.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold mt-0.5">
                    Em até 10x sem juros no cartão ou desconto no Pix
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    {selectedProduct.description}
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedProduct.stock <= 0 ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-bold text-center">
                        Produto VEND+ — sem estoque no momento
                      </div>
                      <button
                        disabled
                        className="w-full py-3 bg-slate-200 text-slate-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                      >
                        Produto sem estoque no momento
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        addItem({
                          productId: selectedProduct.id,
                          type: 'PRODUCT',
                          title: selectedProduct.name,
                          name: selectedProduct.name,
                          priceCents: selectedProduct.priceCents,
                          price: selectedProduct.priceCents / 100,
                          imageUrl: selectedProduct.imageUrl,
                          image: selectedProduct.imageUrl,
                          sellerId: selectedProduct.sellerId || storeData?.userId || storeData?.id,
                          sellerName: storeData?.name || 'Loja Parceira',
                          stock: selectedProduct.stock,
                          quantity: 1,
                        });
                        setSelectedProduct(null);
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Comprar Agora (Adicionar ao Carrinho)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
