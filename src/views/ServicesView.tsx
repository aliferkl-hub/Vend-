import React, { useState } from 'react';
import { Sparkles, MapPin, Search, PlusCircle, Star } from 'lucide-react';
import { ServiceItem } from '../types.ts';
import { ServiceCard } from '../components/ServiceCard.tsx';

interface ServicesViewProps {
  services: ServiceItem[];
  onSelectService: (service: ServiceItem) => void;
  onNavigate: (view: string) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  onSelectService,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const safeServices = Array.isArray(services) ? services : [];

  const filtered = safeServices.filter((s) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.location.toLowerCase().includes(q);
  });

  return (
    <div id="services-view" className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-sky-500" />
            <span>Serviços & Profissionais Locais</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Contrate profissionais verificados da sua cidade com orçamento transparente e proposta direta
          </p>
        </div>

        <button
          onClick={() => onNavigate('sell')}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow transition-all self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Anunciar Meu Serviço</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar serviço, eletricista, pintor, frete..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:border-sky-500 shadow-2xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Nenhum serviço encontrado</h3>
          <p className="text-xs text-slate-500">Tente buscar por termos mais genéricos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              onClick={() => onSelectService(s)}
              onNegotiate={() => onSelectService(s)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
