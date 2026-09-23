import React from 'react';
import { MapPin, Star, MessageSquare, ShieldCheck } from 'lucide-react';
import { ServiceItem } from '../types.ts';

interface ServiceCardProps {
  service: ServiceItem;
  onClick: () => void;
  onNegotiate?: () => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onClick, onNegotiate }) => {
  const formattedPrice = (service.priceCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  return (
    <div
      id={`service-card-${service.id}`}
      onClick={onClick}
      className="group bg-white rounded-2xl border border-slate-200 hover:border-emerald-400/60 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer overflow-hidden"
    >
      <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
        <img
          src={service.imageUrl}
          alt={service.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-2.5 left-2.5">
          <span className="bg-[#0B192C]/85 text-emerald-300 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
            Serviço Local
          </span>
        </div>
      </div>

      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {service.category?.name || 'Serviços'}
            </span>
            <span className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3 text-slate-400" />
              {service.location}
            </span>
          </div>

          <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
            {service.name}
          </h3>

          <p className="text-xs text-slate-600 line-clamp-2 mt-1">
            {service.description}
          </p>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">
              {service.priceType === 'STARTING_AT' ? 'A partir de' : 'Valor'}
            </span>
            <span className="text-base font-black text-slate-950">
              {formattedPrice}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              id={`service-contact-btn-${service.id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onNegotiate) onNegotiate();
                else onClick();
              }}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Contratar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
