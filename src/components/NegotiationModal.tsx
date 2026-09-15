import React, { useState } from 'react';
import { X, MessageSquare, Tag, AlertCircle, CheckCircle } from 'lucide-react';
import { Product, ServiceItem } from '../types.ts';

interface NegotiationModalProps {
  item: Product | ServiceItem;
  itemType: 'PRODUCT' | 'SERVICE';
  isOpen: boolean;
  onClose: () => void;
  onSubmitOffer: (offerCents: number, message: string) => Promise<boolean>;
}

export const NegotiationModal: React.FC<NegotiationModalProps> = ({
  item,
  itemType,
  isOpen,
  onClose,
  onSubmitOffer,
}) => {
  if (!isOpen) return null;

  const originalPriceCents = item.priceCents;
  const originalFormatted = (originalPriceCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  // Suggested quick discounts (5%, 10%, 15%)
  const quickOffers = [
    { label: '-5%', cents: Math.round(originalPriceCents * 0.95) },
    { label: '-10%', cents: Math.round(originalPriceCents * 0.9) },
    { label: '-15%', cents: Math.round(originalPriceCents * 0.85) },
  ];

  const [offerValue, setOfferValue] = useState<string>(
    ((originalPriceCents * 0.9) / 100).toFixed(2)
  );
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(offerValue.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      setFeedback('Informe um valor de proposta válido.');
      return;
    }
    const cents = Math.round(parsed * 100);
    if (cents >= originalPriceCents) {
      setFeedback('Sua proposta deve ser menor que o preço original do anúncio.');
      return;
    }

    setLoading(true);
    setFeedback(null);

    const success = await onSubmitOffer(cents, message);
    setLoading(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div
      id="negotiation-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="negotiation-modal"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          id="close-negotiation-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sky-600 font-bold text-sm mb-1">
          <MessageSquare className="w-4 h-4" />
          <span>Fazer Proposta Direta</span>
        </div>
        <h2 className="text-xl font-black text-slate-900 leading-tight">
          Negociar Preço com o Vendedor
        </h2>

        {/* Item preview */}
        <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">{item.name}</p>
            <p className="text-xs text-slate-500">
              Preço anunciado: <strong className="text-slate-800">{originalFormatted}</strong>
            </p>
          </div>
        </div>

        {feedback && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Quick suggestions */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Sugestões rápidas de desconto:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {quickOffers.map((q) => (
                <button
                  type="button"
                  key={q.label}
                  onClick={() => setOfferValue((q.cents / 100).toFixed(2))}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-sky-50 hover:border-sky-300 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                >
                  {q.label} (R$ {(q.cents / 100).toFixed(0)})
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sua Proposta (R$):
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">
                R$
              </span>
              <input
                id="offer-value-input"
                type="number"
                step="0.01"
                value={offerValue}
                onChange={(e) => setOfferValue(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-black text-lg focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mensagem para o vendedor (opcional):
            </label>
            <textarea
              id="offer-message-input"
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Consigo retirar em mãos ainda hoje se fechar por esse valor!"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              id="submit-negotiation-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              {loading ? 'Enviando proposta...' : 'Enviar Proposta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
