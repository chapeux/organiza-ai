import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, MoreVertical, Calendar, Download, Table, 
  FileText, Mail, Activity, AlertCircle, RefreshCw, Filter, ShieldCheck, Cpu 
} from 'lucide-react';
import { useDemands } from '../hooks/useDemands';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProjectView() {
  const { demands, loading } = useDemands('project');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Auto-select the first project when loaded
  useEffect(() => {
    if (!loading && demands.length > 0 && !selectedProjectId) {
      setSelectedProjectId(demands[0].id);
    }
  }, [loading, demands, selectedProjectId]);

  const activeProject = demands.find(p => p.id === selectedProjectId) || demands[0];

  if (loading) {
    return <div className="p-8">Carregando detalhes do projeto...</div>;
  }

  if (!activeProject) {
    return (
      <div className="p-8 pb-24">
        <h2 className="text-3xl font-extrabold text-primary tracking-tighter mb-4 font-headline">Meus Projetos</h2>
        <p className="text-on-surface-variant mb-6">Nenhum projeto encontrado. Retorne ao painel para criar um projeto.</p>
      </div>
    );
  }

  return (
    <div className="p-8 pb-24">
      {/* Project Selector (if multiple) */}
      {demands.length > 1 && (
        <div className="mb-6 flex items-center gap-4">
          <span className="text-sm font-bold text-on-surface-variant">Selecionar Projeto:</span>
          <select 
            value={activeProject.id} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            {demands.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Project Header & High Level Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10 items-end">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              activeProject.priority === 'critica' ? 'bg-red-100 text-red-700' :
              activeProject.priority === 'alta' ? 'bg-orange-100 text-orange-700' :
              activeProject.priority === 'media' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-600'
            }`}>{activeProject.priority}</span>
            <span className="text-on-surface-variant text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              Iniciado em {format(new Date(activeProject.created_at), "dd MMM, yyyy", { locale: ptBR })}
            </span>
          </div>
          <h2 className="text-4xl font-extrabold text-primary tracking-tighter mb-4 font-headline">{activeProject.title}</h2>
          <p className="text-on-surface-variant max-w-2xl leading-relaxed mb-6">
            {activeProject.description || "Nenhuma descrição fornecida."}
          </p>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10">
          <div className="flex justify-between items-end mb-2">
            <span className="text-sm font-semibold text-primary">Progresso Geral</span>
            <span className="text-2xl font-black text-primary font-headline">{activeProject.progress || 0}%</span>
          </div>
          <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-primary-container" style={{ width: `${activeProject.progress || 0}%` }}></div>
          </div>
          <div className="flex justify-between mt-4 text-xs text-on-surface-variant font-medium">
            <span>Status: {activeProject.status.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      {/* Workflow Visualizer (Asymmetric/Modern Layout) */}
      <div className="mb-12">
        <h3 className="text-sm font-bold text-outline uppercase tracking-widest mb-6 font-headline">Workflow do Projeto</h3>
        {activeProject.workflow_steps && activeProject.workflow_steps.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
             {activeProject.workflow_steps.map((step: any, index: number) => {
               const isCompleted = step.status === 'concluido';
               const isActive = step.status === 'em_andamento';
               const isPending = step.status === 'pendente';

               if (isCompleted) {
                 return (
                    <div key={step.id} className="min-w-[200px] flex-1">
                      <div className="h-1 w-full bg-primary mb-3 rounded-full opacity-100"></div>
                      <div className="bg-primary-fixed p-4 rounded-xl relative group">
                        <span className="material-symbols-outlined text-on-primary-fixed-variant absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-sm border border-primary-fixed">check_circle</span>
                        <p className="text-xs font-bold text-on-primary-fixed-variant opacity-70 uppercase mb-1">Etapa {index + 1}</p>
                        <p className="font-bold text-on-primary-fixed-variant">{step.name}</p>
                      </div>
                    </div>
                 );
               } else if (isActive) {
                 return (
                    <div key={step.id} className="min-w-[240px] flex-[1.5]">
                      <div className="h-1 w-full bg-surface-container-highest mb-3 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-1/2"></div>
                      </div>
                      <div className="bg-surface-container-lowest border-2 border-primary p-5 rounded-xl shadow-md ring-4 ring-primary/5">
                        <p className="text-xs font-bold text-primary uppercase mb-1">Em Andamento</p>
                        <p className="font-black text-primary text-lg font-headline">{step.name}</p>
                        <p className="text-xs text-on-surface-variant mt-2">Duração estimada: {step.estimated_duration_hours || '?'}h</p>
                      </div>
                    </div>
                 );
               } else {
                 return (
                    <div key={step.id} className="min-w-[200px] flex-1">
                      <div className="h-1 w-full bg-surface-container-highest mb-3 rounded-full opacity-50"></div>
                      <div className="bg-surface-container-low p-4 rounded-xl border border-dashed border-outline-variant">
                        <p className="text-xs font-bold text-outline uppercase mb-1">Etapa {index + 1}</p>
                        <p className="font-bold text-on-surface-variant">{step.name}</p>
                      </div>
                    </div>
                 );
               }
             })}
          </div>
        ) : (
          <div className="text-sm text-slate-500 italic pb-8">Este projeto ainda não possui etapas em seu workflow.</div>
        )}
      </div>

      {/* Main Content Bento Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Task List Column */}
        <div className="xl:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-primary font-headline">Subtarefas / Etapas Relacionadas</h3>
            <button className="text-primary font-bold text-sm flex items-center gap-2 hover:underline">
              <span className="material-symbols-outlined text-lg">filter_list</span> Filtrar
            </button>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Atividade</th>
                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Responsável</th>
                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Duração Est.</th>
                    <th className="px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {activeProject.workflow_steps && activeProject.workflow_steps.length > 0 ? (
                    activeProject.workflow_steps.map((step: any) => (
                      <tr key={step.id} className="hover:bg-surface-bright transition-colors">
                        <td className="px-6 py-5">
                          <p className="font-semibold text-on-surface">{step.name}</p>
                          {step.description && <p className="text-xs text-on-surface-variant mt-0.5 max-w-[250px] truncate">{step.description}</p>}
                        </td>
                        <td className="px-6 py-5">
                           <div className="flex items-center gap-2">
                             <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-primary">EU</div>
                             <span className="text-sm font-medium">Você</span>
                           </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-sm text-on-surface-variant">{step.estimated_duration_hours ? `${step.estimated_duration_hours}h` : '-'}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            step.status === 'concluido' ? 'bg-primary-fixed text-on-primary-fixed-variant' :
                            step.status === 'em_andamento' ? 'bg-secondary-container text-on-secondary-container' :
                            'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                          }`}>
                            {step.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-5 text-center text-sm text-slate-500">Sem atividades registradas</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {activeProject.workflow_steps && activeProject.workflow_steps.length > 0 && (
              <div className="p-4 bg-surface-container-low text-center">
                <button className="text-primary font-bold text-sm hover:underline">Ver todas as etapas</button>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar / Info Column */}
        <div className="space-y-8">
          {/* Team Section */}
          <div className="bg-surface-container-low p-6 rounded-2xl">
            <h4 className="text-sm font-bold text-primary uppercase tracking-widest mb-4 font-headline">Equipe Alocada</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">L</div>
                  <div>
                    <p className="text-sm font-bold">Líder do Projeto</p>
                    <p className="text-[10px] text-on-surface-variant">Proprietário</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline text-lg">mail</span>
              </div>
              <button className="w-full py-2 border border-outline-variant border-dashed rounded-lg text-xs font-bold text-outline hover:bg-white hover:text-primary transition-all">
                + Adicionar Membro
              </button>
            </div>
          </div>

          {/* Resources/Files Card */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10">
            <h4 className="text-sm font-bold text-primary uppercase tracking-widest mb-4 font-headline">Documentação Técnica</h4>
            <div className="space-y-3">
              <span className="text-sm font-medium text-slate-500">Nenhum documento anexado.</span>
            </div>
          </div>

          {/* Rapid Insights */}
          <div className="bg-gradient-to-br from-primary to-primary-container p-6 rounded-2xl text-white">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-yellow-400">tips_and_updates</span>
              <span className="text-xs font-bold uppercase tracking-wider">Insight do Projeto</span>
            </div>
            <p className="text-sm leading-relaxed font-medium">
              A inteligência artificial ainda não gerou insights específicos para o andamento deste projeto. Adicione mais dados e etapas para receber dicas semanais.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
