import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  ShoppingBag,
  Send,
  AlertCircle,
  User,
} from 'lucide-react';
import { Negotiation, NegotiationMessage } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface NegotiationsViewProps {
  onProceedToCheckout: (negotiation: Negotiation) => void;
  onSelectProduct: (product: any) => void;
}

export const NegotiationsView: React.FC<NegotiationsViewProps> = ({
  onProceedToCheckout,
  onSelectProduct,
}) => {
  const { user } = useAuth();
  const [negotiationsList, setNegotiationsList] = useState<any[]>([]);
  const [selectedNegId, setSelectedNegId] = useState<number | null>(null);
  const [selectedNeg, setSelectedNeg] = useState<Negotiation | null>(null);
  const [loading, setLoading] = useState(true);

  // Actions
  const [actionLoading, setActionLoading] = useState(false);
  const [counterOfferInput, setCounterOfferInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [showCounterBox, setShowCounterBox] = useState(false);

  const fetchNegotiations = async () => {
    try {
      const res = await fetch('/api/negotiations/my');
      if (res.ok) {
        const data = await res.json();
        setNegotiationsList(data);
        if (data.length > 0 && !selectedNegId) {
          setSelectedNegId(data[0].negotiation.id);
        }
      }
    } catch (e) {
      console.error('Fetch negotiations error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleNegotiation = async (id: number) => {
    try {
      const res = await fetch(`/api/negotiations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedNeg(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNegotiations();
  }, []);

  useEffect(() => {
    if (selectedNegId) {
      fetchSingleNegotiation(selectedNegId);
    }
  }, [selectedNegId]);

  const handleRespond = async (action: 'ACCEPT' | 'REJECT' | 'COUNTER_OFFER') => {
    if (!selectedNeg) return;
    setActionLoading(true);

    try {
      const payload: any = { action };
      if (action === 'COUNTER_OFFER') {
        const parsed = parseFloat(counterOfferInput.replace(',', '.'));
        if (isNaN(parsed) || parsed <= 0) {
          alert('Informe um valor de contraproposta válido.');
          setActionLoading(false);
          return;
        }
        payload.counterOfferCents = Math.round(parsed * 100);
      }
      if (messageInput.trim()) {
        payload.message = messageInput.trim();
      }

      const res = await fetch(`/api/negotiations/${selectedNeg.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao responder negociação.');
      } else {
        alert(data.message || 'Resposta registrada!');
        setShowCounterBox(false);
        setCounterOfferInput('');
        setMessageInput('');
        fetchSingleNegotiation(selectedNeg.id);
        fetchNegotiations();
      }
    } catch {
      alert('Erro de conexão.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div id="negotiations-view" className="space-y-6 pb-20">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-sky-500" />
          <span>Minhas Negociações & Propostas</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Histórico em tempo real de ofertas, contraofertas e acordos com vendedores e compradores
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400">
          Carregando negociações...
        </div>
      ) : negotiationsList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Nenhuma negociação ativa</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Ao encontrar um produto ou serviço com negociação disponível, clique no botão &quot;Negociar Preço&quot; para fazer uma oferta direta.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Negotiations List (4 cols) */}
          <div className="lg:col-span-4 space-y-2">
            {negotiationsList.map((item) => {
              const neg = item.negotiation;
              const prod = item.product || item.service;
              const isSelected = selectedNegId === neg.id;
              const isBuyer = neg.buyerId === user?.id;

              return (
                <div
                  key={neg.id}
                  id={`neg-item-${neg.id}`}
                  onClick={() => setSelectedNegId(neg.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50/70 border-sky-400 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-slate-500 uppercase">
                      {isBuyer ? 'Você comprou/ofertou' : 'Você está vendendo'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        neg.status === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : neg.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : neg.status === 'COMPLETED'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {neg.status === 'ACCEPTED'
                        ? 'Aceita'
                        : neg.status === 'REJECTED'
                        ? 'Recusada'
                        : neg.status === 'COMPLETED'
                        ? 'Concluída'
                        : 'Em Aberto'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {prod?.name || 'Item negociado'}
                  </h4>

                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Oferta atual:</span>
                    <span className="text-sm font-black text-slate-900">
                      {(neg.currentOfferCents / 100).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Negotiation Chat & History (8 cols) */}
          <div className="lg:col-span-8">
            {selectedNeg ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5">
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                      Negociação #{selectedNeg.id}
                    </span>
                    <h3 className="text-base font-black text-slate-900">
                      {selectedNeg.product?.name || selectedNeg.service?.name}
                    </h3>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Preço original:</span>
                    <span className="text-xs text-slate-400 line-through">
                      {(selectedNeg.initialPriceCents / 100).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                    <div className="text-lg font-black text-emerald-600">
                      {(selectedNeg.currentOfferCents / 100).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </div>
                  </div>
                </div>

                {/* Messages Timeline */}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {selectedNeg.messages?.map((msg) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md rounded-2xl p-3.5 text-xs space-y-1 ${
                            isMe
                              ? 'bg-sky-600 text-white rounded-br-none'
                              : 'bg-slate-100 text-slate-900 rounded-bl-none'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 text-[10px] opacity-80 font-bold">
                            <span>{isMe ? 'Você' : msg.sender?.name || 'Interlocutor'}</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="font-medium leading-relaxed">{msg.message}</p>
                          {msg.offerCents && (
                            <p className="font-black text-sm pt-0.5">
                              Proposta: R$ {(msg.offerCents / 100).toFixed(2).replace('.', ',')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action Bar based on negotiation status */}
                {selectedNeg.status === 'ACCEPTED' ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-emerald-800 text-xs">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold">Proposta aceita no valor acordado!</p>
                        <p className="text-emerald-700">
                          Preço final: <strong>R$ {((selectedNeg.finalAgreedPriceCents || selectedNeg.currentOfferCents) / 100).toFixed(2).replace('.', ',')}</strong>
                        </p>
                      </div>
                    </div>

                    {selectedNeg.buyerId === user?.id && (
                      <button
                        id="checkout-negotiated-btn"
                        onClick={() => onProceedToCheckout(selectedNeg)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Comprar pelo Valor Acordado</span>
                      </button>
                    )}
                  </div>
                ) : selectedNeg.status === 'OPEN' ? (
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    {/* If it's my turn to respond */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        id="accept-neg-btn"
                        disabled={actionLoading}
                        onClick={() => handleRespond('ACCEPT')}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Aceitar Oferta Atual</span>
                      </button>

                      <button
                        id="open-counter-btn"
                        disabled={actionLoading}
                        onClick={() => setShowCounterBox(!showCounterBox)}
                        className="bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                      >
                        Fazer Contraproposta
                      </button>

                      <button
                        id="reject-neg-btn"
                        disabled={actionLoading}
                        onClick={() => handleRespond('REJECT')}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Recusar</span>
                      </button>
                    </div>

                    {/* Counter offer box */}
                    {showCounterBox && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
                        <h4 className="text-xs font-bold text-slate-800">Enviar Contraproposta:</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Novo Valor Proposto (R$):
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={counterOfferInput}
                              onChange={(e) => setCounterOfferInput(e.target.value)}
                              placeholder="0,00"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-sky-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Mensagem explicativa:
                            </label>
                            <input
                              type="text"
                              value={messageInput}
                              onChange={(e) => setMessageInput(e.target.value)}
                              placeholder="Ex: Menos que isso não compensa pela condição..."
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                            />
                          </div>
                        </div>
                        <button
                          id="submit-counter-btn"
                          disabled={actionLoading}
                          onClick={() => handleRespond('COUNTER_OFFER')}
                          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
                        >
                          Enviar Contraproposta
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl p-4 text-center text-xs text-slate-500">
                    Esta negociação já foi finalizada.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
