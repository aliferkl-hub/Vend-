import React from 'react';
import { MapPin, Truck, MessageSquare, Heart, ShieldCheck } from 'lucide-react';
import { Product } from '../types.ts';
import { ResponsiveProductImage } from './ResponsiveProductImage.tsx';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
  onFavoriteToggle?: (e: React.MouseEvent) => void;
  isFavorited?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onClick,
  onFavoriteToggle,
  isFavorited = false,
}) => {
  const formattedPrice = (product.priceCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const formattedOriginalPrice = product.originalPriceCents
    ? (product.originalPriceCents / 100).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    : null;

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={onClick}
      className="group bg-white rounded-2xl border border-slate-200/80 hover:border-sky-400/60 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer overflow-hidden relative"
    >
      {/* Image container */}
      <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
        <ResponsiveProductImage
          product={product}
          alt={product.name}
          className="group-hover:scale-105 transition-transform duration-300"
          containerClassName="w-full h-full"
        />

        {/* Favorite Button */}
        {onFavoriteToggle && (
          <button
            id={`fav-btn-prod-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle(e);
            }}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-600 hover:text-rose-500 shadow-xs transition-colors"
            title="Favoritar"
          >
            <Heart
              className={`w-4 h-4 ${isFavorited ? 'fill-rose-500 text-rose-500' : ''}`}
            />
          </button>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase ${
              product.condition === 'NOVO'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900/80 text-white backdrop-blur-xs'
            }`}
          >
            {product.condition === 'NOVO' ? 'Novo' : 'Usado'}
          </span>
          {product.stock <= 0 && (
            <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-sm">
              Sem Estoque
            </span>
          )}
        </div>

        {/* Out of Stock Banner Overlay */}
        {product.stock <= 0 && (
          <div className="absolute inset-x-0 bottom-0 bg-slate-950/90 text-amber-300 text-[11px] font-extrabold py-1.5 px-2 text-center backdrop-blur-xs border-t border-amber-400/30 z-10">
            Produto VEND+ — sem estoque no momento
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Location */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="font-medium truncate max-w-[120px]">
              {product.category?.name || 'Geral'}
            </span>
            <span className="flex items-center gap-0.5 truncate max-w-[110px]">
              <MapPin className="w-3 h-3 text-slate-400" />
              {product.location}
            </span>
          </div>

          {/* Product Name */}
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-sky-600 transition-colors">
            {product.name}
          </h3>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100">
          {/* Price */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-slate-950">
              {formattedPrice}
            </span>
            {formattedOriginalPrice && (
              <span className="text-xs text-slate-400 line-through">
                {formattedOriginalPrice}
              </span>
            )}
          </div>

          {/* Features / Perks Tags */}
          <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-slate-600">
            {product.offersDelivery && (
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                <Truck className="w-3 h-3" />
                Entrega
              </span>
            )}
            {product.allowsNegotiation && (
              <span className="flex items-center gap-1 text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                <MessageSquare className="w-3 h-3" />
                Negocia
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
