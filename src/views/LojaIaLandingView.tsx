import React, { useEffect } from 'react';
import {
  Sparkles,
  Store,
  Palette,
  Package,
  Share2,
  QrCode as QrIcon,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Instagram,
} from 'lucide-react';
import { ShareBar } from '../components/ShareBar.tsx';
import { marketingService } from '../services/marketingService.ts';

interface LojaIaLandingViewProps {
  onNavigate: (view: string, param?: any) => void;
}

export const LojaIaLandingView: React.FC<LojaIaLandingViewProps> = ({ onNavigate }) => {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://vendmais.com/loja-ia';

  useEffect(() => {
    marketingService.trackEvent({
      eventType: 'page_view',
      landingPath: '/loja-ia',
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-sky-400" />
          Loja IA VEND+ • Crie em minutos
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
          Crie sua própria loja <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400">
            com Inteligência Artificial.
          </span>
        </h1>

        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Tenha sua própria loja virtual completa com logotipo, catálogo de produtos, cálculo de margem e página
          pública pronta para divulgar no WhatsApp, Instagram e TikTok.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('create-store-ai')}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Criar minha loja agora</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('my-store')}
            className="w-full sm:w-auto px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-sm transition border border-white/10 flex items-center justify-center gap-2"
          >
            <span>Gerenciar minha loja</span>
          </button>
        </div>

        {/* Share Section */}
        <div className="max-w-md mx-auto pt-6 text-left">
          <ShareBar
            title="Loja IA VEND+"
            shareText="Crie sua própria loja virtual com Inteligência Artificial no VEND+:"
            url={currentUrl}
            type="LOJA_IA"
          />
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Criação com IA */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Criação Assistida por IA</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Informe o segmento ou produtos e a IA sugere nome, slogans, identidade visual e estrutura de catálogo
            adequada ao seu público.
          </p>
        </div>

        {/* 2. Personalização & Logo */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Palette className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Logo & Identidade Visual</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Faça upload do seu próprio logotipo ou gere um personalizado. Cores e banners sob medida para a sua marca.
          </p>
        </div>

        {/* 3. Catálogo & Produtos */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Catálogo de Produtos</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cadastre fotos, estoque e preços. Utilize o calculador automático de margem para precificar sem erro e
            publicar no catálogo da loja.
          </p>
        </div>

        {/* 4. Link & QR Code */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <QrIcon className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Página Pública & QR Code</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sua loja ganha um link exclusivo <code>/loja/sua-loja</code> e QR Code para imprimir em balcões, cartões de
            visita e panfletos.
          </p>
        </div>

        {/* 5. Divulgação em Redes Sociais */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <Share2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Redes Sociais</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Botões nativos para compartilhar seus produtos e loja direto no WhatsApp, Stories do Instagram, TikTok e
            Facebook com link rastreável.
          </p>
        </div>

        {/* 6. Checkout Seguro VEND+ */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Pagamento Integrado</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Seus clientes pagam por Pix ou cartão via Mercado Pago. O valor fica seguro no sistema até a entrega ser
            confirmada por código.
          </p>
        </div>
      </div>

      {/* Steps Banner */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-14">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black">Como funciona em 3 passos</h2>
            <p className="text-xs text-slate-400">Do zero à sua primeira venda em poucos minutos</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="space-y-2 text-center">
              <div className="w-8 h-8 rounded-full bg-sky-500 text-slate-950 font-black text-sm flex items-center justify-center mx-auto">
                1
              </div>
              <div className="font-bold text-sm">Gere sua Loja</div>
              <p className="text-xs text-slate-400">Defina o nome, logo e tema visual com o assistente inteligente.</p>
            </div>

            <div className="space-y-2 text-center">
              <div className="w-8 h-8 rounded-full bg-indigo-500 text-white font-black text-sm flex items-center justify-center mx-auto">
                2
              </div>
              <div className="font-bold text-sm">Cadastre Produtos</div>
              <p className="text-xs text-slate-400">Adicione seus itens com foto, estoque e margem de lucro calculada.</p>
            </div>

            <div className="space-y-2 text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center mx-auto">
                3
              </div>
              <div className="font-bold text-sm">Compartilhe e Venda</div>
              <p className="text-xs text-slate-400">Envie o link para clientes e receba pagamentos com código de entrega.</p>
            </div>
          </div>

          <div className="text-center pt-4">
            <button
              onClick={() => onNavigate('create-store-ai')}
              className="px-8 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition"
            >
              Criar minha loja agora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
