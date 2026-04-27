import React, { useMemo, useState } from 'react';
import { useDemands, Demand } from '../hooks/useDemands';
import { useAllDemands } from '../hooks/useAllDemands';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Search, CheckSquare, Square } from 'lucide-react';

export default function ReportsView({ isGestor = false }: { isGestor?: boolean }) {
  const { demands: myDemands, loading: myLoading } = useDemands();
  const { demands: allDemands, loading: allLoading } = useAllDemands();
  
  const demands = isGestor ? allDemands : myDemands;
  const loading = isGestor ? allLoading : myLoading;

  // Custom Report Generator State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportTarget, setReportTarget] = useState<'concluidas' | 'andamento' | 'todas'>('concluidas');
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  // Prepare standard dashboard data
  const statusData = useMemo(() => {
    // ... logic remains standard
    const counts = { aberto: 0, 'em andamento': 0, concluido: 0 };
    demands.forEach(d => {
      if (d.status === 'aberto') counts.aberto++;
      else if (d.status === 'em andamento' || d.status === 'em-andamento') counts['em andamento']++;
      else if (d.status === 'concluido' || d.status === 'concluído') counts.concluido++;
      else counts.aberto++;
    });
    return [
      { name: 'Aberto', value: counts.aberto, color: '#f87171' },
      { name: 'Em Andamento', value: counts['em andamento'], color: '#fbbf24' },
      { name: 'Concluído', value: counts.concluido, color: '#34d399' }
    ];
  }, [demands]);

  const priorityData = useMemo(() => {
    const counts = { baixa: 0, media: 0, alta: 0, critica: 0 };
    demands.forEach(d => {
      if (d.priority === 'baixa') counts.baixa++;
      else if (d.priority === 'media') counts.media++;
      else if (d.priority === 'alta') counts.alta++;
      else if (d.priority === 'critica' || d.priority === 'crítica') counts.critica++;
      else counts.baixa++;
    });
    return [
      { name: 'Crítica', value: counts.critica, color: '#ef4444' },
      { name: 'Alta', value: counts.alta, color: '#f97316' },
      { name: 'Média', value: counts.media, color: '#3b82f6' },
      { name: 'Baixa', value: counts.baixa, color: '#94a3b8' }
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

  // Derived filtered data for custom report
  const filteredReportList = useMemo(() => {
    let list = demands;
    if (reportTarget === 'concluidas') {
      list = list.filter(d => d.status === 'concluido');
    } else if (reportTarget === 'andamento') {
      list = list.filter(d => d.status !== 'concluido');
    }

    if (startDate) {
      const start = startOfDay(parseISO(startDate));
      list = list.filter(d => isAfter(parseISO(d.created_at), start) || parseISO(d.created_at).getTime() === start.getTime());
    }

    if (endDate) {
      const end = endOfDay(parseISO(endDate));
      list = list.filter(d => isBefore(parseISO(d.created_at), end) || parseISO(d.created_at).getTime() === end.getTime());
    }

    return list;
  }, [demands, reportTarget, startDate, endDate]);

  const toggleReportItem = (id: string) => {
    const nextIds = new Set(excludedIds);
    if (nextIds.has(id)) nextIds.delete(id);
    else nextIds.add(id);
    setExcludedIds(nextIds);
  };

  const handleGeneratePDF = () => {
    const listToPrint = filteredReportList.filter(d => !excludedIds.has(d.id));
    
    if (listToPrint.length === 0) {
      alert("Nenhuma demanda selecionada para o relatório.");
      return;
    }

    const doc = new jsPDF('landscape');
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(0, 63, 108); // Primary brand color
    doc.text('Relatório de Demandas', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    let subtitle = `Tipo: ${reportTarget === 'concluidas' ? 'Concluídas' : reportTarget === 'andamento' ? 'Em Andamento' : 'Todas'}`;
    if (startDate && endDate) subtitle += ` | Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}`;
    doc.text(subtitle, 14, 30);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 36);

    // Table
    const tableColumn = ["Título", "Data Criação", "Data Conclusão", "Status", "Prioridade", "Local/Unidade", "Link", "Progresso"];
    const tableRows: any[] = [];

    listToPrint.forEach(demand => {
      const demandData = [
        demand.title,
        format(parseISO(demand.created_at), "dd/MM/yyyy"),
        demand.completedDate && demand.status === 'concluido' ? format(parseISO(demand.completedDate), "dd/MM/yyyy") : '-',
        (demand.status || 'Aberto').toUpperCase(),
        demand.priority.toUpperCase(),
        demand.location || '-',
        demand.network_path ? 'LINK' : '-',
        `${demand.progress || 0}%`
      ];
      tableRows.push(demandData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
      headStyles: { fillColor: [0, 63, 108], textColor: 255, halign: 'center' },
      alternateRowStyles: { fillColor: [240, 244, 248] },
      columnStyles: {
        0: { cellWidth: 80 }, // Título
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'center' },
        6: { halign: 'center', textColor: [0, 102, 204], fontStyle: 'bold' }, // Link
        7: { halign: 'center' },
      },
      didDrawCell: (data) => {
        if (data.column.index === 6 && data.cell.section === 'body') {
          const demand = listToPrint[data.row.index];
          if (demand.network_path && data.cell.text[0] === 'LINK') {
            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: demand.network_path });
          }
        }
      }
    });

    doc.save(`Relatorio_Demandas_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };

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

      {demands.length > 0 && (
        <div className="mt-8 bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-primary font-headline">Gerador de Relatórios (PDF)</h3>
              <p className="text-sm text-on-surface-variant mt-1">Selecione os filtros abaixo para escolher quais atividades entrarão no documento.</p>
            </div>
            <button 
              onClick={handleGeneratePDF}
              className="bg-primary hover:bg-primary/90 text-on-primary px-6 py-2.5 rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-all w-full md:w-auto justify-center"
            >
              <FileDown size={18} />
              Exportar para PDF
            </button>
          </div>

          <div className="flex flex-wrap gap-4 items-end bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 mb-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Período De</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Até</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Status das Atividades</label>
              <select 
                value={reportTarget}
                onChange={(e) => setReportTarget(e.target.value as any)}
                className="block w-full bg-surface-container border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-primary focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="concluidas" className="bg-surface-container-lowest">Ocultar Abertas (Apenas Concluídas)</option>
                <option value="andamento" className="bg-surface-container-lowest">Ocultar Concluídas (Apenas em Andamento)</option>
                <option value="todas" className="bg-surface-container-lowest">Mostrar Todas</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h4 className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Pré-visualização do Relatório</h4>
              <span className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded-md">
                {filteredReportList.filter(d => !excludedIds.has(d.id)).length} selecionadas
              </span>
            </div>
            
            <div className="border border-outline-variant/10 rounded-xl overflow-hidden bg-surface-container-lowest max-h-[400px] overflow-y-auto shadow-inner">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container-low text-on-surface-variant font-bold sticky top-0 border-b border-outline-variant/20 tracking-wider text-[11px] uppercase pb-2">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">Incluir</th>
                    <th className="px-4 py-3">Título / Detalhe</th>
                    <th className="px-4 py-3">Criação</th>
                    <th className="px-4 py-3">Link/Rede</th>
                    <th className="px-4 py-3">Conclusão</th>
                    <th className="px-4 py-3">Avanço</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {filteredReportList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant italic">
                        Nenhuma atividade atende aos filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredReportList.map(demand => {
                      const isIncluded = !excludedIds.has(demand.id);
                      return (
                        <tr 
                          key={demand.id} 
                          className={`hover:bg-surface-container-low/30 transition-colors cursor-pointer ${!isIncluded ? 'opacity-40' : ''}`}
                          onClick={() => toggleReportItem(demand.id)}
                        >
                          <td className="px-4 py-3 text-center">
                            <div className={`flex justify-center flex-col items-center select-none ${isIncluded ? 'text-primary' : 'text-outline'}`}>
                              {isIncluded ? <CheckSquare size={18} className="fill-primary/5" /> : <Square size={18} />}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-primary mb-1">{demand.title}</p>
                            <div className="flex items-center gap-2 text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
                              <span className={`px-2 py-0.5 rounded-full ${demand.status === 'concluido' ? 'bg-primary/20 text-primary' : 'bg-secondary-container text-on-secondary-container'}`}>
                                {demand.status || 'Em andamento'}
                              </span>
                              | {(demand.type as string).toUpperCase()}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant font-medium">
                            {format(parseISO(demand.created_at), "dd/MM/yyyy")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-on-surface-variant overflow-hidden max-w-[150px]">
                              {demand.network_path ? (
                                <>
                                  <span className="material-symbols-outlined text-sm shrink-0">link</span>
                                  <span className="text-[10px] truncate" title={demand.network_path}>{demand.network_path}</span>
                                </>
                              ) : (
                                <span className="text-[10px] italic opacity-50">Não informado</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant font-medium">
                            {demand.completedDate && demand.status === 'concluido' ? format(parseISO(demand.completedDate), "dd/MM/yyyy") : '-'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${demand.progress || 0}%` }}></div>
                              </div>
                              <span className="text-xs font-bold text-primary">{demand.progress || 0}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
