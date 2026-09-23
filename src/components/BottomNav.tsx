import React from 'react';
import { Home, Search, PlusCircle, Package, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate }) => {
  const { user } = useAuth();

  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B192C] border-t border-slate-800 text-slate-400 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] px-3 shadow-lg"
    >
      <div className="flex items-center justify-around">
        <button
          id="bottom-nav-home"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            currentView === 'home' ? 'text-emerald-400' : 'hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Início</span>
        </button>

        <button
          id="bottom-nav-search"
          onClick={() => onNavigate('search')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            currentView === 'search' ? 'text-emerald-400' : 'hover:text-slate-200'
          }`}
        >
          <Search className="w-5 h-5" />
          <span>Buscar</span>
        </button>

        <button
          id="bottom-nav-sell"
          onClick={() => onNavigate('sell')}
          className="flex flex-col items-center -mt-5"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg border-2 border-[#0B192C] transition-transform active:scale-95">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-emerald-400 mt-0.5">Anunciar</span>
        </button>

        <button
          id="bottom-nav-orders"
          onClick={() => onNavigate('orders')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            currentView === 'orders' ? 'text-emerald-400' : 'hover:text-slate-200'
          }`}
        >
          <Package className="w-5 h-5" />
          <span>Pedidos</span>
        </button>

        <button
          id="bottom-nav-profile"
          onClick={() => onNavigate(user ? 'profile' : 'login')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            currentView === 'profile' || currentView === 'login'
              ? 'text-emerald-400'
              : 'hover:text-slate-200'
          }`}
        >
          <User className="w-5 h-5" />
          <span>{user ? 'Perfil' : 'Entrar'}</span>
        </button>
      </div>
    </nav>
  );
};
