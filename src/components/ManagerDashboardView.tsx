import React from 'react';
import { useAllDemands } from '../hooks/useAllDemands';
import { Loader2, Briefcase, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ManagerDashboardView({ onViewDemand }: { onViewDemand: (demand: any) => void }) {
  const { demands, loading } = useAllDemands();
  const [filterTitle, setFilterTitle] = React.useState('');
  const [filterEmail, setFilterEmail] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('todos');

  const filteredDemands = demands.filter(d => {
      const matchTitle = d.title.toLowerCase().includes(filterTitle.toLowerCase());
      const matchEmail = (d.creator_email || '').toLowerCase().includes(filterEmail.toLowerCase());
      const matchStatus = filterStatus === 'todos' ? true : d.status === filterStatus;
      return matchTitle && matchEmail && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 w-full">
      <header className="mb-8">
        <h2 className="text-3xl font-extrabold text-primary tracking-tight font-headline">Painel de Gestão</h2>
        <p className="text-on-surface-variant font-medium mb-6">Acompanhamento das tarefas de todos os usuários.</p>
        
        {/* Filtros */}
        <div className="flex flex-wrap gap-4 items-center bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 shadow-sm">
            <input 
                type="text" 
                placeholder="Filtrar por tarefa..." 
                value={filterTitle}
                onChange={(e) => setFilterTitle(e.target.value)}
                className="px-4 py-2 bg-surface-container rounded-lg border border-outline-variant/30 text-sm w-full md:w-auto text-on-surface focus:ring-1 focus:ring-primary outline-none"
            />
            <input 
                type="text" 
                placeholder="Filtrar por e-mail..." 
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
                className="px-4 py-2 bg-surface-container rounded-lg border border-outline-variant/30 text-sm w-full md:w-auto text-on-surface focus:ring-1 focus:ring-primary outline-none"
            />
            <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-surface-container rounded-lg border border-outline-variant/30 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none"
            >
                <option value="todos" className="bg-surface-container-lowest">Todos Status</option>
                <option value="aberto" className="bg-surface-container-lowest">Aberto</option>
                <option value="em andamento" className="bg-surface-container-lowest">Em Andamento</option>
                <option value="concluido" className="bg-surface-container-lowest">Concluído</option>
            </select>
        </div>
      </header>

      <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant/20 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-6 py-4">Tarefa</th>
              <th className="px-6 py-4">Criado por</th>
              <th className="px-6 py-4">Prazo</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Progresso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {filteredDemands.map((demand) => (
              <tr 
                key={demand.id} 
                className="hover:bg-surface-container-low transition-colors cursor-pointer"
                onClick={() => onViewDemand(demand)}
              >
                <td className="px-6 py-4 font-bold text-primary">{demand.title}</td>
                <td className="px-6 py-4 text-on-surface-variant">{demand.creator_email}</td>
                <td className="px-6 py-4 text-on-surface-variant">{demand.deadline}</td>
                <td className="px-6 py-4 font-medium capitalize">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
                    demand.status === 'concluido' ? 'bg-primary/20 text-primary' :
                    demand.status === 'em andamento' ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container/20 text-error'
                  }`}>
                    {demand.status === 'concluido' ? <CheckCircle2 size={12}/> : <Clock size={12} />}
                    {demand.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-[120px] bg-surface-container-high rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full" 
                        style={{ width: `${demand.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-primary">{demand.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
