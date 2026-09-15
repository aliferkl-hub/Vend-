import React, { useState } from 'react';
import {
  Upload,
  PlusCircle,
  Tag,
  DollarSign,
  MapPin,
  Truck,
  Package,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { Category, Product } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface SellViewProps {
  categories: Category[];
  onSuccess: (newProduct: Product) => void;
  onNavigate: (view: string) => void;
}

export const SellView: React.FC<SellViewProps> = ({ categories, onSuccess, onNavigate }) => {
  const { user } = useAuth();

  const [itemType, setItemType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [condition, setCondition] = useState<'NOVO' | 'USADO'>('NOVO');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [location, setLocation] = useState(user?.location || 'São Paulo, SP');
  const [offersDelivery, setOffersDelivery] = useState(true);
  const [offersPickup, setOffersPickup] = useState(true);
  const [allowsNegotiation, setAllowsNegotiation] = useState(true);
  const [description, setDescription] = useState('');

  // Image Upload State
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size < 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('A imagem não pode ultrapassar 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setImagePreview(base64Data);
      setImageUrl(base64Data);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

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

    if (!imageUrl) {
      setErrorMsg('É obrigatório adicionar ao menos 1 foto real do item.');
      return;
    }

    setLoading(true);

    try {
      const endpoint = itemType === 'PRODUCT' ? '/api/products' : '/api/services';

      const payload =
        itemType === 'PRODUCT'
          ? {
              name,
              categoryId,
              condition,
              priceCents: Math.round(parsedPrice * 100),
              originalPriceCents: originalPrice ? Math.round(parseFloat(originalPrice.replace(',', '.')) * 100) : null,
              stock: parseInt(stock) || 1,
              location,
              offersDelivery,
              offersPickup,
              allowsNegotiation,
              description,
              imageUrl,
            }
          : {
              name,
              categoryId,
              priceCents: Math.round(parsedPrice * 100),
              priceType: 'STARTING_AT',
              location,
              offersDelivery,
              allowsNegotiation,
              description,
              imageUrl,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao publicar anúncio.');
        setLoading(false);
        return;
      }

      alert('Anúncio publicado com sucesso!');
      if (itemType === 'PRODUCT' && data.product) {
        onSuccess(data.product);
      } else {
        onNavigate('home');
      }
    } catch {
      setErrorMsg('Erro de conexão ao salvar anúncio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="sell-view" className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Title */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-emerald-500" />
              <span>Criar Novo Anúncio</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Publique produtos ou serviços para milhares de clientes na sua cidade
            </p>
          </div>

          {user && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Seu Plano Atual
              </span>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase">
                {user.planSlug}
              </span>
            </div>
          )}
        </div>

        {/* Type toggle */}
        <div className="mt-5 grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setItemType('PRODUCT')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              itemType === 'PRODUCT'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vender Produto
          </button>
          <button
            type="button"
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
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-5">
        {/* Photo Upload */}
        <div>
          <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
            Foto do Anúncio (Obrigatório) *
          </label>
          <div className="border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
            {imagePreview ? (
              <div className="space-y-3">
                <div className="aspect-video max-h-56 mx-auto rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setImageUrl('');
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline"
                >
                  Remover e escolher outra foto
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 mx-auto flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Clique para selecionar ou arraste uma foto
                  </p>
                  <p className="text-[11px] text-slate-500">Formatos aceitos: JPG, PNG, WEBP (Máx. 5MB)</p>
                </div>
                <input
                  id="product-file-upload-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="product-file-upload-input"
                  className="inline-block cursor-pointer bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs shadow-xs"
                >
                  Selecionar do Dispositivo
                </label>
              </div>
            )}
          </div>
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
            placeholder="Ex: Smartphone Samsung Galaxy S23 256GB Preto Completo"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
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
              <option value="">Selecione uma categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {itemType === 'PRODUCT' && (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Condição do Item *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCondition('NOVO')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    condition === 'NOVO'
                      ? 'bg-[#0B192C] text-white border-[#0B192C]'
                      : 'bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                >
                  Novo (Lacrado)
                </button>
                <button
                  type="button"
                  onClick={() => setCondition('USADO')}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    condition === 'USADO'
                      ? 'bg-[#0B192C] text-white border-[#0B192C]'
                      : 'bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                >
                  Usado / Seminovo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Price & Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Preço de Venda (R$) *
            </label>
            <input
              id="sell-price-input"
              type="number"
              step="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
            />
          </div>

          {itemType === 'PRODUCT' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Preço Original (opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Estoque Disponível
                </label>
                <input
                  type="number"
                  min="1"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white"
                />
              </div>
            </>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            Localização / Cidade / Bairro *
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
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            <span>{loading ? 'Publicando Anúncio...' : 'Publicar Anúncio no VEND+'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
