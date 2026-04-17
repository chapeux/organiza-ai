import React from 'react';
import { useDemands } from '../hooks/useDemands';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, Calendar, Timer, MoreVertical, Paperclip, Terminal, RefreshCw } from 'lucide-react';

export default function TasksView() {
  const { demands, loading } = useDemands('task');

  const prioridadeAlta = demands.filter(t => t.priority === 'alta' || t.priority === 'critica');
  const prioridadeMedia = demands.filter(t => t.priority === 'media');
  const prioridadeBaixa = demands.filter(t => t.priority === 'baixa');

  const pending = demands.filter(t => t.status !== 'concluido').length;
  const completed = demands.filter(t => t.status === 'concluido').length;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full pb-24">
      {/* Greeting & Stats Asymmetric Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-12">
        <div className="lg:col-span-8">
          <h2 className="text-4xl font-extrabold font-headline text-primary tracking-tight mb-2">Painel de Operações</h2>
          <p className="text-on-surface-variant text-lg">Organize suas demandas técnicas e otimize o fluxo industrial.</p>
        </div>
        <div className="lg:col-span-4 flex justify-start lg:justify-end gap-4">
          <div className="bg-surface-container-low p-4 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-container flex items-center justify-center rounded-lg text-on-primary-container">
              <span className="material-symbols-outlined">task_alt</span>
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Produtividade</p>
              <p className="text-xl font-bold text-primary">{demands.length > 0 ? Math.round((completed / demands.length) * 100) : 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout for Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Priority: High Section */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between px-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
              <h3 className="font-headline font-bold text-lg text-primary">Prioridade Alta</h3>
            </div>
            <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">{prioridadeAlta.length < 10 ? `0${prioridadeAlta.length}` : prioridadeAlta.length}</span>
          </div>

          {loading ? (
             <div className="h-32 bg-slate-100 animate-pulse rounded-xl w-full"></div>
          ) : prioridadeAlta.length === 0 ? (
             <p className="text-sm text-slate-500">Nenhuma tarefa de alta prioridade.</p>
          ) : prioridadeAlta.map(task => (
            <div key={task.id} className={`group bg-surface-container-lowest p-5 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all duration-200 ${task.priority === 'critica' ? 'border-red-600' : 'border-orange-500'}`}>
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter ${task.status === 'concluido' ? 'bg-primary-fixed text-on-primary-fixed-variant' : (task.priority === 'critica' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700')}`}>
                  {task.status === 'concluido' ? 'Concluído' : task.priority.toUpperCase()}
                </span>
                <button className="text-slate-300 hover:text-primary transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-xl">more_vert</span>
                </button>
              </div>
              <h4 className={`font-bold mb-2 leading-tight ${task.status === 'concluido' ? 'text-outline line-through' : 'text-on-surface'}`}>{task.title}</h4>
              <p className="text-sm text-on-surface-variant mb-4 line-clamp-2">{task.description || 'Sem descrição.'}</p>
              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-1 text-on-surface-variant text-xs">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span>{format(new Date(task.created_at), "dd MMM, HH:mm", { locale: ptBR })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Priority: Medium Section */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between px-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
              <h3 className="font-headline font-bold text-lg text-primary">Prioridade Média</h3>
            </div>
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{prioridadeMedia.length < 10 ? `0${prioridadeMedia.length}` : prioridadeMedia.length}</span>
          </div>

          {loading ? (
             <div className="h-32 bg-slate-100 animate-pulse rounded-xl w-full"></div>
          ) : prioridadeMedia.length === 0 ? (
             <p className="text-sm text-slate-500">Nenhuma tarefa média.</p>
          ) : prioridadeMedia.map(task => (
            <div key={task.id} className={`group bg-surface-container-lowest p-5 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all duration-200 ${task.status === 'concluido' ? 'border-primary' : 'border-blue-500'}`}>
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-tighter ${task.status === 'concluido' ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-blue-100 text-blue-700'}`}>
                  {task.status === 'concluido' ? 'Concluído' : 'MÉDIA'}
                </span>
                <button className="text-slate-300 hover:text-primary transition-colors cursor-pointer">
                  {task.status === 'concluido' ? (
                    <span className="material-symbols-outlined text-xl" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
                  ) : (
                    <span className="material-symbols-outlined text-xl">more_vert</span>
                  )}
                </button>
              </div>
              <h4 className={`font-bold mb-2 leading-tight ${task.status === 'concluido' ? 'text-on-surface line-through opacity-60' : 'text-on-surface'}`}>{task.title}</h4>
              <p className={`text-sm text-on-surface-variant mb-4 line-clamp-2 ${task.status === 'concluido' ? 'opacity-60' : ''}`}>{task.description || 'Sem descrição.'}</p>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-1 text-on-surface-variant text-xs">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span>{format(new Date(task.created_at), "dd MMM", { locale: ptBR })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary & Status Card */}
        <div className="lg:col-span-1">
          <div className="bg-primary text-on-primary p-6 rounded-2xl shadow-xl relative overflow-hidden h-fit mb-6">
            <div className="relative z-10">
              <h3 className="font-headline font-bold text-xl mb-6">Status da Semana</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-widest opacity-80">
                    <span>Metas Atingidas</span>
                    <span>{demands.length > 0 ? Math.round((completed / demands.length) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-white/20 h-1.5 rounded-full">
                    <div className="bg-white h-full rounded-full" style={{ width: `${demands.length > 0 ? Math.round((completed / demands.length) * 100) : 0}%` }}></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md">
                    <p className="text-2xl font-black font-headline">{(demands.length < 10 && demands.length > 0) ? `0${demands.length}` : (demands.length || '00')}</p>
                    <p className="text-[10px] font-bold uppercase opacity-70">Demandas</p>
                  </div>
                  <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md">
                    <p className="text-2xl font-black font-headline">{demands.filter(d => d.priority === 'critica').length < 10 ? `0${demands.filter(d => d.priority === 'critica').length}` : demands.filter(d => d.priority === 'critica').length}</p>
                    <p className="text-[10px] font-bold uppercase opacity-70">Críticas</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          </div>

          {/* Small Priority Low Task */}
          <div className="flex items-center justify-between px-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-6 bg-slate-400 rounded-full"></div>
              <h3 className="font-headline font-bold text-lg text-primary">Prioridade Baixa</h3>
            </div>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{prioridadeBaixa.length < 10 ? `0${prioridadeBaixa.length}` : prioridadeBaixa.length}</span>
          </div>
          
          <div className="space-y-3">
             {loading ? (
                <div className="h-16 bg-slate-100 animate-pulse rounded-xl w-full"></div>
             ) : prioridadeBaixa.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma tarefa baixa prioridade.</p>
             ) : prioridadeBaixa.map(task => (
                <div key={task.id} className={`bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 flex items-center gap-4 transition-all hover:bg-surface-bright cursor-pointer ${task.status === 'concluido' ? 'opacity-70' : ''}`}>
                  <div className="flex-shrink-0">
                    <button className={`w-6 h-6 rounded-md border-2 ${task.status === 'concluido' ? 'border-primary bg-primary' : 'border-outline-variant'} flex items-center justify-center hover:border-primary transition-colors`}>
                      <span className={`material-symbols-outlined text-sm ${task.status === 'concluido' ? 'text-white' : 'opacity-0 hover:opacity-100 text-primary'}`}>check</span>
                    </button>
                  </div>
                  <div className="flex-1">
                    <h5 className={`text-sm font-bold ${task.status === 'concluido' ? 'text-outline line-through' : 'text-on-surface'}`}>{task.title}</h5>
                    <p className="text-[11px] text-on-surface-variant truncate w-40">{task.description}</p>
                  </div>
                </div>
             ))}
          </div>

        </div>

      </div>
    </div>
  );
}
