import React, { useState, useEffect } from 'react';
import {
  Store,
  Package,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Share2,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Sliders,
  Settings,
  HelpCircle,
  Copy,
  Check,
  Percent,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { uploadImageToStorage } from '../utils/imageOptimizer.ts';

interface MyStoreViewProps {
  onNavigate: (view: string, data?: any) => void;
}

export const MyStoreView: React.FC<MyStoreViewProps> = ({ onNavigate }) => {
  const { user, authFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [storeData, setStoreData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'customize' | 'ai_tools' | 'settings'>('products');
  const [copiedLink, setCopiedLink] = useState(false);

  // Bulk margin modal
  const [showBulkMarginModal, setShowBulkMarginModal] = useState(false);
  const [bulkMarginValue, setBulkMarginValue] = useState('35');
  const [isApplyingBulkMargin, setIsApplyingBulkMargin] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Add product modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showImportEcoModal, setShowImportEcoModal] = useState(false);
  const [ecoCatalog, setEcoCatalog] = useState<any[]>([]);
  const [loadingEco, setLoadingEco] = useState(false);

  // Edit product state
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Commercial AI tools state
  const [selectedAiTool, setSelectedAiTool] = useState<string>('enhance-description');
  const [aiInputProduct, setAiInputProduct] = useState('');
  const [aiInputPrice, setAiInputPrice] = useState('');
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [isRunningAiTool, setIsRunningAiTool] = useState(false);

  // Fetch store data
  const loadStore = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/stores/my/current');
      if (res.ok) {
        const data = await res.json();
        setStoreData(data);
      }
    } catch (err) {
      console.error('Error fetching my store:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStore();
  }, []);

  // Copy store link
  const handleCopyLink = () => {
    if (!storeData?.store) return;
    const url = `${window.location.origin}/?loja=${storeData.store.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !storeData?.store) return;

    setLogoPreview(URL.createObjectURL(file));
    setIsUploadingLogo(true);
    setLogoError('');
    try {
      const uploaded = await uploadImageToStorage(file, authFetch, { type: 'store-logo' });
      const response = await authFetch(`/api/stores/${storeData.store.id}/logo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: uploaded.url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível salvar a logo.');
      await loadStore();
      setLogoPreview(null);
    } catch (err: any) {
      setLogoError(err.message || 'Não foi possível enviar a logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!storeData?.store) return;
    setIsUploadingLogo(true);
    setLogoError('');
    try {
      const response = await authFetch(`/api/stores/${storeData.store.id}/logo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Não foi possível remover a logo.');
      await loadStore();
    } catch (err: any) {
      setLogoError(err.message || 'Não foi possível remover a logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    if (!storeData?.store) return;
    const url = `${window.location.origin}/?loja=${storeData.store.slug}`;
    const text = encodeURIComponent(
      `Olá! Conheça a nossa loja virtual oficial no VEND+:\n\n*${storeData.store.name}*\n${storeData.store.themeConfig?.slogan || 'Confira nossos produtos com pronta entrega e garantia!'}\n\n👉 Acesse agora: ${url}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Apply Bulk Margin
  const handleApplyBulkMargin = async () => {
    if (!storeData?.store) return;
    setIsApplyingBulkMargin(true);
    try {
      const res = await authFetch(`/api/stores/${storeData.store.id}/bulk-margin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marginPercent: Number(bulkMarginValue) }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Margem atualizada com sucesso!');
        setShowBulkMarginModal(false);
        loadStore();
      } else {
        alert(data.error || 'Erro ao aplicar margem.');
      }
    } catch {
      alert('Erro de conexão ao aplicar margem.');
    } finally {
      setIsApplyingBulkMargin(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (productId: number) => {
    if (!window.confirm('Tem certeza que deseja remover este produto da loja?')) return;
    try {
      const res = await authFetch(`/api/stores/${storeData.store.id}/products/${productId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadStore();
      } else {
        alert('Erro ao excluir produto.');
      }
    } catch {
      alert('Erro ao excluir produto.');
    }
  };

  // Run AI Tool
  const handleRunAiTool = async () => {
    setIsRunningAiTool(true);
    setAiResult(null);
    try {
      const res = await fetch('/api/stores/ai-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: selectedAiTool,
          data: {
            title: aiInputProduct,
            productName: aiInputProduct,
            price: aiInputPrice,
            storeName: storeData?.store?.name,
            niche: storeData?.store?.category,
            category: storeData?.store?.category,
            campaignType: 'Mega Liquidação de Ofertas',
          },
        }),
      });
      const data = await res.json();
      setAiResult(data);
    } catch {
      alert('Erro ao executar ferramenta de IA.');
    } finally {
      setIsRunningAiTool(false);
    }
  };

  // Open import modal
  const handleOpenImportEco = async () => {
    setShowImportEcoModal(true);
    setLoadingEco(true);
    try {
      const res = await fetch('/api/stores/ecosystem-catalog');
      if (res.ok) {
        const data = await res.json();
        setEcoCatalog(data.products || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEco(false);
    }
  };

  // Import product from eco
  const handleImportEcoProduct = async (ecoProd: any) => {
    try {
      const margin = storeData?.store?.themeConfig?.profitMarginDefault || 35;
      const res = await authFetch(`/api/stores/${storeData.store.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ecoProd.name,
          description: ecoProd.description,
          costPriceCents: ecoProd.costPriceCents,
          marginPercent: margin,
          stock: ecoProd.stock,
          imageUrl: ecoProd.imageUrl,
          condition: ecoProd.condition,
          ecosystemProductId: ecoProd.id,
        }),
      });
      if (res.ok) {
        alert('Produto adicionado ao seu catálogo!');
        setShowImportEcoModal(false);
        loadStore();
      }
    } catch {
      alert('Erro ao adicionar produto.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600" />
      </div>
    );
  }

  // If user does not have a store yet
  if (!storeData?.hasStore) {
    return (
      <div id="no-store-container" className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-6">
          <div className="w-20 h-20 bg-sky-50 text-sky-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <Store className="w-10 h-10" />
          </div>
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Você ainda não tem uma Loja Virtual no VEND+
            </h2>
            <p className="text-slate-500 text-sm sm:text-base mt-2">
              Comece a vender hoje mesmo com uma vitrine virtual personalizada. A Inteligência Artificial cria sua marca, catálogo, banners, cálculo de margem e checkout em menos de 2 minutos.
            </p>
          </div>

          <div className="pt-2">
            <button
              id="btn-go-create-store"
              onClick={() => onNavigate('create-store-ai')}
              className="px-8 py-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-extrabold text-base rounded-2xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 mx-auto"
            >
              <Sparkles className="w-5 h-5" />
              🚀 Criar Minha Loja com IA Agora
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { store, products = [], metrics = {}, recentOrders = [] } = storeData;
  const theme = store.themeConfig || {};

  return (
    <div id="my-store-view" className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div
          id="store-dashboard-header"
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <img
              src={store.logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${store.slug}`}
              alt={store.name}
              className="w-16 h-16 rounded-2xl object-cover bg-slate-100 border border-slate-200"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900">{store.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Loja Ativa
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{theme.slogan || store.category}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <span>vendmais.com/loja/{store.slug}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              id="btn-view-live-store"
              onClick={() => onNavigate('store-front', store.slug)}
              className="px-4 py-2 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Visualizar Loja
            </button>

            <button
              id="btn-copy-store-link"
              onClick={handleCopyLink}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copiado!' : 'Copiar Link'}
            </button>

            <button
              id="btn-share-whatsapp"
              onClick={handleShareWhatsApp}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              WhatsApp
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div id="store-metrics-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendas Totais</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {((metrics.totalGrossRevenueCents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">Receita bruta da loja</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lucro Líquido</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">
              {((metrics.totalNetProfitCents || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Seu ganho já com margem</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pedidos Concluídos</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{metrics.totalOrdersCount || 0}</div>
            <div className="text-[11px] text-slate-400 mt-1">Vendas realizadas</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catálogo Ativo</div>
            <div className="text-2xl font-extrabold text-sky-600 mt-1">{products.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">Produtos na vitrine</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-sm font-semibold">
          {[
            { id: 'products', label: 'Produtos da Loja', icon: Package },
            { id: 'orders', label: 'Pedidos Recebidos', icon: ShoppingBag },
            { id: 'ai_tools', label: '🚀 IA Comercial', icon: Sparkles },
            { id: 'customize', label: 'Personalizar Loja', icon: Edit2 },
            { id: 'settings', label: 'Configurações & Pagamentos', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 whitespace-nowrap transition ${
                  isActive
                    ? 'border-sky-600 text-sky-600 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENT: PRODUCTS */}
        {activeTab === 'products' && (
          <div id="tab-content-products" className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900">Catálogo de Produtos ({products.length})</h3>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  id="btn-bulk-margin"
                  onClick={() => setShowBulkMarginModal(true)}
                  className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Percent className="w-3.5 h-3.5" />
                  Reajustar Margem em Massa
                </button>

                <button
                  id="btn-import-ecosystem"
                  onClick={handleOpenImportEco}
                  className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Package className="w-3.5 h-3.5" />
                  Adicionar fornecedor
                </button>

                <button
                  id="btn-add-product"
                  onClick={() => onNavigate('sell')}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo Produto
                </button>
              </div>
            </div>

            {/* Products Table/List */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {products.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Nenhum produto cadastrado na sua loja ainda.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">Produto</th>
                        <th className="p-3.5">Custo (R$)</th>
                        <th className="p-3.5">Margem</th>
                        <th className="p-3.5">Preço Venda</th>
                        <th className="p-3.5">Estoque</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((p: any) => {
                        const cost = p.originalPriceCents ? p.originalPriceCents / 100 : null;
                        const price = p.priceCents / 100;
                        const marginCalc = cost ? Math.round(((price - cost) / cost) * 100) : null;

                        return (
                          <tr key={p.id} id={`product-row-${p.id}`} className="hover:bg-slate-50/60">
                            <td className="p-3.5">
                              <div className="flex items-center gap-3">
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <div className="font-bold text-slate-900 max-w-xs truncate">{p.name}</div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">{p.category?.name || 'Geral'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 font-medium">
                              {cost ? cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                            </td>
                            <td className="p-3.5">
                              {marginCalc ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  +{marginCalc}%
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-3.5 font-bold text-slate-900">
                              {price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="p-3.5">
                              <span className="font-semibold text-slate-700">{p.stock} un</span>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {p.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => onNavigate('sell', p)}
                                  className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                                  title="Editar anúncio e fotos"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Remover produto da loja"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: COMMERCIAL AI TOOLS */}
        {activeTab === 'ai_tools' && (
          <div id="tab-content-ai-tools" className="space-y-6">
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-sky-950 p-6 rounded-2xl text-white shadow-md">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                VEND+ Commercial AI Suite
              </div>
              <h2 className="text-xl font-bold">Ferramentas Comerciais com Inteligência Artificial</h2>
              <p className="text-xs text-slate-300 max-w-2xl mt-1">
                Acelere suas vendas gerando títulos com SEO, descrições de alta conversão, posts para WhatsApp e Instagram, e campanhas promocionais prontas.
              </p>
            </div>

            {/* Tool Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'enhance-description', label: 'Gerador de Descrições', desc: 'Copy persuasiva e benefícios' },
                { id: 'optimize-title', label: 'Otimizador de Títulos', desc: 'SEO para buscas e marketplace' },
                { id: 'generate-social-post', label: 'Posts para Redes', desc: 'Instagram, WhatsApp e TikTok' },
                { id: 'generate-ad-copy', label: 'Anúncios Google / Meta', desc: 'Textos de alta conversão' },
              ].map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedAiTool(tool.id)}
                  className={`p-3.5 rounded-xl border text-left transition ${
                    selectedAiTool === tool.id
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-950 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs">{tool.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{tool.desc}</div>
                </button>
              ))}
            </div>

            {/* Tool Input Box */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome do Produto ou Oferta
                  </label>
                  <input
                    type="text"
                    value={aiInputProduct}
                    onChange={(e) => setAiInputProduct(e.target.value)}
                    placeholder="Ex: Fone Bluetooth com Cancelamento de Ruído ANC"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preço de Venda (R$)
                  </label>
                  <input
                    type="text"
                    value={aiInputPrice}
                    onChange={(e) => setAiInputPrice(e.target.value)}
                    placeholder="Ex: 249,90"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <button
                id="btn-execute-ai-tool"
                disabled={isRunningAiTool || !aiInputProduct.trim()}
                onClick={handleRunAiTool}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isRunningAiTool ? 'Gerando com Gemini AI...' : 'Gerar com IA'}
              </button>

              {/* AI Output Card */}
              {aiResult && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5 text-indigo-600">
                      <Sparkles className="w-3.5 h-3.5" />
                      Resultado Gerado pela IA:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(aiResult, null, 2));
                        alert('Copiado!');
                      }}
                      className="text-xs text-sky-600 hover:underline"
                    >
                      Copiar Conteúdo
                    </button>
                  </div>

                  <div className="bg-white p-4 rounded-lg border border-slate-200 text-xs text-slate-800 space-y-2 whitespace-pre-line">
                    {aiResult.persuasiveDescription && (
                      <div>
                        <div className="font-bold text-slate-900 mb-1">Descrição Comercial:</div>
                        <p>{aiResult.persuasiveDescription}</p>
                      </div>
                    )}

                    {aiResult.optimizedTitle && (
                      <div>
                        <div className="font-bold text-slate-900 mb-1">Título Otimizado:</div>
                        <p className="font-semibold text-indigo-700">{aiResult.optimizedTitle}</p>
                      </div>
                    )}

                    {aiResult.instagramCaption && (
                      <div>
                        <div className="font-bold text-slate-900 mb-1">Legenda para Instagram / Redes:</div>
                        <p>{aiResult.instagramCaption}</p>
                      </div>
                    )}

                    {aiResult.whatsappMessage && (
                      <div>
                        <div className="font-bold text-slate-900 mb-1">Mensagem para WhatsApp:</div>
                        <p className="bg-emerald-50 p-2.5 rounded border border-emerald-200 text-emerald-950 font-mono">
                          {aiResult.whatsappMessage}
                        </p>
                      </div>
                    )}

                    {aiResult.metaAds && (
                      <div>
                        <div className="font-bold text-slate-900 mb-1">Anúncio Meta Ads (Facebook/Instagram):</div>
                        <p><strong>Título:</strong> {aiResult.metaAds.headline}</p>
                        <p><strong>Texto Principal:</strong> {aiResult.metaAds.primaryText}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: ORDERS */}
        {activeTab === 'orders' && (
          <div id="tab-content-orders" className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Pedidos Recebidos ({recentOrders.length})</h3>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {recentOrders.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Nenhum pedido recebido ainda. Divulgue o link da sua loja para começar a faturar!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="p-3.5">ID Pedido</th>
                        <th className="p-3.5">Valor Bruto</th>
                        <th className="p-3.5">Seu Ganho</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentOrders.map((ord: any) => (
                        <tr key={ord.id} className="hover:bg-slate-50/60">
                          <td className="p-3.5 font-mono font-bold text-slate-900">#{ord.id}</td>
                          <td className="p-3.5 font-semibold">
                            {(ord.totalGrossCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="p-3.5 font-bold text-emerald-600">
                            {(ord.sellerNetCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                              {ord.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-400">
                            {new Date(ord.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: CUSTOMIZE */}
        {activeTab === 'customize' && (
          <div id="tab-content-customize" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Identidade Visual & Conteúdo da Loja</h3>
            <p className="text-xs text-slate-500">
              Personalize o nome comercial, slogan, texto sobre a empresa e dados de contato que aparecem na vitrine da sua loja virtual.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2 p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-4">
                  <img
                    src={logoPreview || store.logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${store.slug}`}
                    alt={store.logoUrl ? `Logo da ${store.name}` : 'Logo padrão'}
                    className="w-20 h-20 rounded-2xl object-cover bg-white border border-slate-200"
                  />
                  <div className="flex-1">
                    <label className="block font-semibold text-slate-700 mb-1">Logo da loja</label>
                    <p className="text-[11px] text-slate-500 mb-3">
                      {store.logoUrl ? 'Logo personalizada salva no storage do VEND+.' : 'Logo padrão baseada no nome da loja.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <label className="px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                        {isUploadingLogo ? 'Enviando...' : store.logoUrl ? 'Alterar logo' : 'Adicionar logo'}
                        <input
                          id="input-store-logo"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          disabled={isUploadingLogo}
                          onChange={handleLogoUpload}
                        />
                      </label>
                      {store.logoUrl && (
                        <button
                          type="button"
                          disabled={isUploadingLogo}
                          onClick={handleRemoveLogo}
                          className="px-3 py-2 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-bold"
                        >
                          Remover logo
                        </button>
                      )}
                    </div>
                    {logoError && <p className="text-[11px] text-rose-600 mt-2">{logoError}</p>}
                  </div>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome da Loja</label>
                <input
                  type="text"
                  defaultValue={store.name}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">WhatsApp de Contato</label>
                <input
                  type="text"
                  defaultValue={store.phone || '(11) 99999-0000'}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Slogan Comercial</label>
                <input
                  type="text"
                  defaultValue={theme.slogan || ''}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Sobre a Loja</label>
                <textarea
                  rows={3}
                  defaultValue={theme.aboutText || ''}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => alert('Configurações salvas com sucesso!')}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        )}

        {/* TAB CONTENT: SETTINGS & PAYMENTS */}
        {activeTab === 'settings' && (
          <div id="tab-content-settings" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Formas de Pagamento e Entregas</h3>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-emerald-950">Mercado Pago Integrado</div>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Seus clientes podem pagar com Pix imediato, Cartão de Crédito em até 12x e boleto bancário com repasse direto.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked={store.offersDelivery} className="rounded text-sky-600" />
                <span className="font-semibold text-slate-700">Oferecer Entrega Local via Entregadores VEND+</span>
              </label>

              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked={store.offersPickup} className="rounded text-sky-600" />
                <span className="font-semibold text-slate-700">Permitir Retirada no Balcão</span>
              </label>
            </div>
          </div>
        )}

        {/* MODAL: BULK MARGIN */}
        {showBulkMarginModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Percent className="w-4 h-4 text-emerald-600" />
                Reajustar Margem em Massa
              </h3>
              <p className="text-xs text-slate-500">
                Esta ação recalcula o preço de venda de todos os produtos do catálogo da loja com base no preço de custo original de cada item.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nova Margem Desejada (%)
                </label>
                <input
                  type="number"
                  min="5"
                  max="150"
                  value={bulkMarginValue}
                  onChange={(e) => setBulkMarginValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkMarginModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isApplyingBulkMargin}
                  onClick={handleApplyBulkMargin}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  {isApplyingBulkMargin ? 'Aplicando...' : 'Confirmar Reajuste'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: IMPORT ECOSYSTEM PRODUCTS */}
        {showImportEcoModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full space-y-4 shadow-xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  Fornecedores reais
                </h3>
                <button
                  type="button"
                  onClick={() => setShowImportEcoModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Nenhum fornecedor verificado disponível no momento. O VEND+ não cria fornecedores, produtos, preços ou imagens fictícias.
              </p>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {loadingEco ? (
                  <div className="text-center py-8 text-xs text-slate-500">Carregando catálogo...</div>
                ) : ecoCatalog.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    Nenhum fornecedor verificado disponível no momento.
                  </div>
                ) : (
                  ecoCatalog.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center gap-3">
                        <img src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-slate-500">
                            Custo: R$ {(item.costPriceCents / 100).toFixed(2)} | Fornecedor: {item.supplierName}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleImportEcoProduct(item)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs"
                      >
                        + Adicionar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
