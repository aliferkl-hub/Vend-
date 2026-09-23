import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Store,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Package,
  Layers,
  Palette,
  DollarSign,
  TrendingUp,
  Share2,
  ExternalLink,
  ShieldCheck,
  Plus,
  Trash2,
  Info,
  Sliders,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface EcosystemProductItem {
  id: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  niche: string;
  description: string;
  costPriceCents: number;
  suggestedRetailPriceCents: number;
  defaultMarginPercent: number;
  stock: number;
  supplierName: string;
  location: string;
  imageUrl: string;
  condition: 'NOVO' | 'USADO';
}

interface CustomProductItem {
  id: string;
  name: string;
  description: string;
  costPriceCents: number;
  marginPercent: number;
  stock: number;
  imageUrl: string;
  categorySlug: string;
  condition: 'NOVO' | 'USADO';
}

interface CreateStoreAIViewProps {
  onNavigate: (view: string, data?: any) => void;
}

const NICHES = [
  { id: 'Eletrônicos & Informática', label: 'Eletrônicos & Informática', icon: '💻', desc: 'Smartphones, notebooks, fones, TVs e acessórios' },
  { id: 'Ferramentas & Equipamentos', label: 'Ferramentas & Equipamentos', icon: '🔧', desc: 'Parafusadeiras, furadeiras, kits manuais e maletas' },
  { id: 'Pet Shop', label: 'Pet Shop & Animais', icon: '🐾', desc: 'Fontes bebedouros, rações premium, coleiras e caminhas' },
  { id: 'Casa & Cozinha', label: 'Casa, Cozinha & Eletro', icon: '☕', desc: 'Cafeteiras, air fryers, organizadores e utilidades' },
  { id: 'Moda & Acessórios', label: 'Moda, Relógios & Calçados', icon: '⌚', desc: 'Smartwatches, mochilas antifurto, calçados e óculos' },
  { id: 'Beleza & Cuidados', label: 'Beleza & Cuidados Pessoais', icon: '✨', desc: 'Secadores, aparadores, perfumes e dermocosméticos' },
  { id: 'Esportes & Lazer', label: 'Esportes, Fitness & Lazer', icon: '🏃', desc: 'Artigos esportivos, suplementos e vestuário fitness' },
];

const TARGET_AUDIENCES = [
  'Consumidores em busca de qualidade e pronta entrega',
  'Jovens e entusiastas de tecnologia e games (18-35 anos)',
  'Famílias e donos de casa que valorizam praticidade e durabilidade',
  'Tutores apaixonados por animais de estimação (cães e gatos)',
  'Profissionais autônomos, eletricistas, instaladores e oficinas',
  'Praticantes de esportes, academia e bem-estar',
];

const VISUAL_STYLES = [
  {
    id: 'modern',
    name: 'Moderno Minimalista',
    desc: 'Preto ônix, azul tecnológico e toques esmeralda',
    primary: '#0F172A',
    secondary: '#0284C7',
    accent: '#10B981',
    bgPreview: 'bg-slate-900',
  },
  {
    id: 'dark_tech',
    name: 'High-Tech Futurista',
    desc: 'Azul escuro profundo, ciano elétrico e céu tech',
    primary: '#0B192C',
    secondary: '#00ADB5',
    accent: '#38BDF8',
    bgPreview: 'bg-[#0B192C]',
  },
  {
    id: 'elegant',
    name: 'Sofisticado & Luxo',
    desc: 'Preto refinado, dourado âmbar e detalhes nobres',
    primary: '#18181B',
    secondary: '#D97706',
    accent: '#F59E0B',
    bgPreview: 'bg-zinc-900',
  },
  {
    id: 'vibrant',
    name: 'Vibrante Promocional',
    desc: 'Laranja dinâmico, coral e foco em alta conversão',
    primary: '#EA580C',
    secondary: '#F59E0B',
    accent: '#E11D48',
    bgPreview: 'bg-orange-600',
  },
  {
    id: 'eco',
    name: 'Eco & Sustentável',
    desc: 'Verde floresta, menta suave e atmosfera natural',
    primary: '#064E3B',
    secondary: '#059669',
    accent: '#34D399',
    bgPreview: 'bg-emerald-900',
  },
];

export const CreateStoreAIView: React.FC<CreateStoreAIViewProps> = ({ onNavigate }) => {
  const { user, authFetch } = useAuth();

  // Wizard state (1 to 7)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form states
  const [storeName, setStoreName] = useState('');
  const [niche, setNiche] = useState(NICHES[0].id);
  const [targetAudience, setTargetAudience] = useState(TARGET_AUDIENCES[0]);
  const [customTarget, setCustomTarget] = useState('');
  const [profitMarginPercent, setProfitMarginPercent] = useState<number>(35);
  const [visualStyle, setVisualStyle] = useState('modern');
  const [productOrigin, setProductOrigin] = useState<'ECOSYSTEM' | 'CLIENT' | 'BOTH'>('BOTH');

  // Products from verified catalog
  const [ecosystemCatalog, setEcosystemCatalog] = useState<EcosystemProductItem[]>([]);
  const [selectedEcoProductIds, setSelectedEcoProductIds] = useState<string[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Custom products added by user
  const [customProducts, setCustomProducts] = useState<CustomProductItem[]>([]);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCost, setNewProdCost] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [isEnhancingWithAi, setIsEnhancingWithAi] = useState(false);

  // AI Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepText, setGenerationStepText] = useState('');
  const [createdStoreData, setCreatedStoreData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Load ecosystem catalog on mount
  useEffect(() => {
    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const res = await fetch('/api/stores/ecosystem-catalog');
        if (res.ok) {
          const data = await res.json();
          setEcosystemCatalog(data.products || []);
          // Auto-select items matching current niche
          const matchIds = (data.products || [])
            .filter((p: EcosystemProductItem) => p.niche.toLowerCase().includes(niche.toLowerCase().split(' ')[0]))
            .slice(0, 4)
            .map((p: EcosystemProductItem) => p.id);
          setSelectedEcoProductIds(matchIds);
        }
      } catch (err) {
        console.error('Error fetching ecosystem catalog:', err);
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // Update selected eco products when niche changes
  const handleNicheChange = (newNiche: string) => {
    setNiche(newNiche);
    const matchIds = ecosystemCatalog
      .filter((p) => p.niche.toLowerCase().includes(newNiche.toLowerCase().split(' ')[0]))
      .slice(0, 4)
      .map((p) => p.id);
    if (matchIds.length > 0) {
      setSelectedEcoProductIds(matchIds);
    }
  };

  // Suggest store name with AI
  const [isSuggestingName, setIsSuggestingName] = useState(false);
  const handleSuggestName = async () => {
    setIsSuggestingName(true);
    try {
      const res = await fetch('/api/stores/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'optimize-title',
          data: {
            title: niche.split(' ')[0],
            category: niche,
          },
        }),
      });
      if (res.ok) {
        const names = [
          `${niche.split(' ')[0]} Prime Brasil`,
          `Mega ${niche.split(' ')[0]} Express`,
          `Central ${niche.split(' ')[0]} Pro`,
          `VEND ${niche.split(' ')[0]} Store`,
        ];
        const randomName = names[Math.floor(Math.random() * names.length)];
        setStoreName(randomName);
      } else {
        setStoreName(`${niche.split(' ')[0]} Prime Brasil`);
      }
    } catch {
      setStoreName(`${niche.split(' ')[0]} Prime Brasil`);
    } finally {
      setIsSuggestingName(false);
    }
  };

  // Enhance custom product copy with AI
  const handleEnhanceCustomProduct = async () => {
    if (!newProdName.trim()) {
      alert('Digite o nome do produto primeiro.');
      return;
    }
    setIsEnhancingWithAi(true);
    try {
      const costCents = Math.round(parseFloat(newProdCost.replace(',', '.') || '50') * 100);
      const res = await fetch('/api/stores/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'optimize-title',
          data: {
            title: newProdName,
            category: niche,
          },
        }),
      });
      const data = await res.json();
      if (data.optimizedTitle) {
        setNewProdName(data.optimizedTitle);
      }
      setNewProdDesc(
        `Produto original com procedência garantida e envio imediato. Acompanha nota fiscal e garantia de 90 dias com suporte direto VEND+.`
      );
    } catch (err) {
      console.warn('AI enhancement fallback:', err);
    } finally {
      setIsEnhancingWithAi(false);
    }
  };

  // Add custom product to local list
  const handleAddCustomProduct = () => {
    if (!newProdName.trim() || !newProdImage.trim()) {
      alert('Por favor, informe o nome e o link de uma imagem fiel do produto.');
      return;
    }
    const costCents = Math.round(parseFloat(newProdCost.replace(',', '.') || '50') * 100);
    const newProd: CustomProductItem = {
      id: 'custom-' + Date.now(),
      name: newProdName.trim(),
      description: newProdDesc.trim() || `${newProdName} original com pronta entrega.`,
      costPriceCents: costCents,
      marginPercent: profitMarginPercent,
      stock: 5,
      imageUrl: newProdImage.trim(),
      categorySlug: 'geral',
      condition: 'NOVO',
    };
    setCustomProducts([...customProducts, newProd]);
    setNewProdName('');
    setNewProdCost('');
    setNewProdImage('');
    setNewProdDesc('');
  };

  const toggleEcoProduct = (id: string) => {
    if (selectedEcoProductIds.includes(id)) {
      setSelectedEcoProductIds(selectedEcoProductIds.filter((item) => item !== id));
    } else {
      setSelectedEcoProductIds([...selectedEcoProductIds, id]);
    }
  };

  // Final Step: Submit & Generate store with AI
  const handleCreateStoreWithAI = async () => {
    if (!user) {
      alert('Por favor, faça login ou cadastre-se para criar sua loja virtual permanente.');
      onNavigate('login');
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');

    try {
      setGenerationStepText('Conectando ao Gemini AI e concebendo identidade visual...');
      await new Promise((r) => setTimeout(r, 600));

      setGenerationStepText('Gerando slogan comercial, paleta de cores e banners promocionais...');
      await new Promise((r) => setTimeout(r, 700));

      setGenerationStepText('Estruturando catálogo com imagens 100% fiéis e calculando margem de lucro...');

      const response = await authFetch('/api/stores/generate-ai-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: storeName.trim(),
          niche,
          targetAudience: customTarget.trim() || targetAudience,
          visualStyle,
          profitMarginPercent,
          location: user.location || 'São Paulo, SP',
          phone: user.phone || '(11) 99999-0000',
          selectedProductOrigin: productOrigin,
          ecosystemProductIds: selectedEcoProductIds,
          customProducts,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao criar loja.');
      }

      setGenerationStepText('Finalizando SEO, FAQ e publicando sua loja no VEND+...');
      await new Promise((r) => setTimeout(r, 600));

      setCreatedStoreData(data);
      setCurrentStep(7); // Success step
    } catch (err: any) {
      console.error('Store creation error:', err);
      setErrorMessage(err.message || 'Erro inesperado ao gerar loja virtual.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Filtered ecosystem products for the selected niche
  const filteredEcoProducts = ecosystemCatalog.filter((p) =>
    p.niche.toLowerCase().includes(niche.toLowerCase().split(' ')[0])
  );
  const displayEcoProducts = filteredEcoProducts.length > 0 ? filteredEcoProducts : ecosystemCatalog;

  return (
    <div id="create-store-ai-view" className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Banner */}
        <div id="ai-creator-header" className="bg-gradient-to-r from-slate-900 via-sky-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold uppercase tracking-wider mb-4 border border-sky-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Tecnologia VEND+ com IA
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Criar Minha Loja Virtual com IA
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl">
              Em poucos minutos, a Inteligência Artificial cria sua loja completa com identidade visual, logo, banners promocionais, catálogo otimizado, cálculo de margem e checkout integrado.
            </p>

            {/* Stepper Progress */}
            <div id="creator-stepper" className="flex items-center gap-2 sm:gap-3 mt-6 overflow-x-auto pb-2">
              {[
                { step: 1, label: 'Nicho' },
                { step: 2, label: 'Nome' },
                { step: 3, label: 'Público' },
                { step: 4, label: 'Produtos' },
                { step: 5, label: 'Margem' },
                { step: 6, label: 'Estilo' },
              ].map((s) => (
                <button
                  key={s.step}
                  onClick={() => s.step < currentStep && setCurrentStep(s.step)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    currentStep === s.step
                      ? 'bg-sky-500 text-white shadow'
                      : currentStep > s.step
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {currentStep > s.step ? <Check className="w-3 h-3 text-emerald-300" /> : <span>{s.step}</span>}
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content Box */}
        <div id="creator-step-card" className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8">
          {/* STEP 1: NICHE */}
          {currentStep === 1 && (
            <div id="step-niche" className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Passo 1: Escolha o Nicho da sua Loja</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Selecione o segmento principal em que você deseja atuar. A IA adaptará produtos, cores e textos comerciais para este segmento.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {NICHES.map((item) => (
                  <div
                    key={item.id}
                    id={`niche-${item.id}`}
                    onClick={() => handleNicheChange(item.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                      niche === item.id
                        ? 'border-sky-600 bg-sky-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-2xl select-none">{item.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-sm">{item.label}</span>
                        {niche === item.id && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  id="btn-next-step-1"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: STORE NAME */}
          {currentStep === 2 && (
            <div id="step-name" className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Passo 2: Nome da sua Loja Virtual</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Você já tem um nome em mente ou prefere que a Inteligência Artificial sugira um nome comercial marcante?
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
                    Nome Comercial da Loja
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="input-store-name"
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder={`Ex: ${niche.split(' ')[0]} Prime Brasil`}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-900 text-sm font-medium"
                    />
                    <button
                      id="btn-ai-suggest-name"
                      type="button"
                      disabled={isSuggestingName}
                      onClick={handleSuggestName}
                      className="px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isSuggestingName ? 'Sugerindo...' : '✨ Sugerir com IA'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Deixe em branco se desejar que a IA crie o melhor nome comercial automaticamente.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1">
                    <Store className="w-4 h-4 text-sky-600" />
                    Como será o link da sua loja:
                  </div>
                  <div className="text-xs font-mono text-sky-700 bg-white px-3 py-2 rounded-lg border border-slate-200">
                    vendmais.com/loja/
                    <span className="font-bold">
                      {storeName
                        ? storeName.toLowerCase().replace(/[^a-z0-9]/g, '-')
                        : `${niche.toLowerCase().split(' ')[0]}-brasil`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-semibold flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  id="btn-next-step-2"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: TARGET AUDIENCE */}
          {currentStep === 3 && (
            <div id="step-target" className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Passo 3: Público-Alvo e Posicionamento</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Quem são seus principais clientes? A IA usará essa informação para gerar slogans persuasivos, descrições e argumentos de venda focados em conversão.
                </p>
              </div>

              <div className="space-y-3">
                {TARGET_AUDIENCES.map((target, idx) => (
                  <label
                    key={idx}
                    id={`target-option-${idx}`}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                      targetAudience === target && !customTarget
                        ? 'border-sky-600 bg-sky-50/50 text-slate-900 font-medium'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetAudience"
                      checked={targetAudience === target && !customTarget}
                      onChange={() => {
                        setTargetAudience(target);
                        setCustomTarget('');
                      }}
                      className="text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm">{target}</span>
                  </label>
                ))}

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ou digite um público específico (opcional):
                  </label>
                  <input
                    id="input-custom-target"
                    type="text"
                    value={customTarget}
                    onChange={(e) => setCustomTarget(e.target.value)}
                    placeholder="Ex: Estudantes universitários e criadores de conteúdo para redes sociais"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-semibold flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  id="btn-next-step-3"
                  onClick={() => setCurrentStep(4)}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PRODUCTS ORIGIN & SELECTION */}
          {currentStep === 4 && (
            <div id="step-products" className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Passo 4: Produtos da sua Loja</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Você pode vender produtos do <strong>Ecossistema VEND+</strong> (fornecedores verificados com fotos exatas), cadastrar <strong>seus próprios produtos</strong>, ou combinar os dois.
                </p>
              </div>

              {/* Origin Switcher */}
              <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-xl">
                <button
                  id="tab-origin-both"
                  type="button"
                  onClick={() => setProductOrigin('BOTH')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition ${
                    productOrigin === 'BOTH' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌟 Ambos (Catálogo VEND+ + Próprios)
                </button>
                <button
                  id="tab-origin-eco"
                  type="button"
                  onClick={() => setProductOrigin('ECOSYSTEM')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition ${
                    productOrigin === 'ECOSYSTEM' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📦 Catálogo VEND+ (Fornecedores)
                </button>
                <button
                  id="tab-origin-client"
                  type="button"
                  onClick={() => setProductOrigin('CLIENT')}
                  className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition ${
                    productOrigin === 'CLIENT' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏷️ Meus Próprios Produtos
                </button>
              </div>

              {/* SECTION A: ECOSYSTEM PRODUCTS */}
              {(productOrigin === 'ECOSYSTEM' || productOrigin === 'BOTH') && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Produtos Verificados do Ecossistema VEND+ ({displayEcoProducts.length})
                    </h3>
                    <span className="text-xs text-slate-500">
                      {selectedEcoProductIds.length} selecionado(s)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Regra rigorosa do catálogo: cada imagem representa com 100% de exatidão o item anunciado. Os preços de custo são fornecidos diretamente pelos distribuidores parceiros.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                    {displayEcoProducts.map((p) => {
                      const isSelected = selectedEcoProductIds.includes(p.id);
                      const costFormatted = (p.costPriceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                      const retailCalc = (p.costPriceCents * (1 + profitMarginPercent / 100) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                      return (
                        <div
                          key={p.id}
                          id={`eco-prod-${p.id}`}
                          onClick={() => toggleEcoProduct(p.id)}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-center gap-3 ${
                            isSelected ? 'border-sky-500 bg-sky-50/40' : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-16 h-16 rounded-lg object-cover bg-slate-100 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{p.name}</h4>
                            <div className="flex items-center gap-2 mt-1 text-[11px]">
                              <span className="text-slate-500">Custo: {costFormatted}</span>
                              <span className="font-semibold text-emerald-700">Venda: {retailCalc}</span>
                            </div>
                            <span className="inline-block text-[10px] text-slate-400 mt-0.5 truncate max-w-full">
                              Fornecedor: {p.supplierName}
                            </span>
                          </div>
                          <div className="shrink-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION B: CUSTOM PRODUCTS */}
              {(productOrigin === 'CLIENT' || productOrigin === 'BOTH') && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-sky-600" />
                      Cadastrar Produto Próprio
                    </h3>
                    <span className="text-xs text-slate-500">
                      {customProducts.length} produto(s) cadastrado(s)
                    </span>
                  </div>

                  {/* Add form */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nome do Produto *
                        </label>
                        <input
                          id="input-new-prod-name"
                          type="text"
                          value={newProdName}
                          onChange={(e) => setNewProdName(e.target.value)}
                          placeholder="Ex: Tênis Esportivo Running Amortecedor"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Preço de Custo (R$) *
                        </label>
                        <input
                          id="input-new-prod-cost"
                          type="text"
                          value={newProdCost}
                          onChange={(e) => setNewProdCost(e.target.value)}
                          placeholder="Ex: 85,00"
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        URL da Imagem Fiel do Produto *
                      </label>
                      <input
                        id="input-new-prod-image"
                        type="url"
                        value={newProdImage}
                        onChange={(e) => setNewProdImage(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Regra absoluta: a foto deve representar exatamente o produto que o cliente receberá.
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Descrição / Ficha Técnica
                        </label>
                        <button
                          type="button"
                          onClick={handleEnhanceCustomProduct}
                          disabled={isEnhancingWithAi}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          {isEnhancingWithAi ? 'Melhorando...' : '✨ Melhorar com IA'}
                        </button>
                      </div>
                      <textarea
                        id="input-new-prod-desc"
                        rows={2}
                        value={newProdDesc}
                        onChange={(e) => setNewProdDesc(e.target.value)}
                        placeholder="Descreva o produto ou clique em 'Melhorar com IA'..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <button
                      id="btn-add-custom-prod"
                      type="button"
                      onClick={handleAddCustomProduct}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Incluir Produto no Catálogo da Loja
                    </button>
                  </div>

                  {/* Custom products list */}
                  {customProducts.length > 0 && (
                    <div className="space-y-2">
                      {customProducts.map((cp) => (
                        <div key={cp.id} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg text-xs">
                          <div className="flex items-center gap-2.5">
                            <img src={cp.imageUrl} alt={cp.name} className="w-10 h-10 rounded object-cover" />
                            <div>
                              <div className="font-semibold text-slate-900">{cp.name}</div>
                              <div className="text-slate-500">
                                Custo: R$ {(cp.costPriceCents / 100).toFixed(2)} | Venda:{' '}
                                <span className="text-emerald-600 font-bold">
                                  R$ {((cp.costPriceCents * (1 + profitMarginPercent / 100)) / 100).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCustomProducts(customProducts.filter((i) => i.id !== cp.id))}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-semibold flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  id="btn-next-step-4"
                  onClick={() => setCurrentStep(5)}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: PROFIT MARGIN SIMULATOR */}
          {currentStep === 5 && (
            <div id="step-margin" className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Passo 5: Defina sua Margem de Lucro</h2>
                <p className="text-slate-500 text-sm mt-1">
                  A IA calcula o preço de venda sugerido de cada produto com base na sua margem. Você poderá ajustar individualmente qualquer item a qualquer momento no seu painel.
                </p>
              </div>

              {/* Pre-set buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[20, 30, 40, 50, 65].map((m) => (
                  <button
                    key={m}
                    id={`margin-btn-${m}`}
                    type="button"
                    onClick={() => setProfitMarginPercent(m)}
                    className={`py-3 px-2 rounded-xl border text-sm font-bold transition flex flex-col items-center gap-1 ${
                      profitMarginPercent === m
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span>{m}%</span>
                    <span className="text-[10px] font-normal text-slate-500">
                      {m <= 25 ? 'Volume rápido' : m <= 45 ? 'Equilibrada' : 'Alta margem'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom margin slider */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Ajuste fino de margem (%):</span>
                  <span className="text-base font-extrabold text-emerald-700">{profitMarginPercent}%</span>
                </div>
                <input
                  id="slider-margin"
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={profitMarginPercent}
                  onChange={(e) => setProfitMarginPercent(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              {/* Live Profit Simulation Card */}
              <div className="p-5 bg-gradient-to-br from-emerald-950 to-slate-900 text-white rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
                  <TrendingUp className="w-4 h-4" />
                  Simulação de Lucro em Vendas
                </div>
                <div className="grid grid-cols-3 gap-4 text-center divide-x divide-white/10">
                  <div>
                    <div className="text-[11px] text-slate-400">Preço de Custo Médio</div>
                    <div className="text-base sm:text-lg font-bold text-white mt-0.5">R$ 100,00</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Preço de Venda</div>
                    <div className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5">
                      R$ {(100 * (1 + profitMarginPercent / 100)).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Seu Lucro Líquido</div>
                    <div className="text-base sm:text-lg font-extrabold text-emerald-300 mt-0.5">
                      R$ {(100 * (profitMarginPercent / 100)).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-semibold flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  id="btn-next-step-5"
                  onClick={() => setCurrentStep(6)}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition"
                >
                  Continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: VISUAL STYLE & BRAND IDENTITY */}
          {currentStep === 6 && (
            <div id="step-style" className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Passo 6: Estilo Visual e Identidade da Marca</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Selecione a atmosfera visual que melhor conversa com seu nicho e clientes. A IA aplicará este tema no cabeçalho, botões, vitrines e banners da sua loja.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {VISUAL_STYLES.map((style) => (
                  <div
                    key={style.id}
                    id={`style-${style.id}`}
                    onClick={() => setVisualStyle(style.id)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      visualStyle === style.id
                        ? 'border-sky-600 bg-sky-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900 text-sm">{style.name}</span>
                      {visualStyle === style.id && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{style.desc}</p>
                    {/* Palette preview */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full border border-black/10" style={{ backgroundColor: style.primary }} />
                      <div className="w-6 h-6 rounded-full border border-black/10" style={{ backgroundColor: style.secondary }} />
                      <div className="w-6 h-6 rounded-full border border-black/10" style={{ backgroundColor: style.accent }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary before generation */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-900 text-sm mb-1">Resumo da sua Loja:</div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div><strong>Nicho:</strong> {niche}</div>
                  <div><strong>Nome:</strong> {storeName || 'A ser sugerido pela IA'}</div>
                  <div><strong>Margem:</strong> {profitMarginPercent}%</div>
                  <div><strong>Itens no Catálogo:</strong> {selectedEcoProductIds.length + customProducts.length}</div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <button
                  onClick={() => setCurrentStep(5)}
                  className="px-5 py-2.5 text-slate-600 hover:text-slate-800 text-sm font-semibold flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  id="btn-generate-ai-store"
                  disabled={isGenerating}
                  onClick={handleCreateStoreWithAI}
                  className="px-8 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-sm font-extrabold rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isGenerating ? 'Criando Loja com IA...' : '🚀 Gerar Minha Loja com IA'}
                </button>
              </div>

              {/* Loading modal/overlay when generating */}
              {isGenerating && (
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
                    <div className="w-16 h-16 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mx-auto animate-pulse">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">A IA está criando sua loja virtual...</h3>
                    <p className="text-xs text-slate-500 font-mono animate-fade">
                      {generationStepText}
                    </p>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div className="bg-sky-600 h-2.5 rounded-full w-4/5 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: SUCCESS! STORE CREATED */}
          {currentStep === 7 && createdStoreData && (
            <div id="step-success" className="text-center py-6 space-y-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  🎉 Loja Publicada com Sucesso no VEND+!
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
                  {createdStoreData.store.name}
                </h2>
                <p className="text-slate-600 text-sm max-w-lg mx-auto mt-2">
                  {createdStoreData.store.themeConfig?.slogan || 'Sua loja virtual está no ar e pronta para receber pedidos com checkout e Mercado Pago!'}
                </p>
              </div>

              {/* Store URL Box */}
              <div className="max-w-md mx-auto p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs font-semibold text-slate-500 mb-1 text-left">Link direto da sua loja:</div>
                <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200">
                  <span className="text-xs font-mono text-sky-700 truncate flex-1 text-left">
                    vendmais.com/loja/{createdStoreData.slug}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/?loja=${createdStoreData.slug}`);
                      alert('Link da loja copiado para a área de transferência!');
                    }}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-800"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  id="btn-view-created-store"
                  onClick={() => onNavigate('store-front', createdStoreData.slug)}
                  className="w-full sm:w-auto px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl shadow transition flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir Minha Loja Virtual
                </button>

                <button
                  id="btn-manage-created-store"
                  onClick={() => onNavigate('my-store')}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Sliders className="w-4 h-4" />
                  Gerenciar no Painel da Loja
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
