import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem } from '../types.ts';

interface CartContextType {
  items: CartItem[];
  addItem: (item: Partial<CartItem> & { priceCents?: number; price?: number }) => { success: boolean; message?: string };
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItemsCount: number;
  subtotalCents: number;
  subtotal: number;
  sellerId: number | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'vend_cart';

// Normalize any cart item to ensure all required fields are present and typed correctly
export function normalizeCartItem(raw: any): CartItem {
  const parsedProductId =
    raw.productId !== undefined && raw.productId !== null
      ? parseInt(String(raw.productId), 10)
      : raw.id && typeof raw.id === 'number'
      ? raw.id
      : undefined;

  const parsedServiceId =
    raw.serviceId !== undefined && raw.serviceId !== null
      ? parseInt(String(raw.serviceId), 10)
      : undefined;

  const type: 'PRODUCT' | 'SERVICE' = raw.type === 'SERVICE' ? 'SERVICE' : 'PRODUCT';
  const name = String(raw.name || raw.title || 'Produto VEND+');
  const title = name;
  const image = String(raw.image || raw.imageUrl || '');
  const imageUrl = image;

  const priceCents = Math.round(
    typeof raw.priceCents === 'number' && !isNaN(raw.priceCents)
      ? raw.priceCents
      : typeof raw.price === 'number' && !isNaN(raw.price)
      ? raw.price * 100
      : parseFloat(String(raw.priceCents || raw.price || 0)) * (raw.priceCents ? 1 : 100) || 0
  );

  const price = priceCents / 100;
  const quantity = Math.max(1, parseInt(String(raw.quantity), 10) || 1);
  const sellerId = parseInt(String(raw.sellerId), 10) || 1;
  const sellerName = String(raw.sellerName || 'Vendedor VEND+');
  const stock = typeof raw.stock === 'number' ? raw.stock : 999;
  const variations = raw.variations || null;
  const subtotalCents = priceCents * quantity;
  const subtotal = subtotalCents / 100;

  const id = String(
    raw.id ||
      `${parsedProductId ? `prod-${parsedProductId}` : `serv-${parsedServiceId}`}-${Date.now()}`
  );

  return {
    id,
    productId: parsedProductId,
    serviceId: parsedServiceId,
    type,
    title,
    name,
    imageUrl,
    image,
    priceCents,
    price,
    quantity,
    sellerId,
    sellerName,
    stock,
    variations,
    subtotalCents,
    subtotal,
  };
}

function loadSavedCart(): CartItem[] {
  try {
    const rawLocal = localStorage.getItem(CART_STORAGE_KEY);
    const rawSession = sessionStorage.getItem(CART_STORAGE_KEY);
    const raw = rawLocal || rawSession;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeCartItem);
  } catch (e) {
    console.error('[CartContext] Erro ao carregar carrinho persistido:', e);
    return [];
  }
}

function persistCart(items: CartItem[]) {
  try {
    const serialized = JSON.stringify(items);
    localStorage.setItem(CART_STORAGE_KEY, serialized);
    sessionStorage.setItem(CART_STORAGE_KEY, serialized);
    // Broadcast event for multi-tab or non-React listeners
    window.dispatchEvent(new CustomEvent('vend_cart_updated', { detail: items }));
  } catch (e) {
    console.error('[CartContext] Erro ao salvar carrinho:', e);
  }
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(loadSavedCart);

  // Sync to localStorage and sessionStorage whenever items state changes
  useEffect(() => {
    persistCart(items);
  }, [items]);

  // Listen to external storage updates (e.g. across tabs or other windows)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setItems(parsed.map(normalizeCartItem));
          }
        } catch {
          // ignore
        }
      }
    };

    const handleCustomUpdate = (e: Event) => {
      const custom = e as CustomEvent<CartItem[]>;
      if (custom.detail && Array.isArray(custom.detail)) {
        setItems(custom.detail.map(normalizeCartItem));
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('vend_cart_updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('vend_cart_updated', handleCustomUpdate);
    };
  }, []);

  const sellerId = items.length > 0 ? items[0].sellerId : null;

  const addItem = useCallback(
    (rawItem: Partial<CartItem> & { priceCents?: number; price?: number }): { success: boolean; message?: string } => {
      const normalized = normalizeCartItem(rawItem);

      if (normalized.type === 'PRODUCT' && normalized.stock !== undefined && normalized.stock <= 0) {
        return {
          success: false,
          message: 'Produto VEND+ — sem estoque no momento',
        };
      }

      setItems((prevItems) => {
        // Single seller validation: If cart has items from another seller,
        // seamlessly switch cart to the new seller's items to avoid losing the user's intent
        if (prevItems.length > 0 && prevItems[0].sellerId !== normalized.sellerId) {
          return [normalized];
        }

        // Check if item already exists in cart (matching productId or serviceId)
        const existingIndex = prevItems.findIndex(
          (it) =>
            (normalized.productId && it.productId === normalized.productId) ||
            (normalized.serviceId && it.serviceId === normalized.serviceId)
        );

        if (existingIndex > -1) {
          const updated = [...prevItems];
          const newQty = updated[existingIndex].quantity + normalized.quantity;
          const newSubtotalCents = updated[existingIndex].priceCents * newQty;
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: newQty,
            subtotalCents: newSubtotalCents,
            subtotal: newSubtotalCents / 100,
          };
          return updated;
        }

        return [...prevItems, normalized];
      });

      return { success: true, message: 'Adicionado ao carrinho com sucesso!' };
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((it) => it.id !== id));
      return;
    }
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const subtotalCents = it.priceCents * quantity;
          return {
            ...it,
            quantity,
            subtotalCents,
            subtotal: subtotalCents / 100,
          };
        }
        return it;
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
      sessionStorage.removeItem(CART_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('vend_cart_updated', { detail: [] }));
    } catch {
      // ignore
    }
  }, []);

  const totalItemsCount = items.reduce((sum, it) => sum + (it.quantity || 1), 0);
  const subtotalCents = items.reduce((sum, it) => sum + (it.priceCents || 0) * (it.quantity || 1), 0);
  const subtotal = subtotalCents / 100;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItemsCount,
        subtotalCents,
        subtotal,
        sellerId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
