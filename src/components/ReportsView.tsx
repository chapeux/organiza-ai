import React, { useMemo } from 'react';
import { useDemands } from '../hooks/useDemands';
import { useAllDemands } from '../hooks/useAllDemands';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ReportsView({ isGestor = false }: { isGestor?: boolean }) {
  const { demands: myDemands, loading: myLoading } = useDemands();
  const { demands: allDemands, loading: allLoading } = useAllDemands();
  
  const demands = isGestor ? allDemands : myDemands;
  const loading = isGestor ? allLoading : myLoading;

  const statusData = useMemo(() => {
    const counts = {
      aberto: 0,
      'em andamento': 0,
      concluido: 0
    };
    demands.forEach(d => {
      if (d.status === 'aberto') counts.aberto++;
      else if (d.status === 'em andamento' || d.status === 'em-andamento') counts['em andamento']++;
      else if (d.status === 'concluido' || d.status === 'concluído') counts.concluido++;
      else counts.aberto++; // fallback
    });

    return [
      { name: 'Aberto', value: counts.aberto, color: '#f87171' },     // red-400
      { name: 'Em Andamento', value: counts['em andamento'], color: '#fbbf24' }, // amber-400
      { name: 'Concluído', value: counts.concluido, color: '#34d399' }  // emerald-400
    ];
  }, [demands]);

  const priorityData = useMemo(() => {
    const counts = {
      baixa: 0,
      media: 0,
      alta: 0,
      critica: 0
    };
    demands.forEach(d => {
      if (d.priority === 'baixa') counts.baixa++;
      else if (d.priority === 'media') counts.media++;
      else if (d.priority === 'alta') counts.alta++;
      else if (d.priority === 'critica' || d.priority === 'crítica') counts.critica++;
      else counts.baixa++;
    });

    return [
      { name: 'Crítica', value: counts.critica, color: '#ef4444' }, // red-500
      { name: 'Alta', value: counts.alta, color: '#f97316' },    // orange-500
      { name: 'Média', value: counts.media, color: '#3b82f6' },  // blue-500
      { name: 'Baixa', value: counts.baixa, color: '#94a3b8' }   // slate-400
    ];
  }, [demands]);

  const userPerformanceData = useMemo(() => {
    const userStats: Record<string, { total: number, concluidas: number }> = {};
    demands.forEach(d => {
        const email = d.creator_email || 'N/A';
        if (!userStats[email]) userStats[email] = { total: 0, concluidas: 0 };
        userStats[email].total++;
        if (d.status === 'concluido') userStats[email].concluidas++;
    });
    return Object.entries(userStats).map(([email, stats]) => ({
      email,
      ...stats,
      percentual: stats.total > 0 ? Math.round((stats.concluidas / stats.total) * 100) : 0
    }));
  }, [demands]);

  const totals = useMemo(() => {
    return {
      total: demands.length,
      abertas: demands.filter(d => d.status !== 'concluido').length,
      concluidas: demands.filter(d => d.status === 'concluido').length
    };
  }, [demands]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full pb-24 md:pb-8">
      <header className="mb-8">
        <h2 className="text-3xl font-extrabold text-primary tracking-tight mb-2 font-headline">Relatórios e Análises</h2>
        <p className="text-on-surface-variant font-medium">Visão geral do desempenho das tarefas.</p>
      </header>

      {demands.length === 0 ? (
        <div className="bg-surface-container-low p-10 rounded-2xl text-center border border-outline-variant/20">
          <p className="text-on-surface-variant">Nenhuma demanda registrada para gerar relatórios.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Totais (Apenas Gestor) */}
          {isGestor && (
            <div className="md:col-span-2 grid grid-cols-3 gap-4">
              {[
                { title: 'Total', value: totals.total, color: 'text-primary' },
                { title: 'Em Andamento', value: totals.abertas, color: 'text-amber-600' },
                { title: 'Concluídas', value: totals.concluidas, color: 'text-emerald-600' }
              ].map(stat => (
                <div key={stat.title} className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 text-center">
                    <p className="text-[10px] uppercase tracking-widest font-black text-outline mb-2">{stat.title}</p>
                    <p className={`text-4xl font-headline font-black ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Performance por Usuário (Apenas Gestor) */}
          {isGestor && (
            <div className="md:col-span-2 bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10">
              <h3 className="text-lg font-bold text-primary mb-6 font-headline">Produtividade por Usuário</h3>
              <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="email" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" name="Total Demandas" fill="#003f6c" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="concluidas" name="Concluídas" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Status Distribution */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10">
            <h3 className="text-lg font-bold text-primary mb-6 font-headline">Status das Demandas</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Priority Distribution */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10">
            <h3 className="text-lg font-bold text-primary mb-6 font-headline">Distribuição por Prioridade</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
