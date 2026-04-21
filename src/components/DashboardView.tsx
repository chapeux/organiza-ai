import React, { useState, useEffect } from 'react';
import { useDemands } from '../hooks/useDemands';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import CreateDemandModal from './CreateDemandModal';
import { Users } from 'lucide-react';

export default function DashboardView({ onEditDemand, searchQuery = '', userName }: { onEditDemand?: (demand: any) => void, searchQuery?: string, userName?: string }) {
  const { demands, loading, hasSupabase, refresh } = useDemands();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [typeFilter, setTypeFilter] = useState<'all' | 'project' | 'task' | 'ticket'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const handleEditClick = (demand: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (onEditDemand) {
      onEditDemand(demand);
    }
  };

  const handleCardClick = (demand: any) => {
    if (onEditDemand) {
      onEditDemand(demand);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    console.log('Botão excluir clicado para id:', id);
    e.stopPropagation();
    setOpenMenuId(null);
    // if (!confirm('Tem certeza que deseja excluir esta demanda?')) return;

    try {
      console.log('Tentando excluir demanda:', id);
      
      // Delete child records first
      console.log('Deletando etapas...');
      const { error: stepsError } = await supabase.from('workflow_steps').delete().eq('demand_id', id);
      if (stepsError) console.error('Erro ao deletar etapas:', stepsError);
      else console.log('Etapas deletadas.');
      
      console.log('Deletando demanda...');
      // Delete demand
      const { error: demandError } = await supabase.from('demands').delete().eq('id', id);
      if (demandError) {
          console.error('Erro ao deletar demanda:', demandError);
          alert(`Erro na exclusão da demanda: ${demandError.message}`);
      } else {
          console.log('Demanda excluída com sucesso');
          refresh();
      }
    } catch (err) {
      console.error('Erro inesperado durante a exclusão:', err);
      alert('Erro inesperado ao excluir. Verifique o console.');
    }
  };


  const projects = demands.filter(d => d.type === 'project');
  const tickets = demands.filter(d => d.type === 'ticket');
  const tasks = demands.filter(d => d.type === 'task');

  const avgProgress = (items: any[]) => {
    if (items.length === 0) return 0;
    const total = items.reduce((acc, curr) => acc + (curr.progress || 0), 0);
    return Math.round(total / items.length);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critica': return 'bg-red-600 text-white';
      case 'alta': return 'bg-orange-500 text-white';
      case 'media': return 'bg-blue-500 text-white';
      case 'baixa': default: return 'bg-slate-400 text-white';
    }
  };

  const filteredDemands = demands.filter(d => {
    const matchesStatus = filter === 'open' ? d.status !== 'concluido' : true;
    const matchesType = typeFilter === 'all' ? true : d.type === typeFilter;
    
    const search = searchQuery.toLowerCase().trim();
    const matchesSearch = !search || 
      d.title?.toLowerCase().includes(search) || 
      d.description?.toLowerCase().includes(search) ||
      (d.type === 'ticket' && d.ticket_code?.toLowerCase().includes(search));

    return matchesStatus && matchesType && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 w-full">
      {/* Welcome Section */}
      <section className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-primary tracking-tight mb-1 font-headline">Olá, {userName || 'Arquiteto Industrial'}</h2>
            <p className="text-on-surface-variant font-medium">Aqui está o panorama atual das suas tarefas.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-surface-container px-6 py-3 rounded-2xl text-center border border-outline-variant/20 shadow-sm min-w-[140px]">
              <p className="text-[10px] uppercase tracking-widest font-black text-outline mb-1">Total em Aberto</p>
              <p className="text-3xl font-headline font-black text-primary leading-none">
                {demands.filter(d => d.status !== 'concluido').length}
              </p>
            </div>
            <div className="bg-primary/5 px-6 py-3 rounded-2xl text-center border border-primary/20 shadow-sm min-w-[140px]">
              <p className="text-[10px] uppercase tracking-widest font-black text-primary/70 mb-1">Total Concluídos</p>
              <p className="text-3xl font-headline font-black text-primary leading-none">
                {demands.filter(d => d.status === 'concluido').length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {!hasSupabase && (
        <div className="bg-error-container text-on-error-container p-4 rounded-xl mb-6">
          Banco de dados não configurado. Por favor, adicione suas credenciais do Supabase.
        </div>
      )}

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-20">
        {/* Main Projects Section - Asymmetric Bento */}
        <div className="md:col-span-12 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-xl font-bold tracking-tight text-primary font-headline">Resumo de Projetos e Demandas</h3>
            <div className="flex items-center gap-2">
              <select 
                  value={typeFilter} 
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="text-sm font-semibold text-primary bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/10 cursor-pointer outline-none focus:ring-1 focus:ring-primary/30 h-9"
              >
                  <option value="all">Todos Tipos</option>
                  <option value="project">Projetos</option>
                  <option value="task">Tarefas</option>
                  <option value="ticket">Chamados</option>
              </select>
              <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value as 'open' | 'all')}
                  className="text-sm font-semibold text-primary bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/10 cursor-pointer outline-none focus:ring-1 focus:ring-primary/30 h-9"
              >
                  <option value="open">Em Aberto</option>
                  <option value="all">Ver Todos</option>
              </select>
              <div className="flex items-center bg-surface-container-low rounded-lg p-1 border border-outline-variant/10 h-9">
                  <button 
                      onClick={() => setViewMode('cards')} 
                      className={`p-1 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant'}`}
                  >
                      <span className="material-symbols-outlined text-[18px]">grid_view</span>
                  </button>
                  <button 
                      onClick={() => setViewMode('list')} 
                      className={`p-1 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-variant'}`}
                  >
                      <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                  </button>
              </div>
            </div>
          </div>
          
          {loading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
               {Array.from({ length: 3 }).map((_, i) => (
                 <div key={i} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 animate-pulse space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="h-6 w-24 bg-surface-container-high rounded-full"></div>
                      <div className="h-6 w-6 bg-surface-container-high rounded-full"></div>
                    </div>
                    <div className="h-6 w-3/4 bg-surface-container-high rounded"></div>
                    <div className="h-4 w-1/2 bg-surface-container-low rounded"></div>
                    <div className="mt-4 space-y-2">
                      <div className="h-3 w-full bg-surface-container-high rounded-full"></div>
                    </div>
                 </div>
               ))}
             </div>
          ) : filteredDemands.length === 0 ? (
             <div className="text-on-surface-variant text-sm p-4 text-center">Nenhuma demanda ativa.</div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDemands.map((demand) => (
                <div 
                  key={demand.id} 
                  className={`bg-surface-container-lowest p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-pointer border-b-4 ${
                    demand.type === 'project' ? 'border-primary' : 
                    demand.type === 'task' ? 'border-slate-400' : 
                    'border-purple-500'
                  }`} 
                  onClick={() => handleCardClick(demand)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      {demand.status === 'concluido' ? (
                        <span className="material-symbols-outlined text-green-600 text-lg font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      ) : (
                        <div className={`w-2.5 h-2.5 rounded-full ${demand.priority === 'critica' ? 'bg-red-600' : demand.priority === 'alta' ? 'bg-orange-500' : demand.priority === 'media' ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                      )}
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${demand.status === 'concluido' ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-secondary-container text-on-secondary-container'}`}>
                        {demand.type} • {demand.status || 'Em Andamento'}
                      </div>
                      {currentUserId && demand.user_id && currentUserId !== demand.user_id && (
                        <div title={`Compartilhado por equipe`} className="bg-primary/10 text-primary p-1 rounded-full flex items-center justify-center">
                          <Users size={14} />
                        </div>
                      )}
                    </div>
                    <div className="relative" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === demand.id ? null : demand.id); }}>
                      <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors cursor-pointer">more_vert</span>
                      {openMenuId === demand.id && (
                          <div className="absolute right-0 mt-2 w-32 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 p-1 z-50">
                              <button onClick={(e) => handleEditClick(demand, e)} className="block w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high rounded-lg">Editar</button>
                              <button onClick={(e) => handleDelete(demand.id, e)} className="block w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg">Excluir</button>
                          </div>
                      )}
                    </div>
                  </div>
                  <h4 className="font-bold text-lg mb-1 leading-tight font-headline">{demand.title}</h4>
                  {demand.type === 'project' && (
                    <p className="text-sm text-on-surface-variant mb-6">Etapa: {(demand as any).currentStep?.label || 'Iniciado'}</p>
                  )}
                  {demand.location && (
                    <p className="text-xs font-semibold text-on-surface-variant mb-4 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      {demand.location}
                    </p>
                  )}
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-xs font-bold">
                      <span>Progresso</span>
                      <span className="text-primary">{demand.progress || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full" style={{ width: `${demand.progress || 0}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
               <table className="w-full text-left text-sm">
                   <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant/20 uppercase tracking-wider text-[10px]">
                       <tr>
                           <th className="px-6 py-4">Status / Tipo</th>
                           <th className="px-6 py-4">Tarefa</th>
                           <th className="px-6 py-4">Local</th>
                           <th className="px-6 py-4">Progresso</th>
                           <th className="px-6 py-4 w-12 text-center">Ações</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-outline-variant/10">
                       {filteredDemands.map((demand) => (
                           <tr 
                             key={demand.id} 
                             className="hover:bg-surface-container-low transition-colors cursor-pointer group" 
                             onClick={() => handleCardClick(demand)}
                           >
                               <td className="px-6 py-4">
                                   <div className="flex items-center gap-3">
                                       {demand.status === 'concluido' ? (
                                         <span className="material-symbols-outlined text-green-600 text-lg font-bold">check_circle</span>
                                       ) : (
                                         <div className={`w-2.5 h-2.5 rounded-full ${demand.priority === 'critica' ? 'bg-red-600' : demand.priority === 'alta' ? 'bg-orange-500' : demand.priority === 'media' ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
                                       )}
                                       <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${demand.status === 'concluido' ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-secondary-container text-on-secondary-container'}`}>
                                         {demand.type}
                                       </div>
                                   </div>
                               </td>
                               <td className="px-6 py-4 font-bold text-primary max-w-sm truncate">
                                   <div className="flex items-center gap-2">
                                     {demand.title}
                                     {currentUserId && demand.user_id && currentUserId !== demand.user_id && (
                                        <Users size={14} className="text-primary opacity-70" title="Compartilhado por equipe" />
                                     )}
                                   </div>
                               </td>
                               <td className="px-6 py-4 text-xs font-semibold text-on-surface-variant">
                                   {demand.location || <span className="opacity-40">-</span>}
                               </td>
                               <td className="px-6 py-4">
                                   <div className="flex items-center gap-3">
                                       <div className="w-[120px] h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                                           <div className="bg-primary h-1.5 rounded-full" style={{ width: `${demand.progress || 0}%` }}></div>
                                       </div>
                                       <span className="text-xs font-bold text-primary">{demand.progress || 0}%</span>
                                   </div>
                               </td>
                               <td className="px-6 py-4 text-center relative" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === demand.id ? null : demand.id); }}>
                                   <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors cursor-pointer">more_vert</span>
                                   {openMenuId === demand.id && (
                                       <div className="absolute right-10 top-4 mt-1 w-32 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/10 p-1 z-50 text-left">
                                           <button onClick={(e) => handleEditClick(demand, e)} className="block w-full text-left px-3 py-2 text-sm text-on-surface hover:bg-surface-container-high rounded-lg">Editar</button>
                                           <button onClick={(e) => handleDelete(demand.id, e)} className="block w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg">Excluir</button>
                                       </div>
                                   )}
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
