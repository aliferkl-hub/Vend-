import React, { useState } from 'react';
import {
  Search,
  MapPin,
  ShoppingBag,
  PlusCircle,
  User as UserIcon,
  MessageSquare,
  ShieldCheck,
  Package,
  Truck,
  LogOut,
  LayoutDashboard,
  Heart,
  ChevronDown,
  Sparkles,
  Store,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useCart } from '../context/CartContext.tsx';

interface HeaderProps {
  currentView?: string;
  onNavigate: (view: string, param?: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  onSearch?: (q: string) => void;
  onOpenAuth?: (tab: 'LOGIN' | 'REGISTER') => void;
  unreadNotifications?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onSearch,
  onOpenAuth,
  unreadNotifications,
}) => {
  const { user, logout } = useAuth();
  const { totalItemsCount } = useCart();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery || '');

  // Keep local query in sync if prop changes
  React.useEffect(() => {
    if (searchQuery !== undefined) {
      setLocalQuery(searchQuery);
    }
  }, [searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value);
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit(e);
    }
    if (onSearch) {
      onSearch(localQuery);
    }
  };

  return (
    <header id="main-header" className="sticky top-0 z-50 bg-[#0B192C] text-white shadow-md">
      {/* Top micro bar: Safety & Guarantee notice */}
      <div className="bg-[#07101E] text-slate-300 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-emerald-300">Compra Segura VEND+:</span>
            <span className="hidden sm:inline">Liberação de entrega protegida por código de 4 dígitos.</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-xs">
            <button
              id="header-nav-plans"
              onClick={() => onNavigate('plans')}
              className="hover:text-white transition-colors"
            >
              Planos para Vendedores
            </button>
            <button
              id="header-nav-faq"
              onClick={() => onNavigate('faq')}
              className="hover:text-white transition-colors"
            >
              Ajuda & FAQ
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3">
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-x-3 md:gap-x-6 gap-y-2">
          {/* Logo */}
          <div
            id="brand-logo-btn"
            onClick={() => onNavigate('home')}
            className="order-1 cursor-pointer flex items-center gap-2 select-none flex-shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center font-black text-lg sm:text-xl text-slate-950 shadow-sm">
              V+
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center">
                VEND<span className="text-emerald-400">+</span>
              </span>
              <p className="text-[9px] sm:text-[10px] text-sky-200 tracking-wider font-semibold -mt-1 hidden sm:block">
                MAIS PERTO. MAIS VEND+.
              </p>
            </div>
          </div>

          {/* Location picker */}
          <button
            id="header-location-btn"
            onClick={() => onNavigate('search')}
            className="order-1 hidden lg:flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700/60"
            title="Alterar cidade"
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="font-medium truncate max-w-[110px]">
              {user?.location || 'Brasil / Local'}
            </span>
          </button>

          {/* Search Bar - Responsive, perfectly aligned lupinha and Buscar button without overlap */}
          <form
            id="header-search-form"
            onSubmit={handleFormSubmit}
            className="order-3 md:order-2 w-full md:w-auto md:flex-1 max-w-2xl relative flex items-center"
          >
            <div className="relative w-full flex items-center">
              {/* Lupinha strictly inside on the left, vertically centered */}
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                aria-hidden="true"
              />

              {/* Input with dedicated padding: pl-10 for lupinha, pr-24 for the button */}
              <input
                id="header-search-input"
                type="text"
                value={localQuery}
                onChange={handleInputChange}
                placeholder="Buscar celulares, notebooks, ferramentas, serviços locais..."
                className="w-full bg-slate-800/90 text-white placeholder-slate-400 pl-10 pr-24 py-2 sm:py-2.5 rounded-xl border border-slate-700 text-xs sm:text-sm focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all shadow-inner"
              />

              {/* Botão Buscar strictly on the right, vertically centered */}
              <button
                id="header-search-submit-btn"
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 active:scale-95 text-slate-950 rounded-lg font-bold text-xs flex items-center justify-center transition-all shadow-xs cursor-pointer select-none"
              >
                Buscar
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="order-2 md:order-3 flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Criar Loja com IA Button */}
            <button
              id="header-create-store-ai-btn"
              onClick={() => onNavigate('create-store-ai')}
              className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-black px-3 py-2 rounded-xl text-xs sm:text-sm shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
              title="Criar Minha Loja Virtual com IA"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span className="hidden sm:inline">Criar Loja com IA</span>
              <span className="sm:hidden">Loja IA</span>
            </button>

            {/* Planos Mensais Button */}
            <button
              id="header-nav-plans-btn"
              onClick={() => onNavigate('plans')}
              className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all transform hover:-translate-y-0.5 cursor-pointer"
              title="Planos Mensais VEND+"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Planos</span>
            </button>

            {/* Create Listing Button */}
            <button
              id="header-sell-btn"
              onClick={() => onNavigate('sell')}
              className="hidden sm:flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-sm transition-all transform hover:-translate-y-0.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Anunciar</span>
            </button>

            {/* Negotiations Link */}
            {user && (
              <button
                id="header-negotiations-btn"
                onClick={() => onNavigate('negotiations')}
                className="hidden md:flex items-center gap-1 text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                title="Minhas Negociações"
              >
                <MessageSquare className="w-5 h-5 text-sky-400" />
              </button>
            )}

            {/* Cart Button */}
            <button
              id="header-cart-btn"
              onClick={() => onNavigate('cart')}
              className="relative p-2 text-slate-200 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Carrinho de Compras"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItemsCount > 0 && (
                <span
                  id="header-cart-count-badge"
                  className="absolute -top-1 -right-1 bg-emerald-400 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow"
                >
                  {totalItemsCount}
                </span>
              )}
            </button>

            {/* User Account / Login */}
            {user ? (
              <div className="relative">
                <button
                  id="header-user-menu-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700/80 px-2.5 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold text-white transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-300 flex items-center justify-center font-bold">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden md:inline max-w-[100px] truncate">{user.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div
                    id="header-user-dropdown"
                    className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-2 z-50 text-slate-200 text-xs"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-slate-800">
                      <p className="font-bold text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                          Plano {user.planSlug}
                        </span>
                        {user.role === 'MASTER_OWNER' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                            MASTER OWNER
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      id="dropdown-item-my-store"
                      onClick={() => onNavigate('my-store')}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-sky-300 font-semibold"
                    >
                      <Store className="w-4 h-4 text-sky-400" />
                      <span>Minha Loja Virtual (IA)</span>
                    </button>

                    <button
                      id="dropdown-item-plans"
                      onClick={() => onNavigate('plans')}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2 text-amber-300 font-semibold"
                    >
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Planos Mensais VEND+</span>
                    </button>

                    <button
                      id="dropdown-item-profile"
                      onClick={() => onNavigate('profile')}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>Meu Perfil & Endereços</span>
                    </button>

                    <button
                      id="dropdown-item-orders"
                      onClick={() => onNavigate('orders')}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Package className="w-4 h-4 text-slate-400" />
                      <span>Meus Pedidos de Compra</span>
                    </button>

                    <button
                      id="dropdown-item-sales"
                      onClick={() => onNavigate('seller-dashboard')}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-emerald-300">Painel do Vendedor</span>
                    </button>

                    <button
                      id="dropdown-item-negotiations"
                      onClick={() => onNavigate('negotiations')}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4 text-sky-400" />
                      <span>Minhas Negociações</span>
                    </button>

                    <button
                      id="dropdown-item-deliveries"
                      onClick={() => onNavigate('deliveries')}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Truck className="w-4 h-4 text-amber-400" />
                      <span>Área do Entregador (Código 4 Dígitos)</span>
                    </button>

                    <button
                      id="dropdown-item-favorites"
                      onClick={() => onNavigate('favorites')}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center gap-2"
                    >
                      <Heart className="w-4 h-4 text-rose-400" />
                      <span>Meus Favoritos</span>
                    </button>

                    {user.role === 'MASTER_OWNER' && (
                      <div className="border-t border-slate-800 my-1 pt-1">
                        <button
                          id="dropdown-item-master-owner"
                          onClick={() => onNavigate('admin')}
                          className="w-full text-left px-3 py-2 hover:bg-amber-950/40 text-amber-300 font-bold flex items-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <span>Painel Master Owner</span>
                        </button>
                      </div>
                    )}

                    <div className="border-t border-slate-800 my-1 pt-1">
                      <button
                        id="dropdown-item-logout"
                        onClick={logout}
                        className="w-full text-left px-3 py-2 hover:bg-rose-950/30 text-rose-300 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sair da Conta</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                id="header-login-btn"
                onClick={() => {
                  if (onOpenAuth) onOpenAuth('LOGIN');
                  else onNavigate('login');
                }}
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 px-3.5 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
