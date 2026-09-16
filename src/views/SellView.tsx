import React, { useState, useEffect } from 'react';
import {
  Tag,
  DollarSign,
  MapPin,
  Truck,
  Package,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Briefcase,
  Layers,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Category, Product, ProductImage } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  ProductImageUploader,
  LocalProductImageItem,
} from '../components/ProductImageUploader.tsx';

interface SellViewProps {
  categories: Category[];
  initialProduct?: Product | null;
  onSuccess: (savedProduct: Product) => void;
  onNavigate: (view: string, data?: any) => void;
}

export const SellView: React.FC<SellViewProps> = ({
  categories,
  initialProduct = null,
  onSuccess,
  onNavigate,
}) => {
  const { user, authFetch } = useAuth();

  const isEditing = Boolean(initialProduct);

  const [itemType, setItemType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [name, setName] = useState(initialProduct?.name || '');
  const [categoryId, setCategoryId] = useState<string>(
    initialProduct?.categoryId ? String(initialProduct.categoryId) : ''
  );
  const [subcategory, setSubcategory] = useState(initialProduct?.subcategory || '');
  const [condition, setCondition] = useState<'NOVO' | 'USADO'>(
    initialProduct?.condition === 'USADO' ? 'USADO' : 'NOVO'
  );
  const [price, setPrice] = useState(
    initialProduct ? (initialProduct.priceCents / 100).toFixed(2).replace('.', ',') : ''
  );
  const [originalPrice, setOriginalPrice] = useState(
    initialProduct?.originalPriceCents
      ? (initialProduct.originalPriceCents / 100).toFixed(2).replace('.', ',')
      : ''
  );
  const [stock, setStock] = useState(
    initialProduct?.stock !== undefined ? String(initialProduct.stock) : '1'
  );
  const [location, setLocation] = useState(
    initialProduct?.location || user?.location || 'São Paulo, SP'
  );
  const [offersDelivery, setOffersDelivery] = useState(
    initialProduct ? initialProduct.offersDelivery : true
  );
  const [offersPickup, setOffersPickup] = useState(
    initialProduct ? initialProduct.offersPickup : true
  );
  const [allowsNegotiation, setAllowsNegotiation] = useState(
    initialProduct ? initialProduct.allowsNegotiation : true
  );
  const [description, setDescription] = useState(initialProduct?.description || '');

  // Initialize photos list (preserves existing photos when editing!)
  const [productImages, setProductImages] = useState<LocalProductImageItem[]>(() => {
    if (!initialProduct) return [];

    const existingList: LocalProductImageItem[] = [];
    const sourceImages = initialProduct.productImages || initialProduct.images || [];

    if (sourceImages.length > 0) {
      sourceImages.forEach((img, idx) => {
        const url = img.url || (img as any).imageUrl;
        if (!url) return;
        const type = (img as any).type || (img.isPrimary ? 'main' : 'gallery');
        existingList.push({
          id: img.id,
          url,
          type: type as any,
          position: typeof (img as any).position === 'number' ? (img as any).position : idx,
          isPrimary: type === 'main' || img.isPrimary || idx === 0,
        });
      });
    } else if (initialProduct.imageUrl) {
      existingList.push({
        url: initialProduct.imageUrl,
        type: 'main',
        position: 0,
        isPrimary: true,
      });
    }

    return existingList;
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state if initialProduct prop changes
  useEffect(() => {
    if (initialProduct) {
      setName(initialProduct.name);
      setCategoryId(String(initialProduct.categoryId));
      setSubcategory(initialProduct.subcategory || '');
      setCondition(initialProduct.condition === 'USADO' ? 'USADO' : 'NOVO');
      setPrice((initialProduct.priceCents / 100).toFixed(2).replace('.', ','));
      setOriginalPrice(
        initialProduct.originalPriceCents
          ? (initialProduct.originalPriceCents / 100).toFixed(2).replace('.', ',')
          : ''
      );
      setStock(String(initialProduct.stock || 1));
      setLocation(initialProduct.location || user?.location || 'Local');
      setOffersDelivery(initialProduct.offersDelivery);
      setOffersPickup(initialProduct.offersPickup);
      setAllowsNegotiation(initialProduct.allowsNegotiation);
      setDescription(initialProduct.description);

      const existingList: LocalProductImageItem[] = [];
      const sourceImages = initialProduct.productImages || initialProduct.images || [];
      if (sourceImages.length > 0) {
        sourceImages.forEach((img, idx) => {
          const url = img.url || (img as any).imageUrl;
          if (!url) return;
          const type = (img as any).type || (img.isPrimary ? 'main' : 'gallery');
          existingList.push({
            id: img.id,
            url,
            type: type as any,
            position: typeof (img as any).position === 'number' ? (img as any).position : idx,
            isPrimary: type === 'main' || img.isPrimary || idx === 0,
          });
        });
      } else if (initialProduct.imageUrl) {
        existingList.push({
          url: initialProduct.imageUrl,
          type: 'main',
          position: 0,
          isPrimary: true,
        });
      }
      setProductImages(existingList);
    }
  }, [initialProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!user) {
      setErrorMsg('Você precisa estar autenticado para anunciar.');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('O título do anúncio é obrigatório.');
      return;
    }

    if (!categoryId) {
      setErrorMsg('Selecione uma categoria.');
      return;
    }

    const parsedPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.');
      return;
    }

    if (productImages.length === 0) {
      setErrorMsg('É obrigatório adicionar ao menos 1 foto real do item tocando em "+ ADICIONAR FOTOS".');
      return;
    }

    // Determine primary/main photo
    const mainImg = productImages.find((img) => img.type === 'main') || productImages[0];

    setLoading(true);

    try {
      if (itemType === 'SERVICE' && !isEditing) {
        const payload = {
          name: name.trim(),
          categoryId: parseInt(categoryId),
          priceCents: Math.round(parsedPrice * 100),
          priceType: 'STARTING_AT',
          location: location.trim(),
          offersDelivery,
          allowsNegotiation,
          description: description.trim(),
          imageUrl: mainImg.url,
        };

        const res = await authFetch('/api/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || 'Erro ao publicar serviço.');
          setLoading(false);
          return;
        }

        setSuccessMsg('Serviço anunciado com sucesso!');
        setTimeout(() => {
          onNavigate('services');
        }, 1500);
        return;
      }

      // PRODUCT (CREATE OR EDIT)
      const payload = {
        name: name.trim(),
        categoryId: parseInt(categoryId),
        subcategory: subcategory ? subcategory.trim() : null,
        condition,
        priceCents: Math.round(parsedPrice * 100),
        originalPriceCents: originalPrice
          ? Math.round(parseFloat(originalPrice.replace(',', '.')) * 100)
          : null,
        stock: Math.max(1, parseInt(stock) || 1),
        location: location.trim(),
        offersDelivery,
        offersPickup,
        allowsNegotiation,
        description: description.trim(),
        imageUrl: mainImg.url,
        productImages: productImages.map((img, idx) => ({
          id: img.id,
          url: img.url,
          type: img.type,
          position: typeof img.position === 'number' ? img.position : idx,
          isPrimary: img.type === 'main' || idx === 0,
        })),
      };

      const url = isEditing
        ? `/api/products/${initialProduct!.id}`
        : '/api/products';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao salvar anúncio.');
        setLoading(false);
        return;
      }

      const savedProd = data.product || data;
      setSuccessMsg(
        isEditing
          ? 'Anúncio e fotos atualizados com sucesso!'
          : 'Produto publicado com sucesso no VEND+!'
      );

      setTimeout(() => {
        onSuccess(savedProd);
      }, 1200);
    } catch (err: any) {
      console.error('Submit error:', err);
      setErrorMsg('Falha de conexão com o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="sell-view-container" className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={() => onNavigate('my-store')}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-black text-slate-950">
                {isEditing ? 'Editar Anúncio e Fotos' : 'Criar Novo Anúncio'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEditing
                  ? `Atualize as informações e fotos de "${initialProduct?.name}"`
                  : 'Anuncie no maior marketplace da sua região com fotos de alta qualidade'}
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-sky-700 text-xs font-bold rounded-full border border-sky-100">
            <Sparkles className="w-3.5 h-3.5" />
            Upload Direto Ativo
          </span>
        </div>

        {/* Item Type Switcher (only for new listings) */}
        {!isEditing && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mt-5">
            <button
              type="button"
              id="select-type-product"
              onClick={() => setItemType('PRODUCT')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                itemType === 'PRODUCT'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vender Produto Físico
            </button>
            <button
              type="button"
              id="select-type-service"
              onClick={() => setItemType('SERVICE')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                itemType === 'SERVICE'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Anunciar Serviço Profissional
            </button>
          </div>
        )}
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div
          id="sell-error-alert"
          className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          id="sell-success-alert"
          className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center gap-2.5"
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-6"
      >
        {/* NATIVE DEVICE PHOTO UPLOAD SYSTEM */}
        <div className="pb-4 border-b border-slate-100">
          <ProductImageUploader
            images={productImages}
            onChange={setProductImages}
            maxImages={10}
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Título do Anúncio *
          </label>
          <input
            id="sell-title-input"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              itemType === 'PRODUCT'
                ? 'Ex: iPhone 13 128GB Azul Impecável com Caixa'
                : 'Ex: Pintura Residencial e Comercial com Acabamento Fino'
            }
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white transition"
          />
        </div>

        {/* Category & Condition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Categoria *
            </label>
            <select
              id="sell-category-select"
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
            >
              <option value="">Selecione uma categoria...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {itemType === 'PRODUCT' ? (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Condição do Item *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="condition-novo-btn"
                  onClick={() => setCondition('NOVO')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    condition === 'NOVO'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Produto Novo
                </button>
                <button
                  type="button"
                  id="condition-usado-btn"
                  onClick={() => setCondition('USADO')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    condition === 'USADO'
                      ? 'bg-sky-50 border-sky-400 text-sky-800 shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Produto Usado
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Especialidade / Subcategoria
              </label>
              <input
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="Ex: Alvenaria, Reformas, Elétrica"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
              />
            </div>
          )}
        </div>

        {/* Pricing & Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Preço de Venda (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                R$
              </span>
              <input
                id="sell-price-input"
                type="text"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Preço Original / De (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                R$
              </span>
              <input
                id="sell-original-price-input"
                type="text"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="Opcional"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
              />
            </div>
          </div>

          {itemType === 'PRODUCT' ? (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Quantidade em Estoque *
              </label>
              <input
                id="sell-stock-input"
                type="number"
                min="1"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Tipo de Cobrança
              </label>
              <input
                type="text"
                readOnly
                value="A partir de (Orçamento)"
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
              />
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Localização / Bairro do Vendedor *
          </label>
          <input
            id="sell-location-input"
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: São Paulo, SP - Pinheiros"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Descrição Detalhada do Item *
          </label>
          <textarea
            id="sell-description-input"
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva detalhes, estado de conservação, acessórios inclusos, garantia e tempo de uso..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
          />
        </div>

        {/* Checkboxes: Delivery, Pickup, Negotiation */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 select-none">
            <input
              type="checkbox"
              checked={offersDelivery}
              onChange={(e) => setOffersDelivery(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>Oferecer Entrega Local (protegida com código de 4 dígitos)</span>
          </label>

          {itemType === 'PRODUCT' && (
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 select-none">
              <input
                type="checkbox"
                checked={offersPickup}
                onChange={(e) => setOffersPickup(e.target.checked)}
                className="rounded text-sky-600 focus:ring-sky-500"
              />
              <Package className="w-4 h-4 text-sky-600" />
              <span>Permitir Retirada no Local com o Vendedor</span>
            </label>
          )}

          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-800 select-none">
            <input
              type="checkbox"
              checked={allowsNegotiation}
              onChange={(e) => setAllowsNegotiation(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500"
            />
            <MessageSquare className="w-4 h-4 text-amber-600" />
            <span>Permitir que compradores enviem propostas de negociação</span>
          </label>
        </div>

        {/* Submit button */}
        <div className="pt-4 border-t border-slate-100">
          <button
            id="submit-sell-btn"
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle className="w-5 h-5" />
            <span>
              {loading
                ? isEditing
                  ? 'Salvando Alterações...'
                  : 'Publicando Anúncio...'
                : isEditing
                ? 'Salvar Alterações no Anúncio'
                : 'Publicar Anúncio no VEND+'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
