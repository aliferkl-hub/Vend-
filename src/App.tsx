import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { CartProvider, useCart } from './context/CartContext.tsx';

// Components
import { Header } from './components/Header.tsx';
import { CategoryBar } from './components/CategoryBar.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { AuthModal } from './components/AuthModal.tsx';

// Views
import { HomeView } from './views/HomeView.tsx';
import { SearchView } from './views/SearchView.tsx';
import { ProductDetailView } from './views/ProductDetailView.tsx';
import { ServicesView } from './views/ServicesView.tsx';
import { SellView } from './views/SellView.tsx';
import { NegotiationsView } from './views/NegotiationsView.tsx';
import { CartView } from './views/CartView.tsx';
import { CheckoutView } from './views/CheckoutView.tsx';
import { OrdersView } from './views/OrdersView.tsx';
import { DriverView } from './views/DriverView.tsx';
import { SellerDashboardView } from './views/SellerDashboardView.tsx';
import { PlansView } from './views/PlansView.tsx';
import { AdminView } from './views/AdminView.tsx';
import { ProfileView } from './views/ProfileView.tsx';
import { CreateStoreAIView } from './views/CreateStoreAIView.tsx';
import { MyStoreView } from './views/MyStoreView.tsx';
import { StoreFrontView } from './views/StoreFrontView.tsx';

import { Product, ServiceItem, Category, Negotiation } from './types.ts';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const { totalItemsCount } = useCart();

  // Navigation State
  const [currentView, setCurrentView] = useState<string>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('');
  const [storeSlug, setStoreSlug] = useState<string>('');

  // Check URL query parameters for direct store view (?loja=slug)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const loja = urlParams.get('loja');
      if (loja) {
        setStoreSlug(loja);
        setCurrentView('store-front');
      }
    } catch {
      // ignore
    }
  }, []);

  // Selected item states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [checkoutNegotiation, setCheckoutNegotiation] = useState<Negotiation | null>(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Shared Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);

  const fetchInitialData = async () => {
    try {
      const [resCat, resProd, resServ] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/products?limit=24'),
        fetch('/api/services?limit=12'),
      ]);

      if (resCat.ok) {
        const catData = await resCat.json();
        setCategories(Array.isArray(catData) ? catData : catData.items || []);
      }
      if (resProd.ok) {
        const prodData = await resProd.json();
        setProducts(Array.isArray(prodData) ? prodData : prodData.items || []);
      }
      if (resServ.ok) {
        const servData = await resServ.json();
        setServices(Array.isArray(servData) ? servData : servData.items || []);
      }
    } catch (e) {
      console.error('Error loading initial data:', e);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Handlers
  const handleNavigate = (view: string, param?: string) => {
    setCurrentView(view);
    if (view === 'search' && param) {
      setSearchQuery(param);
    }
    if (view === 'store-front' && param) {
      setStoreSlug(param);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    setSelectedCategorySlug('');
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectCategory = (slug: string) => {
    setSelectedCategorySlug(slug);
    setSearchQuery('');
    setCurrentView('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setCurrentView('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectService = (serv: ServiceItem) => {
    setSelectedService(serv);
    // Can navigate to services view or negotiation
    setCurrentView('services');
  };

  const handleBuyNow = (prod: Product) => {
    setSelectedProduct(prod);
    setCheckoutNegotiation(null);
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedNegotiationToCheckout = (neg: Negotiation) => {
    setCheckoutNegotiation(neg);
    setCurrentView('checkout');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderCreated = (orderId: number) => {
    setCurrentView('orders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        onSearch={handleSearchSubmit}
        onOpenAuth={(tab) => {
          setAuthModalTab(tab);
          setIsAuthModalOpen(true);
        }}
        onNavigate={handleNavigate}
        unreadNotifications={unreadNotifications}
      />

      {/* Category Bar (visible on home and search) */}
      {(currentView === 'home' || currentView === 'search') && (
        <CategoryBar
          categories={categories}
          activeCategory={selectedCategorySlug}
          onSelectCategory={handleSelectCategory}
        />
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24">
        {currentView === 'home' && (
          <HomeView
            products={products}
            services={services}
            categories={categories}
            onSelectProduct={handleSelectProduct}
            onSelectService={handleSelectService}
            onNavigate={handleNavigate}
            onSelectCategory={handleSelectCategory}
            onRefreshData={fetchInitialData}
          />
        )}

        {currentView === 'search' && (
          <SearchView
            categories={categories}
            initialQuery={searchQuery}
            initialCategory={selectedCategorySlug}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {currentView === 'product-detail' && selectedProduct && (
          <ProductDetailView
            product={selectedProduct}
            onBack={() => setCurrentView('home')}
            onBuyNow={handleBuyNow}
            onNegotiationStarted={(negId) => {
              setCurrentView('negotiations');
            }}
          />
        )}

        {currentView === 'services' && (
          <ServicesView
            services={services}
            onSelectService={handleSelectService}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'sell' && (
          <SellView
            categories={categories}
            onSuccess={(newProduct) => {
              setSelectedProduct(newProduct);
              setCurrentView('product-detail');
              fetchInitialData();
            }}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'negotiations' && (
          <NegotiationsView
            onProceedToCheckout={handleProceedNegotiationToCheckout}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {currentView === 'cart' && (
          <CartView
            onProceedToCheckout={() => setCurrentView('checkout')}
            onContinueShopping={() => setCurrentView('home')}
          />
        )}

        {currentView === 'checkout' && (
          <CheckoutView
            negotiationItem={checkoutNegotiation}
            onOrderCreated={handleOrderCreated}
            onBack={() => setCurrentView('cart')}
          />
        )}

        {currentView === 'orders' && <OrdersView onNavigate={handleNavigate} />}

        {currentView === 'driver' && <DriverView />}

        {currentView === 'seller-dashboard' && (
          <SellerDashboardView
            onNavigate={handleNavigate}
            onSelectProduct={handleSelectProduct}
          />
        )}

        {currentView === 'plans' && <PlansView onNavigate={handleNavigate} />}

        {currentView === 'admin' && (
          <AdminView
            onRefreshCatalog={fetchInitialData}
            onNavigate={(view, data) => {
              if (view === 'store-front' && data) {
                setStoreSlug(data);
              }
              handleNavigate(view, data);
            }}
          />
        )}

        {currentView === 'profile' && <ProfileView onNavigate={handleNavigate} />}

        {currentView === 'create-store-ai' && (
          <CreateStoreAIView
            onNavigate={(view, data) => {
              if (view === 'store-front' && data) {
                setStoreSlug(data);
              }
              handleNavigate(view, data);
            }}
          />
        )}

        {currentView === 'my-store' && (
          <MyStoreView
            onNavigate={(view, data) => {
              if (view === 'store-front' && data) {
                setStoreSlug(data);
              }
              handleNavigate(view, data);
            }}
          />
        )}

        {currentView === 'store-front' && (
          <StoreFrontView
            storeSlug={storeSlug}
            onNavigate={(view, data) => {
              handleNavigate(view, data);
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav currentView={currentView} onNavigate={handleNavigate} />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        defaultTab={authModalTab}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </AuthProvider>
  );
}
