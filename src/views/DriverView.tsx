import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Phone,
  CheckCircle,
  KeyRound,
  AlertCircle,
  Clock,
  ShieldCheck,
  Package,
} from 'lucide-react';
import { Order } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const DriverView: React.FC = () => {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Prompt for 4-digit code verification
  const [confirmingOrder, setConfirmingOrder] = useState<any | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchDeliveries = async () => {
    try {
      const res = await fetch('/api/deliveries/my-deliveries');
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const handleAcceptDelivery = async (orderId: number) => {
    try {
      const res = await fetch(`/api/deliveries/accept/${orderId}`, { method: 'POST' });
      if (res.ok) {
        alert('Entrega aceita com sucesso! Rota iniciada.');
        fetchDeliveries();
      } else {
        const d = await res.json();
        alert(d.error || 'Não foi possível aceitar a entrega.');
      }
    } catch {
      alert('Erro de conexão.');
    }
  };

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingOrder) return;
    if (codeInput.trim().length !== 4) {
      setCodeError('O código deve conter exatamente 4 dígitos.');
      return;
    }

    setValidating(true);
    setCodeError(null);

    try {
      const res = await fetch('/api/deliveries/confirm-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: confirmingOrder.id,
          code: codeInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error || 'Código incorreto. Tente novamente.');
      } else {
        setSuccessMsg('ENTREGA CONFIRMADA COM SUCESSO! Código de 4 dígitos validado pelo backend.');
        setTimeout(() => {
          setConfirmingOrder(null);
          setCodeInput('');
          setSuccessMsg(null);
          fetchDeliveries();
        }, 2500);
      }
    } catch {
      setCodeError('Erro de conexão ao validar o código.');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div id="driver-view" className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-amber-500" />
              <span>Painel do Entregador VEND+</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Confirme entregas diretamente no endereço do cliente utilizando a validação de segurança de 4 dígitos
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold">
            Entregador Parceiro
          </span>
        </div>
      </div>

      {/* Security notice */}
      <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 border border-slate-800 text-xs flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
        <p className="leading-relaxed">
          <strong>Regra de Segurança Inviolável:</strong> Você <em>NÃO</em> possui acesso prévio ao código. Ao chegar no destino e entregar os produtos em mãos, solicite os 4 dígitos ao cliente e digite no botão &quot;Confirmar Entrega com Código&quot;.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400">
          Carregando entregas...
        </div>
      ) : deliveries.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <Truck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Nenhuma entrega no momento</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Assim que novos pedidos de entrega forem emitidos na sua região, eles aparecerão aqui para você aceitar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map((del) => {
            const isAssignedToMe = del.deliveryDriverId === user?.id;
            const isDelivered = del.status === 'DELIVERED';

            return (
              <div
                key={del.id}
                id={`delivery-item-${del.id}`}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Entrega #{del.orderNumber}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      Cliente: {del.buyer?.name || 'Comprador'}
                    </h3>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      isDelivered
                        ? 'bg-emerald-100 text-emerald-800'
                        : del.status === 'OUT_FOR_DELIVERY'
                        ? 'bg-sky-100 text-sky-800 animate-pulse'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isDelivered
                      ? 'Concluída / Entregue'
                      : del.status === 'OUT_FOR_DELIVERY'
                      ? 'Em Rota de Entrega'
                      : 'Pronto para Retirada'}
                  </span>
                </div>

                {/* Destination Address */}
                {del.address && (
                  <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1 text-slate-700">
                    <p className="font-bold text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      Destino: {del.address.street}, nº {del.address.number} {del.address.complement || ''}
                    </p>
                    <p className="text-slate-500 pl-5">
                      Bairro: {del.address.neighborhood} - {del.address.city}/{del.address.state} (CEP: {del.address.postalCode})
                    </p>
                    <p className="text-slate-500 pl-5 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Contato do cliente: {del.address.phone}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-bold text-slate-500">
                    Taxa do entregador: <strong className="text-emerald-600">R$ 14,90</strong>
                  </div>

                  {!isAssignedToMe && !isDelivered && (
                    <button
                      id={`accept-delivery-btn-${del.id}`}
                      onClick={() => handleAcceptDelivery(del.id)}
                      className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs"
                    >
                      Aceitar e Iniciar Rota
                    </button>
                  )}

                  {isAssignedToMe && !isDelivered && (
                    <button
                      id={`confirm-delivery-code-btn-${del.id}`}
                      onClick={() => {
                        setConfirmingOrder(del);
                        setCodeInput('');
                        setCodeError(null);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Confirmar Entrega com Código de 4 Dígitos</span>
                    </button>
                  )}

                  {isDelivered && (
                    <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Entrega Finalizada e Paga
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4-Digit Verification Modal */}
      {confirmingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              <KeyRound className="w-4 h-4" />
              <span>Validação de Segurança Backend</span>
            </div>

            <h3 className="text-xl font-black text-slate-900">
              Digite o Código de 4 Dígitos
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Pergunte ao cliente <strong>{confirmingOrder.buyer?.name}</strong> os 4 dígitos exibidos na tela de pedidos dele.
            </p>

            {codeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{codeError}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {!successMsg && (
              <form onSubmit={handleValidateCode} className="space-y-4">
                <div>
                  <input
                    id="driver-pin-input"
                    type="text"
                    maxLength={4}
                    autoFocus
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="0 0 0 0"
                    className="w-full text-center text-3xl font-mono tracking-widest font-black py-3 bg-slate-50 border-2 border-slate-300 rounded-2xl focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    Máximo de 3 tentativas para evitar fraudes.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingOrder(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold"
                  >
                    Voltar
                  </button>
                  <button
                    id="driver-validate-submit-btn"
                    type="submit"
                    disabled={validating || codeInput.length !== 4}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs disabled:opacity-50"
                  >
                    {validating ? 'Validando no Servidor...' : 'Confirmar e Liberar Pedido'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
