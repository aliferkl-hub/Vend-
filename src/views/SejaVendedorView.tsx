import React, { useState } from 'react';
import {
  Store,
  Sparkles,
  Bot,
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  PackageCheck,
  Instagram,
  MessageCircle,
  HelpCircle,
  Users,
  Copy,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { marketingService } from '../services/marketingService.ts';

interface SejaVendedorViewProps {
  onNavigate: (view: string, param?: any) => void;
}

export const SejaVendedorView: React.FC<SejaVendedorViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  // Prospect form state
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState('Moda & Acessórios');
  const [socialHandle, setSocialHandle] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  React.useEffect(() => {
    marketingService.trackEvent({
      eventType: 'page_view',
      landingPath: '/seja-vendedor',
    });
  }, []);

  const handleSubmitInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email && !phone) {
      alert('Por favor, informe seu e-mail ou WhatsApp para contato.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/growth/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName ? `${storeName} (Lojista)` : user?.name || 'Novo Lojista',
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          segment: 'SELLER',
          categoryInterest: category,
          notes: socialHandle ? `Rede social / Canal: ${socialHandle}` : 'Interesse em vender no VEND+',
        }),
      });

      if (res.ok) {
        setFormSuccess(true);
        marketingService.trackEvent({
          eventType: 'lead_capture',
          landingPath: '/seja-vendedor',
        });
      } else {
        alert('Erro ao enviar informações. Tente novamente.');
      }
    } catch {
      alert('Erro de conexão ao enviar dados.');
    } finally {
      setSubmitting(false);
    }
  };

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/seja-vendedor?ref=${user?.id ? `vend_${user.id}` : 'loja'}`
    : '';

  const copyInvite = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  return (
    <div id="seja-vendedor-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 pb-24">
      {/* 1. HERO SECTION */}
      <section className="bg-gradient-to-br from-[#060D17] via-[#0B1A2F] to-[#0A2239] text-white rounded-3xl p-6 sm:p-12 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase">
            <Store className="w-3.5 h-3.5" />
            <span>VEND+ Para Lojistas & Vendedores</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15]">
            Comece a vender hoje. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
              Sua loja virtual pronta em 2 minutos.
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-lg leading-relaxed font-normal">
            Sem burocracia, sem mensalidade fixa para iniciar. Você cria seu catálogo com Inteligência Artificial, recebe pagamentos no PIX e Cartão pelo Mercado Pago, e entrega com proteção por código de 4 dígitos.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3.5">
            <button
              onClick={() => onNavigate('create-store-ai')}
              className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black px-8 py-4 rounded-2xl text-sm sm:text-base shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2.5 cursor-pointer"
            >
              <Bot className="w-5 h-5 text-slate-950" />
              <span>CRIAR MINHA LOJA COM IA AGORA</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('plans')}
              className="bg-slate-800/90 hover:bg-slate-700 text-white font-bold px-6 py-4 rounded-2xl text-sm sm:text-base border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Ver Planos & Taxas</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. POR QUE ESCOLHER O VEND+ */}
      <section className="space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Vantagens exclusivas para seu negócio escalar
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Criado para simplificar as vendas de quem já tem comércio físico, Instagram ou está começando.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Bot className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-slate-900">Criação Instantânea com IA</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Diga o que você vende e a IA gera nome, slogan, paleta de cores e banner exclusivo da sua marca.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-slate-900">Mercado Pago Transparente</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Seus clientes pagam no PIX à vista ou parcelam em até 12x no cartão com total segurança antifraude.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-slate-900">Proteção Código 4 Dígitos</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              O comprador só confirma a entrega fornecendo o código ao entregador. Zero risco de golpe para você.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-black text-slate-900">Rede de Afiliados VEND+</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Milhares de divulgadores podem promover seus produtos nas redes sociais comissionados apenas por vendas reais.
            </p>
          </div>
        </div>
      </section>

      {/* 3. JÁ VENDE NO INSTAGRAM OU WHATSAPP? */}
      <section className="bg-slate-50 rounded-3xl p-6 sm:p-10 border border-slate-200 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-4">
          <div className="inline-flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>Migração Facilitada</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            Você já vende pelo Instagram, WhatsApp ou tem loja física?
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Profissionalize seus pedidos. Pare de perder vendas negociando manualmente no Direct. Com o VEND+, você recebe um link profissional para a bio e checkout automatizado com cálculo de frete.
          </p>

          <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Link de catálogo próprio para colocar na bio do Instagram</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Recebimento automático no PIX sem enviar chave solta no chat</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Gestão clara de pedidos pendentes, enviados e entregues</span>
            </li>
          </ul>
        </div>

        <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-sm">
          {formSuccess ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">Manifestação Recebida!</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Nossa equipe de expansão entrará em contato para te auxiliar a subir seu catálogo prioritariamente no VEND+.
              </p>
              <button
                onClick={() => onNavigate('create-store-ai')}
                className="mt-3 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Adiantar Criação com IA
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitInterest} className="space-y-4">
              <h3 className="text-sm font-black text-slate-900">
                Cadastre sua Loja ou Peça Suporte de Entrada
              </h3>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nome da sua Loja ou Marca
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Ex: Doce Sabor Ateliê, Boutique Maria..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Segmento</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  >
                    <option value="Moda & Acessórios">Moda & Acessórios</option>
                    <option value="Eletrônicos & Informática">Eletrônicos & Informática</option>
                    <option value="Beleza & Cuidados">Beleza & Cuidados</option>
                    <option value="Casa & Decoração">Casa & Decoração</option>
                    <option value="Alimentação & Gourmet">Alimentação & Gourmet</option>
                    <option value="Serviços Locais">Serviços Locais</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Instagram ou WhatsApp atual
                  </label>
                  <input
                    type="text"
                    value={socialHandle}
                    onChange={(e) => setSocialHandle(e.target.value)}
                    placeholder="@sualoja ou (11) 99999-9999"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">WhatsApp para Contato</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(XX) XXXXX-XXXX"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Enviando...' : 'Quero Vender no VEND+'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* 4. INDIQUE UM VENDEDOR */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs uppercase tracking-wider">
            <Users className="w-4 h-4" />
            <span>Indique Lojistas Amigos</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900">
            Conhece alguém que vende ou quer começar?
          </h3>
          <p className="text-xs text-slate-500 max-w-xl">
            Compartilhe seu link exclusivo de convite. Quando a pessoa cadastrar uma loja, você e ela ganham benefícios na plataforma.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={copyInvite}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            {copiedInvite ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedInvite ? 'Link Copiado!' : 'Copiar Link de Convite'}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
