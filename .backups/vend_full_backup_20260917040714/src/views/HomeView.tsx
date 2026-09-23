import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Truck,
  ArrowRight,
  TrendingUp,
  Tag,
  Store,
  Boxes,
  ShoppingBag,
  DollarSign,
  PackageCheck,
  Building2,
  LayoutDashboard,
  CheckCircle,
  Zap,
  Bot,
  Sliders,
  Users,
} from 'lucide-react';
import { Product, ServiceItem, Category } from '../types.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { ServiceCard } from '../components/ServiceCard.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface HomeViewProps {
  products: Product[];
  services: ServiceItem[];
  categories: Category[];
  onSelectProduct: (product: Product) => void;
  onSelectService: (service: ServiceItem) => void;
  onNavigate: (view: string, param?: string) => void;
  onSelectCategory: (slug: string) => void;
  onRefreshData: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  products,
  services,
  categories,
  onSelectProduct,
  onSelectService,
  onNavigate,
  onSelectCategory,
  onRefreshData,
}) => {
  const { user } = useAuth();
  const [filterCondition, setFilterCondition] = useState<string>('ALL');

  const safeProducts = Array.isArray(products) ? products : [];
  const safeServices = Array.isArray(services) ? services : [];

  // Filter products by condition if selected
  const filteredProducts = safeProducts.filter((p) => {
    if (filterCondition === 'NOVO') return p.condition === 'NOVO';
    if (filterCondition === 'USADO') return p.condition === 'USADO';
    if (filterCondition === 'NEGOCIA') return p.allowsNegotiation;
    return true;
  });

  return (
    <div id="home-view" className="space-y-12 pb-20 max-w-7xl mx-auto px-2 sm:px-4">
      {/* 1. HERO PRINCIPAL PREMIUM */}
      <section
        id="hero-banner"
        className="relative bg-gradient-to-br from-[#060D17] via-[#0B1A2F] to-[#0A2239] text-white rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-12 border border-slate-800"
      >
        {/* Glow ambient decorations */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center relative z-10">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Plataforma Inteligente de Vendas</span>
            </div>

            {/* Mensagem Principal */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15]">
              Crie sua loja. <br />
              Venda seus produtos. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
                Deixe a IA fazer o trabalho pesado.
              </span>
            </h1>

            {/* Subtítulo */}
            <p className="text-slate-300 text-sm sm:text-lg leading-relaxed max-w-2xl font-normal">
              Crie uma loja profissional com IA, organize seus produtos, defina sua margem e comece a vender.
            </p>

            {/* CTAs Principais */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <button
                id="hero-create-store-ai-btn"
                onClick={() => onNavigate('create-store-ai')}
                className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black px-6 sm:px-8 py-4 rounded-2xl text-sm sm:text-base shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center gap-2.5 cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-slate-950" />
                <span>CRIAR MINHA LOJA COM IA</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                id="hero-explore-vend-btn"
                onClick={() => onNavigate('search')}
                className="bg-slate-800/90 hover:bg-slate-700 text-white font-bold px-6 py-4 rounded-2xl text-sm sm:text-base border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>EXPLORAR O VEND+</span>
              </button>
            </div>
          </div>

          {/* Painel Visual Demonstrativo do Ecossistema */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    IA
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Ecossistema Comercial VEND+</h4>
                    <p className="text-[10px] text-emerald-400">Automatizado de ponta a ponta</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                  Ao Vivo
                </span>
              </div>

              {/* Indicadores Visuais Rápidos */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-400">Criação de Loja</div>
                  <div className="font-bold text-white mt-0.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Em 2 Minutos</span>
                  </div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-400">Margem de Lucro</div>
                  <div className="font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Você Define (20% - 60%)</span>
                  </div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-400">Fornecedores</div>
                  <div className="font-bold text-sky-300 mt-0.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Homologados VEND+</span>
                  </div>
                </div>

                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
                  <div className="text-[10px] text-slate-400">Pedidos & Entrega</div>
                  <div className="font-bold text-amber-300 mt-0.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Código 4 Dígitos</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Mercado Pago Transparente</span>
                <span className="text-emerald-400 font-semibold">Pix & Cartão em até 12x</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. OS 8 PILARES VISUAIS DO VEND+ (Conforme Requisito 2) */}
      <section id="visual-pillars" className="space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Tudo o que você precisa para lucrar em uma só plataforma
          </h2>
          <p className="text-sm text-slate-500">
            A união perfeita entre marketplace de alta conversão e gerador de lojas autônomas por IA.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* 1. Criação de Loja por IA */}
          <div
            onClick={() => onNavigate('create-store-ai')}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-emerald-400 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Criação de Loja por IA</h3>
            <p className="text-xs text-slate-500 mt-1">
              Nome, logo, banners e página inicial gerados automaticamente.
            </p>
          </div>

          {/* 2. Produtos & Catálogo */}
          <div
            onClick={() => onNavigate('search')}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-sky-400 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Produtos</h3>
            <p className="text-xs text-slate-500 mt-1">
              Cadastre seus itens ou selecione do catálogo homologado.
            </p>
          </div>

          {/* 3. Vendas Rápidas */}
          <div
            onClick={() => onNavigate('seller-dashboard')}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-indigo-400 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Vendas</h3>
            <p className="text-xs text-slate-500 mt-1">
              Checkout integrado com Pix e cartão pelo Mercado Pago.
            </p>
          </div>

          {/* 4. Gestão de Pedidos */}
          <div
            onClick={() => onNavigate('orders')}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-amber-400 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <PackageCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Pedidos</h3>
            <p className="text-xs text-slate-500 mt-1">
              Acompanhamento em tempo real com código de entrega de 4 dígitos.
            </p>
          </div>

          {/* 5. Lucro & Margem */}
          <div
            onClick={() => onNavigate('my-store')}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-emerald-400 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Lucro</h3>
            <p className="text-xs text-slate-500 mt-1">
              Controle total da sua margem de lucro por produto ou em massa.
            </p>
          </div>

          {/* 6. Marketplace */}
          <div
            onClick={() => onNavigate('search')}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-sky-400 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Marketplace</h3>
            <p className="text-xs text-slate-500 mt-1">
              Exposição instantânea para milhares de compradores na sua região.
            </p>
          </div>

          {/* 7. Fornecedores */}
          <div
            onClick={() => onNavigate('my-store')}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-purple-400 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Fornecedores</h3>
            <p className="text-xs text-slate-500 mt-1">
              Parceiros homologados com produtos prontos para abastecer sua loja.
            </p>
          </div>

          {/* 8. Painel da Loja */}
          <div
            onClick={() => onNavigate('my-store')}
            className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Painel da Loja</h3>
            <p className="text-xs text-slate-500 mt-1">
              Controle métricas, visitas, links no WhatsApp e vendas em tempo real.
            </p>
          </div>
        </div>
      </section>

      {/* 3. SEÇÃO PLANOS MENSAIS NA HOME (Conforme Requisito 3) */}
      <section
        id="home-plans-highlight"
        className="bg-gradient-to-r from-[#071322] via-[#0B1A2F] to-[#0A2239] rounded-3xl p-6 sm:p-10 text-white shadow-xl border border-slate-800 space-y-8"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Planos Mensais VEND+</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
              Escolha seu plano e comece a escalar
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Pagamento facilitado e seguro via PIX com ativação imediata após a confirmação.
            </p>
          </div>

          <button
            id="home-btn-view-all-plans"
            onClick={() => onNavigate('plans')}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-3 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 shrink-0 cursor-pointer self-start md:self-auto"
          >
            <span>Ver Todos os Planos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Cards de Resumo dos Planos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* FREE */}
          <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                FREE
              </span>
              <div className="text-2xl font-black mt-2">R$ 0</div>
              <p className="text-[11px] text-slate-400 mt-0.5">Comissão de 7% por venda</p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Até 10 anúncios
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Marketplace local
                </li>
              </ul>
            </div>
            <button
              onClick={() => onNavigate('plans')}
              className="mt-5 w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-white transition"
            >
              Começar Grátis
            </button>
          </div>

          {/* BÁSICO */}
          <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-700 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2 py-0.5 rounded">
                BÁSICO
              </span>
              <div className="text-2xl font-black mt-2">R$ 29,99<span className="text-xs text-slate-400">/mês</span></div>
              <p className="text-[11px] text-emerald-400 mt-0.5">Taxa reduzida de 4%</p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Até 50 anúncios
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Loja Virtual com IA
                </li>
              </ul>
            </div>
            <button
              onClick={() => onNavigate('plans')}
              className="mt-5 w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition"
            >
              Assinar via PIX
            </button>
          </div>

          {/* PREMIUM */}
          <div className="bg-slate-900/90 rounded-2xl p-5 border border-sky-500/70 shadow-lg relative flex flex-col justify-between">
            <div className="absolute -top-2.5 right-4 bg-sky-500 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
              Mais Vendido
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-sky-500 text-white px-2 py-0.5 rounded">
                PREMIUM
              </span>
              <div className="text-2xl font-black mt-2">R$ 49,99<span className="text-xs text-slate-400">/mês</span></div>
              <p className="text-[11px] text-sky-400 mt-0.5">Taxa reduzida de 4%</p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-sky-400" /> Até 150 anúncios
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-sky-400" /> Suíte Comercial com IA
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-sky-400" /> Fornecedores homologados
                </li>
              </ul>
            </div>
            <button
              onClick={() => onNavigate('plans')}
              className="mt-5 w-full py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold rounded-xl transition"
            >
              Assinar via PIX
            </button>
          </div>

          {/* LENDÁRIO */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl p-5 border border-amber-500/80 shadow-lg flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                LENDÁRIO
              </span>
              <div className="text-2xl font-black mt-2">R$ 79,99<span className="text-xs text-slate-400">/mês</span></div>
              <p className="text-[11px] text-amber-400 mt-0.5">Taxa mínima de 4%</p>
              <ul className="mt-4 space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-400" /> Até 500 anúncios
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-400" /> Topo do marketplace
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-400" /> Gerente dedicado
                </li>
              </ul>
            </div>
            <button
              onClick={() => onNavigate('plans')}
              className="mt-5 w-full py-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 text-xs font-black rounded-xl transition shadow-sm"
            >
              Assinar via PIX
            </button>
          </div>
        </div>
      </section>

      {/* 4. QUICK POPULAR CATEGORIES */}
      <section id="popular-categories" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-sky-500" />
            <span>Categorias em Destaque</span>
          </h2>
          <button
            onClick={() => onNavigate('search')}
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {categories.slice(0, 6).map((cat) => (
            <button
              key={cat.id}
              id={`quick-cat-${cat.slug}`}
              onClick={() => onSelectCategory(cat.slug)}
              className="bg-white hover:bg-sky-50/60 p-3.5 rounded-2xl border border-slate-200/80 hover:border-sky-300 transition-all text-left flex flex-col justify-between group shadow-2xs cursor-pointer"
            >
              <span className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                {cat.name}
              </span>
              <span className="text-[11px] text-slate-400 mt-2 font-medium">Explorar itens</span>
            </button>
          ))}
        </div>
      </section>

      {/* 5. PRODUCTS SHOWCASE */}
      <section id="products-showcase" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span>Vitrine do Marketplace VEND+</span>
            </h2>
            <p className="text-xs text-slate-500">
              Produtos disponíveis para compra imediata ou negociação segura
            </p>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              id="filter-all-btn"
              onClick={() => setFilterCondition('ALL')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterCondition === 'ALL'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              id="filter-novo-btn"
              onClick={() => setFilterCondition('NOVO')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterCondition === 'NOVO'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Novos
            </button>
            <button
              id="filter-usado-btn"
              onClick={() => setFilterCondition('USADO')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterCondition === 'USADO'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Usados
            </button>
            <button
              id="filter-negocia-btn"
              onClick={() => setFilterCondition('NEGOCIA')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterCondition === 'NEGOCIA'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aceita Oferta
            </button>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <p className="font-semibold text-sm">Nenhum produto encontrado neste filtro.</p>
            <button
              onClick={() => setFilterCondition('ALL')}
              className="mt-3 text-xs font-bold text-sky-600 hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((prod) => (
              <ProductCard
                key={prod.id}
                product={prod}
                onClick={() => onSelectProduct(prod)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 6. SERVICES MARKETPLACE SECTION */}
      <section id="services-showcase" className="space-y-4 pt-4 border-t border-slate-200/80">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-500" />
              <span>Serviços e Profissionais Locais</span>
            </h2>
            <p className="text-xs text-slate-500">
              Eletricistas, técnicos, montadores, fretes e muito mais na sua comunidade
            </p>
          </div>
          <button
            id="view-all-services-btn"
            onClick={() => onNavigate('services')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            Ver todos os serviços <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safeServices.slice(0, 4).map((serv) => (
            <ServiceCard
              key={serv.id}
              service={serv}
              onClick={() => onSelectService(serv)}
              onNegotiate={() => onSelectService(serv)}
            />
          ))}
        </div>
      </section>

      {/* 7. BANNER 4-DIGIT SECURITY */}
      <section
        id="safety-info-card"
        className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Garantia de Entrega VEND+</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black">
            Como funciona o Código de Entrega de 4 Dígitos?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            1. Você conclui seu pedido no marketplace. <br />
            2. Um código secreto exclusivo de 4 dígitos é gerado em seu painel. <br />
            3. O entregador chega na sua porta. <br />
            4. Você confere o pacote e informa o código. O entregador digita e a entrega é confirmada!
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-center w-full md:w-64">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">Exemplo do Código</p>
          <div className="text-3xl font-black tracking-widest text-emerald-400 my-2 font-mono">
            4 8 2 7
          </div>
          <p className="text-[10px] text-slate-400">Proteção total para o comprador e para o vendedor.</p>
        </div>
      </section>
    </div>
  );
};
