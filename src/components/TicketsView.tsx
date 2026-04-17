import React from 'react';
import { useDemands } from '../hooks/useDemands';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TicketsView() {
  const { demands, loading } = useDemands('ticket');

  const getPriorityClasses = (priority: string) => {
    switch(priority) {
      case 'critica': return 'bg-red-100 text-red-700';
      case 'alta': return 'bg-orange-100 text-orange-700';
      case 'media': return 'bg-blue-100 text-blue-700';
      case 'baixa': default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStatusClasses = (status: string) => {
    switch(status) {
      case 'em_andamento': return 'bg-secondary-container text-on-secondary-container';
      case 'concluido': return 'bg-primary-fixed text-on-primary-fixed-variant';
      case 'aberto': default: return 'bg-surface-container-high text-on-surface-variant';
    }
  };

  const ativos = demands.filter(t => t.status === 'em_andamento');
  const resolvidos = demands.filter(t => t.status === 'concluido');

  return (
    <div className="p-8 space-y-8 flex-1 pb-24">
      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-primary tracking-tight font-headline">Central de Chamados</h2>
          <p className="text-on-surface-variant font-medium">Gerencie e acompanhe as demandas técnicas da unidade.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary border-2 border-primary-container rounded-xl hover:bg-primary-container/10 transition-colors">
            <span className="material-symbols-outlined text-lg">filter_list</span>
            Filtros Avançados
          </button>
        </div>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_24px_24px_-4px_rgba(0,63,108,0.03)] flex flex-col gap-2">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total de Chamados</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-primary font-headline">{loading ? '...' : demands.length}</span>
            <span className="text-xs text-green-600 font-bold">Total</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_24px_24px_-4px_rgba(0,63,108,0.03)] flex flex-col gap-2">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Em Atendimento</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-secondary font-headline">{loading ? '...' : ativos.length}</span>
            <span className="text-xs text-slate-400 font-medium">Ativos</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_24px_24px_-4px_rgba(0,63,108,0.03)] flex flex-col gap-2">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Resolvidos</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-primary-container font-headline">{loading ? '...' : resolvidos.length}</span>
            <span className="text-xs text-green-600 font-bold">Fechados</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_24px_24px_-4px_rgba(0,63,108,0.03)] flex flex-col gap-2">
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Eficácia</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-tertiary font-headline">{demands.length > 0 ? Math.round((resolvidos.length / demands.length)*100) : 0}%</span>
            <span className="text-xs text-tertiary font-bold">Taxa</span>
          </div>
        </div>
      </div>

      {/* Tickets Table Area */}
      <section className="bg-surface-container-lowest rounded-xl shadow-[0_24px_48px_-12px_rgba(0,63,108,0.08)] overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-low flex justify-between items-center">
          <h3 className="font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">list_alt</span>
            Lista de Tickets
          </h3>
          <div className="flex gap-4">
            <div className="flex bg-white rounded-lg p-1 shadow-sm">
              <button className="px-3 py-1 text-xs font-bold bg-primary text-white rounded-md">Todos</button>
              <button className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-primary">Urgentes</button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Título do Chamado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Data Abertura</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Prioridade</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                 <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      Carregando chamados...
                    </td>
                 </tr>
              ) : demands.length === 0 ? (
                 <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                      Nenhum chamado encontrado.
                    </td>
                 </tr>
              ) : (
                demands.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <span className="font-mono text-xs font-bold text-slate-400">{ticket.ticket_code || `#TK-${ticket.id.substring(0,4)}`}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-primary group-hover:text-primary-container transition-colors line-clamp-1">{ticket.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600 font-medium">{format(new Date(ticket.created_at), "dd MMM, yyyy • HH:mm", { locale: ptBR })}</td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getPriorityClasses(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusClasses(ticket.status)}`}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-surface-container-low border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Exibindo {demands.length} chamados</span>
          <div className="flex gap-2">
            <button className="p-1.5 hover:bg-white rounded border border-slate-200 transition-colors disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="p-1.5 hover:bg-white rounded border border-slate-200 transition-colors disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
