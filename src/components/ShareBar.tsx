import React, { useState } from 'react';
import { Share2, MessageCircle, Copy, Check, QrCode as QrIcon, Facebook } from 'lucide-react';
import { marketingService } from '../services/marketingService.ts';
import { QrCodeModal } from './QrCodeModal.tsx';

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
        <div className="flex items-center gap-1.5">
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>

          {/* Facebook */}
          <button
            type="button"
            onClick={handleFacebook}
            className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <Facebook className="w-4 h-4" />
            Facebook
          </button>

          {/* QR Code */}
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <QrIcon className="w-4 h-4" />
            QR Code
          </button>

          {/* Copy link or native share */}
          <button
            type="button"
            onClick={typeof navigator !== 'undefined' && navigator.share ? handleNativeShare : handleCopy}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-200"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500" />
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
