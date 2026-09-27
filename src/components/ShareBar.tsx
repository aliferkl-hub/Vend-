import React, { useState } from 'react';
import { Share2, MessageCircle, Copy, Check, QrCode as QrIcon, Facebook, Instagram } from 'lucide-react';
import { marketingService } from '../services/marketingService.ts';
import { QrCodeModal } from './QrCodeModal.tsx';

export const TikTokIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.86-4.49V8.52a8.27 8.27 0 0 0 4.84 1.56V6.69h-.93z" />
  </svg>
);

interface ShareBarProps {
  title: string;
  shareText?: string;
  url: string;
  type?: 'PRODUCT' | 'STORE' | 'MARKETPLACE' | 'LOJA_IA' | 'REFERRAL';
  compact?: boolean;
}

export const ShareBar: React.FC<ShareBarProps> = ({
  title,
  shareText,
  url,
  type = 'PRODUCT',
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const defaultMessage =
    shareText ||
    (type === 'STORE'
      ? `Confira a loja ${title} no VEND+:`
      : type === 'REFERRAL'
      ? `Cadastre-se no VEND+ pelo meu link de convite e comece a comprar e vender:`
      : type === 'LOJA_IA'
      ? `Crie sua própria loja virtual com Inteligência Artificial no VEND+:`
      : `Confira este produto no VEND+:`);

  const handleWhatsApp = () => {
    marketingService.shareOnWhatsApp(defaultMessage, url);
  };

  const handleFacebook = () => {
    marketingService.shareOnFacebook(url);
  };

  const handleInstagram = async () => {
    await marketingService.shareOnInstagram(title, defaultMessage, url);
  };

  const handleTikTok = async () => {
    await marketingService.shareOnTikTok(title, defaultMessage, url);
  };

  const handleNativeShare = async () => {
    const success = await marketingService.shareNative(title, defaultMessage, url);
    if (!success) {
      handleCopy();
    }
  };

  const handleCopy = async () => {
    const ok = await marketingService.copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleWhatsApp}
            title="Compartilhar no WhatsApp"
            className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleFacebook}
            title="Compartilhar no Facebook"
            className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
          >
            <Facebook className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleInstagram}
            title="Compartilhar no Instagram"
            className="p-2 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100 transition"
          >
            <Instagram className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleTikTok}
            title="Compartilhar no TikTok"
            className="p-2 rounded-xl bg-slate-100 text-slate-900 hover:bg-slate-200 transition"
          >
            <TikTokIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleCopy}
            title="Copiar Link"
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            title="Gerar QR Code"
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            <QrIcon className="w-4 h-4" />
          </button>
        </div>
        <QrCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          title={title}
          subtitle="Escaneie o QR Code para acessar"
          url={url}
        />
      </>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-sky-600" />
            Compartilhar
          </span>
          <span className="text-[11px] text-slate-400">Link rastreável</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>WhatsApp</span>
          </button>

          {/* Facebook */}
          <button
            type="button"
            onClick={handleFacebook}
            className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <Facebook className="w-4 h-4 shrink-0" />
            <span>Facebook</span>
          </button>

          {/* Instagram */}
          <button
            type="button"
            onClick={handleInstagram}
            className="py-2.5 px-3 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-95 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <Instagram className="w-4 h-4 shrink-0" />
            <span>Instagram</span>
          </button>

          {/* TikTok */}
          <button
            type="button"
            onClick={handleTikTok}
            className="py-2.5 px-3 bg-black hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs border border-slate-800"
          >
            <TikTokIcon className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>TikTok</span>
          </button>

          {/* QR Code */}
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <QrIcon className="w-4 h-4 shrink-0" />
            <span>QR Code</span>
          </button>

          {/* Copy link or native share */}
          <button
            type="button"
            onClick={typeof navigator !== 'undefined' && navigator.share ? handleNativeShare : handleCopy}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-200"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Copiar Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title={title}
        subtitle="Escaneie o QR Code com a câmera do celular"
        url={url}
      />
    </>
  );
};
