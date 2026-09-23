import React, { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, ArrowUpDown, Tag, Truck, MessageSquare } from 'lucide-react';
import { Product, Category } from '../types.ts';
import { ProductCard } from '../components/ProductCard.tsx';

interface SearchViewProps {
  categories: Category[];
  initialQuery: string;
  initialCategory: string;
  onSelectProduct: (product: Product) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  categories,
  initialQuery,
  initialCategory,
  onSelectProduct,
}) => {
  const [q, setQ] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [condition, setCondition] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [onlyDelivery, setOnlyDelivery] = useState(false);
  const [onlyNegotiation, setOnlyNegotiation] = useState(false);
  const [sortBy, setSortBy] = useState<'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC'>('NEWEST');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (category) params.set('categoria', category);
      if (condition) params.set('condicao', condition);
      if (minPrice) params.set('precoMin', String(Math.round(parseFloat(minPrice) * 100)));
      if (maxPrice) params.set('precoMax', String(Math.round(parseFloat(maxPrice) * 100)));
      if (onlyDelivery) params.set('entrega', 'true');
      if (onlyNegotiation) params.set('negocia', 'true');
      params.set('ordenacao', sortBy);
      params.set('page', String(page));
      params.set('limit', '16');

      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [q, category, condition, minPrice, maxPrice, onlyDelivery, onlyNegotiation, sortBy, page]);

  // Update if initial props change
  useEffect(() => {
    setQ(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  return (
    <div id="search-view" className="space-y-6 pb-16">
      {/* Top Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-sky-500" />
            <span>Resultados da Busca</span>
          </h1>
          <p className="text-xs text-slate-500">
            {loading ? 'Buscando anúncios...' : `${totalCount} anúncios encontrados`}
          </p>
        </div>

        {/* Sort drop */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Ordenar por:</span>
          <select
            id="search-sort-select"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
          >
            <option value="NEWEST">Mais Recentes</option>
            <option value="PRICE_ASC">Menor Preço</option>
            <option value="PRICE_DESC">Maior Preço</option>
          </select>
        </div>
      </div>

      {/* Content Layout: Filters Sidebar + Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <aside className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5 h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="font-black text-sm text-slate-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-sky-500" />
              Filtros
            </span>
            {(category || condition || minPrice || maxPrice || onlyDelivery || onlyNegotiation) && (
              <button
                onClick={() => {
                  setCategory('');
                  setCondition('');
                  setMinPrice('');
                  setMaxPrice('');
                  setOnlyDelivery(false);
                  setOnlyNegotiation(false);
                  setPage(1);
                }}
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-sky-500"
            >
              <option value="">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Condition Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Condição
            </label>
            <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setCondition('');
                  setPage(1);
                }}
                className={`py-1.5 rounded-lg border text-center ${
                  condition === ''
                    ? 'bg-[#0B192C] text-white border-[#0B192C]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => {
                  setCondition('NOVO');
                  setPage(1);
                }}
                className={`py-1.5 rounded-lg border text-center ${
                  condition === 'NOVO'
                    ? 'bg-[#0B192C] text-white border-[#0B192C]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Novo
              </button>
              <button
                type="button"
                onClick={() => {
                  setCondition('USADO');
                  setPage(1);
                }}
                className={`py-1.5 rounded-lg border text-center ${
                  condition === 'USADO'
                    ? 'bg-[#0B192C] text-white border-[#0B192C]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Usado
              </button>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Faixa de Preço (R$)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Mínimo"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-sky-500"
              />
              <input
                type="number"
                placeholder="Máximo"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Checkbox Toggles */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={onlyDelivery}
                onChange={(e) => {
                  setOnlyDelivery(e.target.checked);
                  setPage(1);
                }}
                className="rounded text-sky-600 focus:ring-sky-500"
              />
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Apenas com Entrega</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={onlyNegotiation}
                onChange={(e) => {
                  setOnlyNegotiation(e.target.checked);
                  setPage(1);
                }}
                className="rounded text-sky-600 focus:ring-sky-500"
              />
              <MessageSquare className="w-3.5 h-3.5 text-sky-600" />
              <span>Aceita Negociação</span>
            </label>
          </div>
        </aside>

        {/* Results Grid */}
        <div className="lg:col-span-3 space-y-6">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-64 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
              <Search className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">Nenhum anúncio encontrado</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tente ajustar os termos da busca ou remover alguns filtros para encontrar mais opções.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {products.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onClick={() => onSelectProduct(prod)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs font-bold text-slate-600 px-2">
                Página {page} de {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
