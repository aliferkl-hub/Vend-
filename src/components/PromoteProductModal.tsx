import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Instagram,
  Facebook,
  Video,
  Sparkles,
  QrCode as QrIcon,
  ExternalLink,
} from 'lucide-react';
import { TikTokIcon } from './ShareBar.tsx';
import { QrCodeModal } from './QrCodeModal.tsx';
import { marketingService } from '../services/marketingService.ts';

interface PromoteProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: number;
    name: string;
    slug?: string;
    priceCents: number;
    description: string;
    imageUrl?: string;
    effectiveCommissionPercent?: number;
    estimatedCommissionCents?: number;
  };
  affiliateCode?: string;
}

export const PromoteProductModal: React.FC<PromoteProductModalProps> = ({
  isOpen,
  onClose,
  product,
  affiliateCode,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'instagram' | 'facebook' | 'tiktok' | 'curto'>('whatsapp');
  const [isQrOpen, setIsQrOpen] = useState(false);

  // AI customizer state
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedCopy, setEnhancedCopy] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vendmais.com';
  const productIdentifier = product.slug || product.id;
  const affiliateParam = affiliateCode ? `?af=${affiliateCode}` : '';
  const cleanTrackedUrl = `${origin}/produto/${productIdentifier}${affiliateParam}`;

  const formattedPrice = (product.priceCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const commissionText = product.estimatedCommissionCents
    ? `Sua comissão estimada: ${(product.estimatedCommissionCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })} (${product.effectiveCommissionPercent || 10}%)`
    : null;

  // Real, non-fabricated templates based strictly on real product attributes
  const templates = {
    whatsapp: `🔥 *${product.name}*\n\n💰 Por apenas *${formattedPrice}* no VEND+!\n\n${product.description.slice(0, 160)}${product.description.length > 160 ? '...' : ''}\n\n✅ Pagamento seguro via PIX/Cartão com Mercado Pago\n🛡️ Dinheiro protegido até a entrega confirmada por código de 4 dígitos\n\n👉 Acesse agora e confira:\n${cleanTrackedUrl}`,

    instagram: `Confira ${product.name} disponível no VEND+ por ${formattedPrice}! 🚀\n\n${product.description.slice(0, 200)}\n\n🔒 Compra 100% protegida com entrega garantida por código de 4 dígitos.\n\n🔗 Link no Stories ou acesse direto: ${cleanTrackedUrl}\n\n#vendplus #marketplace #comprasegura #oferta`,

    facebook: `Imperdível no VEND+ Marketplace:\n\n${product.name}\nValor: ${formattedPrice}\n\n${product.description.slice(0, 220)}\n\nCompre com total segurança! No VEND+, o pagamento fica retido até você receber e confirmar o código de 4 dígitos com o entregador.\n\nAcesse o link para conferir:\n${cleanTrackedUrl}`,

    tiktok: `🎬 Roteiro para TikTok / Reels:\n\n• Gancho: "Olha só o que eu achei no marketplace VEND+!"\n• Apresente: ${product.name} por ${formattedPrice}\n• Destaque: ${product.description.slice(0, 120)}\n• Segurança: "O mais legal é que você só libera o pagamento depois que recebe o produto na porta com código de 4 dígitos!"\n• Chamada: "O link com todos os detalhes tá na minha bio ou aqui: ${cleanTrackedUrl}"`,

    curto: `${product.name} por ${formattedPrice} no VEND+! Compra segura com código de entrega: ${cleanTrackedUrl}`,
  };

  const handleCopy = async (key: string, text: string) => {
    const ok = await marketingService.copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    marketingService.shareOnWhatsApp('', templates.whatsapp);
  };

  const handleEnhanceWithAI = async () => {
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/upload/ai-copy-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: product.name,
          price: formattedPrice,
          description: product.description,
          targetChannel: activeChannel,
          link: cleanTrackedUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEnhancedCopy(data.enhancedCopy || null);
      } else {
        // Fallback enhancement without external failure
        setEnhancedCopy(
          `✨ [OFERTA SELECIONADA] ${product.name} por apenas ${formattedPrice}!\n\n` +
          `Destaque: ${product.description.slice(0, 180)}...\n\n` +
          `Compre com garantia de 4 dígitos no VEND+: ${cleanTrackedUrl}`
        );
      }
    } catch {
      setEnhancedCopy(
        `✨ [OFERTA ESPECIAL] ${product.name} por ${formattedPrice} no VEND+!\n\n` +
        `Entrega segura com intermediação Mercado Pago: ${cleanTrackedUrl}`
      );
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto space-y-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
              <Share2 className="w-3.5 h-3.5" />
              <span>Gerador Oficial de Divulgação VEND+</span>
            </div>
            <h3 className="text-xl font-black text-slate-900">Divulgue e Ganhe Comissão</h3>
            <p className="text-xs text-slate-500">
              Copie os textos prontos ou gere um QR Code exclusivo com seu link de rastreamento.
            </p>
          </div>

          {/* Product Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                Item
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 truncate">{product.name}</h4>
              <div className="text-sm font-black text-emerald-600 mt-0.5">{formattedPrice}</div>
              {commissionText && (
                <div className="text-[11px] font-bold text-sky-700 mt-0.5">{commissionText}</div>
              )}
            </div>
          </div>

          {/* Link Box */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase">
              Seu Link Rastreável de Afiliado
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={cleanTrackedUrl}
                className="flex-1 px-3.5 py-2.5 bg-slate-100 rounded-xl text-xs font-mono text-slate-800 border border-slate-200 truncate select-all"
              />
              <button
                type="button"
                onClick={() => handleCopy('main_link', cleanTrackedUrl)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0"
              >
                {copiedKey === 'main_link' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'main_link' ? 'Copiado!' : 'Copiar'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsQrOpen(true)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition shrink-0"
                title="Gerar QR Code"
              >
                <QrIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Channel Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 uppercase">
                Escolha o Formato do Conteúdo
              </label>
              <button
                type="button"
                disabled={isEnhancing}
                onClick={handleEnhanceWithAI}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 transition disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isEnhancing ? 'Gerando...' : 'Personalizar com IA'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-600' },
                { id: 'instagram', label: 'Instagram / Stories', icon: Instagram, color: 'text-pink-600' },
                { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600' },
                { id: 'tiktok', label: 'TikTok / Reels', icon: Video, color: 'text-slate-800' },
                { id: 'curto', label: 'Texto Curto', icon: Share2, color: 'text-slate-600' },
              ].map((ch) => {
                const Icon = ch.icon;
                const isActive = activeChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setActiveChannel(ch.id as any);
                      setEnhancedCopy(null);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : ch.color}`} />
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Template Box */}
            <div className="space-y-2">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto font-sans">
                {enhancedCopy || templates[activeChannel]}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopy('channel_copy', enhancedCopy || templates[activeChannel])}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  {copiedKey === 'channel_copy' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'channel_copy' ? 'Texto Copiado!' : 'Copiar Texto'}</span>
                </button>

                {activeChannel === 'whatsapp' && (
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Abrir no WhatsApp</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <QrCodeModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        title={product.name}
        subtitle="Escaneie para comprar com garantia VEND+"
        url={cleanTrackedUrl}
      />
    </>
  );
};
