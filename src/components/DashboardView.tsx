import React, { useState } from 'react';
import { useDemands } from '../hooks/useDemands';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import CreateDemandModal from './CreateDemandModal';

export default function DashboardView({ onEditDemand, searchQuery = '', userName }: { onEditDemand?: (demand: any) => void, searchQuery?: string, userName?: string }) {
  const { demands, loading, hasSupabase, refresh } = useDemands();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const [typeFilter, setTypeFilter] = useState<'all' | 'project' | 'task' | 'ticket'>('all');

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
            <div className="bg-surface-container-low px-6 py-3 rounded-2xl text-center border border-outline-variant/10 shadow-sm min-w-[140px]">
              <p className="text-[10px] uppercase tracking-widest font-black text-outline mb-1">Total em Aberto</p>
              <p className="text-3xl font-headline font-black text-primary leading-none">
                {demands.filter(d => d.status !== 'concluido').length}
              </p>
            </div>
            <div className="bg-green-50/50 px-6 py-3 rounded-2xl text-center border border-green-100 shadow-sm min-w-[140px]">
              <p className="text-[10px] uppercase tracking-widest font-black text-green-700/70 mb-1">Total Concluídos</p>
              <p className="text-3xl font-headline font-black text-green-600 leading-none">
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
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight text-primary font-headline">Resumo de Projetos e Demandas</h3>
            <div className="flex items-center gap-2">
              <select 
                  value={typeFilter} 
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="text-sm font-semibold text-primary bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/10 cursor-pointer outline-none focus:ring-1 focus:ring-primary/30"
              >
                  <option value="all">Todos Tipos</option>
                  <option value="project">Projetos</option>
                  <option value="task">Tarefas</option>
                  <option value="ticket">Chamados</option>
              </select>
              <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value as 'open' | 'all')}
                  className="text-sm font-semibold text-primary bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/10 cursor-pointer outline-none focus:ring-1 focus:ring-primary/30"
              >
                  <option value="open">Em Aberto</option>
                  <option value="all">Ver Todos</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
               Array.from({ length: 3 }).map((_, i) => (
                 <div key={i} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-slate-100 animate-pulse space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="h-6 w-24 bg-slate-200 rounded-full"></div>
                      <div className="h-6 w-6 bg-slate-200 rounded-full"></div>
                    </div>
                    <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
                    <div className="h-4 w-1/2 bg-slate-100 rounded"></div>
                    <div className="mt-4 space-y-2">
                      <div className="h-3 w-full bg-slate-200 rounded-full"></div>
                    </div>
                 </div>
               ))
            ) : demands.filter(d => {
                const matchesStatus = filter === 'open' ? d.status !== 'concluido' : true;
                const matchesType = typeFilter === 'all' ? true : d.type === typeFilter;
                
                const search = searchQuery.toLowerCase().trim();
                const matchesSearch = !search || 
                  d.title?.toLowerCase().includes(search) || 
                  d.description?.toLowerCase().includes(search) ||
                  (d.type === 'ticket' && d.ticket_code?.toLowerCase().includes(search));

                return matchesStatus && matchesType && matchesSearch;
              }).length === 0 ? (
               <div className="col-span-3 text-slate-500 text-sm p-4 text-center">Nenhuma demanda ativa.</div>
            ) : demands.filter(d => {
                const matchesStatus = filter === 'open' ? d.status !== 'concluido' : true;
                const matchesType = typeFilter === 'all' ? true : d.type === typeFilter;
                
                const search = searchQuery.toLowerCase().trim();
                const matchesSearch = !search || 
                  d.title?.toLowerCase().includes(search) || 
                  d.description?.toLowerCase().includes(search) ||
                  (d.type === 'ticket' && d.ticket_code?.toLowerCase().includes(search));

                return matchesStatus && matchesType && matchesSearch;
              }).map((demand) => (
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
                  </div>
                  <div className="relative" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === demand.id ? null : demand.id); }}>
                    <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors cursor-pointer">more_vert</span>
                    {openMenuId === demand.id && (
                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-lg border border-slate-100 p-1 z-50">
                            <button onClick={(e) => handleEditClick(demand, e)} className="block w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg">Editar</button>
                            <button onClick={(e) => handleDelete(demand.id, e)} className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">Excluir</button>
                        </div>
                    )}
                  </div>
                </div>
                <h4 className="font-bold text-lg mb-1 leading-tight font-headline">{demand.title}</h4>
                {demand.type === 'project' && (
                  <p className="text-sm text-on-surface-variant mb-6">Etapa: {(demand as any).currentStep?.label || 'Iniciado'}</p>
                )}
                {demand.location && (
                  <p className="text-xs font-semibold text-slate-500 mb-4 flex items-center gap-1">
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
        </div>
      </div>
    </div>
  );
}
