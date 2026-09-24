import React, { useState, useEffect } from 'react';
import { X, Download, Copy, Check, ExternalLink, QrCode as QrIcon } from 'lucide-react';
import QRCode from 'qrcode';
import { marketingService } from '../services/marketingService.ts';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  url: string;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  url,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen && url) {
      setLoading(true);
      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      })
        .then((res) => {
          setDataUrl(res);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error generating QR Code:', err);
          setLoading(false);
        });
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const ok = await marketingService.copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `vend-qrcode-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white mx-auto flex items-center justify-center mb-3">
            <QrIcon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>

        {/* QR Code Container */}
        <div className="my-5 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[260px]">
          {loading ? (
            <div className="text-xs text-slate-400 animate-pulse">Gerando QR Code...</div>
          ) : dataUrl ? (
            <div className="text-center space-y-2">
              <img src={dataUrl} alt="QR Code VEND+" className="w-56 h-56 mx-auto rounded-lg shadow-xs bg-white p-2" />
              <div className="text-[10px] text-slate-400 font-medium">Aponte a câmera do celular para escanear</div>
            </div>
          ) : (
            <div className="text-xs text-rose-500">Erro ao gerar QR Code</div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Link Copiado!' : 'Copiar Link'}
            </button>

            <button
              onClick={handleDownload}
              disabled={!dataUrl}
              className="flex-1 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Baixar Imagem
            </button>
          </div>

          <div className="text-center pt-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline font-medium break-all"
            >
              <span className="truncate max-w-[260px]">{url}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
