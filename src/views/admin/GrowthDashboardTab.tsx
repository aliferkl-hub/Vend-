import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Share2,
  DollarSign,
  ShoppingBag,
  Store,
  RefreshCw,
  Bell,
  Award,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Flame,
  Plus,
  Target,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export const GrowthDashboardTab: React.FC = () => {
  const { authFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [growthData, setGrowthData] = useState<any>(null);
  const [waitlistData, setWaitlistData] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [prospects, setProspects] = useState<any[]>([]);

  // Sub-tabs in Growth
  const [activeSubTab, setActiveSubTab] = useState<'METRICS' | 'AFFILIATES' | 'WAITLIST' | 'PROSPECTS' | 'CAMPAIGNS'>('METRICS');

  const fetchAllGrowthData = async () => {
    setLoading(true);
    try {
      const [dashRes, waitRes, campRes, prospRes] = await Promise.all([
        authFetch('/api/growth/dashboard'),
        authFetch('/api/growth/waitlist'),
        authFetch('/api/growth/campaigns'),
        authFetch('/api/growth/prospects'),
      ]);

      if (dashRes.ok) setGrowthData(await dashRes.json());
      if (waitRes.ok) setWaitlistData(await waitRes.json());
      if (campRes.ok) {
        const cData = await campRes.json();
        setCampaigns(cData.campaigns || []);
      }
      if (prospRes.ok) {
        const pData = await prospRes.json();
        setProspects(pData.prospects || []);
      }
    } catch (err) {
      console.error('Error fetching Growth data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllGrowthData();
  }, []);

  const metrics = growthData?.metrics || {};
  const funnel = growthData?.funnel || [];
  const topAffiliates = growthData?.topAffiliates || [];
  const leads = waitlistData?.leads || [];
  const waitlistCounts = waitlistData?.counts || {};

  const formatBRL = (cents: number) => {
    return ((cents || 0) / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>VEND+ Growth Engine • Métricas Reais do Ecossistema</span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">
            Aquisição, Afiliados & Crescimento Orgânico
          </h2>
          <p className="text-xs text-slate-300">
            Acompanhamento transparente sem métricas infladas. Todos os dados são auditados no banco PostgreSQL.
          </p>
        </div>

        <button
          onClick={fetchAllGrowthData}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Métricas</span>
        </button>
      </div>

      {/* 2. SUB-TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('METRICS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeSubTab === 'METRICS'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Funil & Indicadores Reais
        </button>

        <button
          onClick={() => setActiveSubTab('AFFILIATES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeSubTab === 'AFFILIATES'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Afiliados ({metrics.affiliates || 0})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('WAITLIST')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeSubTab === 'WAITLIST'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Lista de Espera / "Avisar" ({leads.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('PROSPECTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeSubTab === 'PROSPECTS'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Prospecção de Lojistas ({prospects.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('CAMPAIGNS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeSubTab === 'CAMPAIGNS'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Campanhas ({campaigns.length})</span>
        </button>
      </div>

      {/* 3. METRICS OVERVIEW */}
      {activeSubTab === 'METRICS' && (
        <div className="space-y-6">
          {/* CARDS TOP LEVEL */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visitantes Únicos</span>
              <div className="text-xl font-black text-slate-900">{metrics.visitors || 0}</div>
              <p className="text-[10px] text-slate-400">Sessões reais</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cadastros</span>
              <div className="text-xl font-black text-slate-900">{metrics.users || 0}</div>
              <p className="text-[10px] text-slate-400">{metrics.sellers || 0} vend / {metrics.buyers || 0} comp</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lojas Ativas</span>
              <div className="text-xl font-black text-slate-900">{metrics.stores || 0}</div>
              <p className="text-[10px] text-slate-400">Vitrines no ar</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Afiliados Ativos</span>
              <div className="text-xl font-black text-emerald-600">{metrics.affiliates || 0}</div>
              <p className="text-[10px] text-slate-400">{metrics.affiliateClicks || 0} cliques</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendas Afiliados</span>
              <div className="text-xl font-black text-slate-900">{metrics.paidOrders || 0}</div>
              <p className="text-[10px] text-slate-400">Pedidos pagos</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Comissões Pagas</span>
              <div className="text-xl font-black text-emerald-600">
                {formatBRL(metrics.affiliateCommissionsPaidCents)}
              </div>
              <p className="text-[10px] text-slate-400">Via PIX direto</p>
            </div>
          </div>

          {/* FUNIL REAL */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                <span>Funil de Conversão e Crescimento da Rede</span>
              </h3>
              <p className="text-xs text-slate-500">
                Cada etapa reflete o estado exato dos dados do banco sem extrapolações.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {funnel.map((step: any, idx: number) => {
                const maxVal = Math.max(funnel[0]?.count || 1, 1);
                const percent = Math.min(100, Math.round(((step.count || 0) / maxVal) * 100));

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{step.step}</span>
                        <span className="text-[11px] text-slate-400">({step.desc})</span>
                      </div>
                      <span className="font-black text-slate-900">{step.count}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percent, step.count > 0 ? 3 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB AFILIADOS */}
      {activeSubTab === 'AFFILIATES' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Afiliados e Desempenho</h3>
              <p className="text-xs text-slate-500">
                Membros da rede com links ativos e histórico financeiro.
              </p>
            </div>
            <div className="text-xs font-bold text-slate-600">
              Total: {topAffiliates.length}
            </div>
          </div>

          {topAffiliates.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              Nenhum afiliado cadastrado ainda. A página <code>/divulgar</code> está pronta para cadastros!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Código</th>
                    <th className="py-2.5 px-3">Usuário</th>
                    <th className="py-2.5 px-3">Cliques</th>
                    <th className="py-2.5 px-3">Vendas</th>
                    <th className="py-2.5 px-3">GMV Gerado</th>
                    <th className="py-2.5 px-3">Comissão Pendente</th>
                    <th className="py-2.5 px-3">Comissão Disponível</th>
                    <th className="py-2.5 px-3">Comissão Paga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topAffiliates.map((aff: any) => (
                    <tr key={aff.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{aff.affiliateCode}</td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{aff.userName || 'Sem nome'}</div>
                        <div className="text-[10px] text-slate-400">{aff.userEmail}</div>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-700">{aff.totalClicks || 0}</td>
                      <td className="py-2.5 px-3 font-bold text-indigo-600">{aff.totalOrders || 0}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{formatBRL(aff.totalSalesCents)}</td>
                      <td className="py-2.5 px-3 text-amber-600">{formatBRL(aff.pendingCommissionCents)}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-600">{formatBRL(aff.availableCommissionCents)}</td>
                      <td className="py-2.5 px-3 text-slate-500">{formatBRL(aff.paidCommissionCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB LISTA DE ESPERA / LEADS */}
      {activeSubTab === 'WAITLIST' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Lista de Espera & Contatos "Quero Ser Avisado"
              </h3>
              <p className="text-xs text-slate-500">
                Leads capturados através dos modais e botões de notificação do HUB e Marketplace.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                {waitlistCounts.sellers || 0} Lojistas
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold">
                {waitlistCounts.affiliates || 0} Afiliados
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
                {waitlistCounts.buyers || 0} Compradores
              </span>
            </div>
          </div>

          {leads.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              Nenhum contato na lista de espera no momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Segmento</th>
                    <th className="py-2.5 px-3">E-mail</th>
                    <th className="py-2.5 px-3">Nome / WhatsApp</th>
                    <th className="py-2.5 px-3">Interesse / Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead: any) => (
                    <tr key={lead.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-slate-500">
                        {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lead.segment === 'SELLER'
                              ? 'bg-amber-100 text-amber-800'
                              : lead.segment === 'AFFILIATE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {lead.segment}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{lead.email}</td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-900">{lead.name || '—'}</div>
                        <div className="text-[10px] text-slate-400">{lead.phone || '—'}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                        {lead.categoryInterest || lead.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB PROSPECTS */}
      {activeSubTab === 'PROSPECTS' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Prospecção Ativa de Lojistas (/seja-vendedor)
            </h3>
            <p className="text-xs text-slate-500">
              Contatos de lojistas interessados em migrar catálogo de Instagram e WhatsApp para o VEND+.
            </p>
          </div>

          {prospects.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              Nenhum lojista em prospecção ainda. Divulgue <code>/seja-vendedor</code>!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Loja</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Canal / Social</th>
                    <th className="py-2.5 px-3">Contato</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prospects.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{p.businessName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.category || 'Geral'}</td>
                      <td className="py-2.5 px-3 font-mono text-indigo-600">{p.publicChannel || '—'}</td>
                      <td className="py-2.5 px-3">
                        <div className="text-slate-900">{p.contactName || p.phone}</div>
                        <div className="text-[10px] text-slate-400">{p.email}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 7. TAB CAMPANHAS */}
      {activeSubTab === 'CAMPAIGNS' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Campanhas Oficiais de Crescimento</h3>
              <p className="text-xs text-slate-500">
                Iniciativas de atração exibidas no VEND+ HUB e nas comunicações da plataforma.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {campaigns.map((camp) => (
              <div key={camp.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase">
                  {camp.targetAudience}
                </span>
                <h4 className="text-sm font-bold text-slate-900">{camp.name}</h4>
                <p className="text-xs text-slate-500">{camp.benefitValue}</p>
                <div className="pt-2 text-[10px] text-slate-400 font-mono">
                  Slug: {camp.slug}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
