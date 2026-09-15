import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem } from '../types.ts';

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => { success: boolean; message?: string };
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItemsCount: number;
  subtotalCents: number;
  sellerId: number | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('vend_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('vend_cart', JSON.stringify(items));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }, [items]);

  const sellerId = items.length > 0 ? items[0].sellerId : null;

  const addItem = (newItem: Omit<CartItem, 'id'>): { success: boolean; message?: string } => {
    if (newItem.type === 'PRODUCT' && newItem.stock !== undefined && newItem.stock <= 0) {
      return {
        success: false,
        message: 'Produto VEND+ — sem estoque no momento',
      };
    }

    // Single seller validation: If cart has items from another seller, warn user
    if (items.length > 0 && items[0].sellerId !== newItem.sellerId) {
      const confirmClear = window.confirm(
        'Seu carrinho já contém itens de outro vendedor. Deseja limpar o carrinho atual para adicionar este novo item?'
      );
      if (!confirmClear) {
        return {
          success: false,
          message: 'Seu carrinho possui itens de outro vendedor. Finalize a compra atual primeiro.',
        };
      }
      const uniqueId = `${newItem.productId || newItem.serviceId}-${Date.now()}`;
      setItems([{ ...newItem, id: uniqueId }]);
      return { success: true, message: 'Carrinho atualizado com o novo item!' };
    }

    // Check if item already in cart
    const existingIndex = items.findIndex(
      (it) =>
        (newItem.productId && it.productId === newItem.productId) ||
        (newItem.serviceId && it.serviceId === newItem.serviceId)
    );

    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += newItem.quantity;
      setItems(updated);
      return { success: true, message: 'Quantidade atualizada no carrinho!' };
    }

    const uniqueId = `${newItem.productId || newItem.serviceId}-${Date.now()}`;
    setItems([...items, { ...newItem, id: uniqueId }]);
    return { success: true, message: 'Adicionado ao carrinho com sucesso!' };
  };

  const removeItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems(items.map((it) => (it.id === id ? { ...it, quantity } : it)));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItemsCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const subtotalCents = items.reduce((sum, it) => sum + it.priceCents * it.quantity, 0);

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
