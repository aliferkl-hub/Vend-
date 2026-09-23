import React, { useState, useEffect } from 'react';
import { User as UserIcon, MapPin, Plus, Shield, Package, Trash2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { Address } from '../types.ts';

interface ProfileViewProps {
  onNavigate: (view: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate }) => {
  const { user, logout, refreshUser } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/addresses');
      if (res.ok) {
        setAddresses(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleDeleteAddress = async (id: number) => {
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAddresses();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div id="profile-view" className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* User Info Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-md">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">{user?.name}</h1>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase">
                  Função: {user?.role}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  Plano {user?.planSlug}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              onNavigate('home');
            }}
            className="p-2.5 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
            title="Sair da Conta"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('orders')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-sky-300 text-left transition-all shadow-2xs"
        >
          <Package className="w-5 h-5 text-sky-500 mb-2" />
          <h4 className="text-xs font-bold text-slate-900">Meus Pedidos</h4>
          <p className="text-[10px] text-slate-500">Ver compras e códigos PIN</p>
        </button>

        <button
          onClick={() => onNavigate('plans')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 text-left transition-all shadow-2xs"
        >
          <Shield className="w-5 h-5 text-emerald-500 mb-2" />
          <h4 className="text-xs font-bold text-slate-900">Planos & Taxas</h4>
          <p className="text-[10px] text-slate-500">Upgrade de plano</p>
        </button>

        <button
          onClick={() => onNavigate('seller-dashboard')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-300 text-left transition-all shadow-2xs"
        >
          <UserIcon className="w-5 h-5 text-amber-500 mb-2" />
          <h4 className="text-xs font-bold text-slate-900">Painel Vendedor</h4>
          <p className="text-[10px] text-slate-500">Vendas e saldo</p>
        </button>

        <button
          onClick={() => onNavigate('driver')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-purple-300 text-left transition-all shadow-2xs"
        >
          <MapPin className="w-5 h-5 text-purple-500 mb-2" />
          <h4 className="text-xs font-bold text-slate-900">Entregador</h4>
          <p className="text-[10px] text-slate-500">Validação 4 dígitos</p>
        </button>
      </div>

      {/* Saved Addresses */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span>Endereços Cadastrados</span>
          </h3>
          <button
            onClick={() => onNavigate('checkout')}
            className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar</span>
          </button>
        </div>

        {addresses.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Nenhum endereço salvo ainda.</p>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-900">
                    {addr.recipientName} • {addr.phone}
                  </p>
                  <p className="text-slate-600">
                    {addr.street}, nº {addr.number} {addr.complement || ''}
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    {addr.neighborhood}, {addr.city} - {addr.state} (CEP: {addr.postalCode})
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
