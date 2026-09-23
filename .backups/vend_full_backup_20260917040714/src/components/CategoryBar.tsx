import React from 'react';
import {
  Smartphone,
  Laptop,
  Tv,
  Gamepad2,
  Wrench,
  Watch,
  Coffee,
  HeartHandshake,
  Car,
  Home,
  Shirt,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { Category } from '../types.ts';

interface CategoryBarProps {
  categories: Category[];
  selectedCategory: string;
  onSelectCategory: (slug: string) => void;
}

// Icon mapper
const getIcon = (iconName: string) => {
  switch (iconName.toLowerCase()) {
    case 'smartphone':
      return <Smartphone className="w-4 h-4" />;
    case 'laptop':
      return <Laptop className="w-4 h-4" />;
    case 'tv':
      return <Tv className="w-4 h-4" />;
    case 'gamepad':
    case 'gamepad2':
      return <Gamepad2 className="w-4 h-4" />;
    case 'wrench':
    case 'tools':
      return <Wrench className="w-4 h-4" />;
    case 'watch':
      return <Watch className="w-4 h-4" />;
    case 'coffee':
    case 'appliances':
      return <Coffee className="w-4 h-4" />;
    case 'briefcase':
    case 'services':
      return <HeartHandshake className="w-4 h-4" />;
    case 'car':
      return <Car className="w-4 h-4" />;
    case 'home':
      return <Home className="w-4 h-4" />;
    case 'shirt':
      return <Shirt className="w-4 h-4" />;
    default:
      return <ShoppingBag className="w-4 h-4" />;
  }
};

export const CategoryBar: React.FC<CategoryBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <div id="category-bar" className="bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar">
          <button
            id="cat-chip-all"
            onClick={() => onSelectCategory('')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === ''
                ? 'bg-[#0B192C] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Todos os Anúncios</span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                id={`cat-chip-${cat.slug}`}
                onClick={() => onSelectCategory(cat.slug)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[#0B192C] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className={isSelected ? 'text-sky-400' : 'text-slate-500'}>
                  {getIcon(cat.icon)}
                </span>
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
