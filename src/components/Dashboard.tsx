import React, { useState, useEffect } from 'react';
import { Briefcase, Ticket, CheckCircle, Plus, Sparkles, LayoutDashboard, ListTodo } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import CreateDemandModal from './CreateDemandModal';

type Demand = {
  id: string;
  title: string;
  type: 'task' | 'project' | 'ticket';
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  status: string;
  ticket_code?: string;
  progress?: number;
  currentStep?: { label: string; estimated_date: string };
};

export default function Dashboard() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSpeedDialOpen, setSpeedDialOpen] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<'task' | 'project' | 'ticket'>('task');
  
  const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL;

  useEffect(() => {
    if (hasSupabase) {
      loadDemands();
    } else {
      setLoading(false);
    }
  }, [hasSupabase]);

  const loadDemands = async () => {
    setLoading(true);
    try {
      // Fetch demands
      const { data: demandsData, error } = await supabase
        .from('demands')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Supabase Error:", error);
        alert(`Erro de permissão no Supabase: ${error.message}\nVerifique as políticas de RLS.`);
        throw error;
      }

      // Fetch progress and steps
      const { data: progressData } = await supabase.from('demand_progress').select('*');
      const { data: stepsData } = await supabase
        .from('workflow_steps')
        .select('demand_id, label, estimated_date')
        .eq('is_completed', false)
        .order('order_index', { ascending: true });

      const enriched: Demand[] = (demandsData || []).map(d => {
        const prog = progressData?.find((p: any) => p.demand_id === d.id);
        const step = stepsData?.find((s: any) => s.demand_id === d.id);
        
        return {
          ...d,
          progress: prog ? prog.percentage : 0,
          currentStep: step ? { label: step.label, estimated_date: step.estimated_date } : undefined
        };
      });

      setDemands(enriched);
    } catch (err) {
      console.error('Error fetching demands', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = (type: 'task' | 'project' | 'ticket') => {
    setCreateType(type);
    setCreateModalOpen(true);
    setSpeedDialOpen(false);
  };

  if (!hasSupabase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-200">
        <h1 className="text-2xl font-bold mb-4">Banco de Dados Não Configurado</h1>
        <p className="mb-4">Por favor, adicione <code className="bg-slate-800 px-2 py-1 rounded">VITE_SUPABASE_URL</code> e <code className="bg-slate-800 px-2 py-1 rounded">VITE_SUPABASE_ANON_KEY</code> como secrets.</p>
        <p>Você pode pegar as querys necessárias no arquivo <code>supabase_schema.sql</code>.</p>
      </div>
    );
  }

  const avgProgress = (items: Demand[]) => {
    if (items.length === 0) return 0;
    const total = items.reduce((acc, curr) => acc + (curr.progress || 0), 0);
    return Math.round(total / items.length);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-10 rounded-b-[2rem] mb-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">WEG Synergy</h1>
        <p className="text-slate-400 mt-2">Visão Geral Sistêmica</p>
      </header>

      <main className="px-6 max-w-6xl mx-auto space-y-8">
        {/* Bento Grid Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard title="Total de Demandas" count={demands.length} progress={avgProgress(demands)} icon={<ListTodo className="text-indigo-600" size={28}/>} color="bg-indigo-100/50" barColor="bg-indigo-600" />
          <StatCard title="Em Aberto" count={demands.filter(d => d.status === 'aberto').length} progress={avgProgress(demands.filter(d => d.status === 'aberto'))} icon={<CheckCircle className="text-emerald-600" size={28}/>} color="bg-emerald-100/50" barColor="bg-emerald-600" />
        </section>

        {/* Current Pipeline Activity */}
        <section className="bg-white rounded-[2rem] p-8 shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <LayoutDashboard size={20} className="text-slate-500"/> Resumo de Tarefas
            </h2>
          </div>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
            </div>
          ) : demands.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              Nenhuma demanda ativa. Clique no + para criar.
            </div>
          ) : (
            <div className="space-y-4">
              {demands.map((demand: Demand) => (
                <ProjectRow key={demand.id} demand={demand} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FAB - Speed Dial */}
      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {isSpeedDialOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              className="flex flex-col gap-3 items-end mb-2"
            >
              <DialButton icon={<Briefcase size={20}/>} label="Projeto" onClick={() => openCreateModal('project')} color="bg-purple-600" />
              <DialButton icon={<Ticket size={20}/>} label="Chamado" onClick={() => openCreateModal('ticket')} color="bg-orange-600" />
              <DialButton icon={<CheckCircle size={20}/>} label="Tarefa" onClick={() => openCreateModal('task')} color="bg-emerald-600" />
            </motion.div>
          )}
        </AnimatePresence>
        
        <button 
          onClick={() => setSpeedDialOpen(!isSpeedDialOpen)}
          className={cn(
            "p-5 rounded-full shadow-xl text-white transition-all transform hover:scale-105 active:scale-95",
            isSpeedDialOpen ? "bg-slate-800" : "bg-indigo-600 hover:bg-indigo-700"
          )}
        >
          <motion.div animate={{ rotate: isSpeedDialOpen ? 45 : 0 }}>
            <Plus size={28} />
          </motion.div>
        </button>
      </div>

      {isCreateModalOpen && (
        <CreateDemandModal 
          type={createType} 
          onClose={() => setCreateModalOpen(false)} 
          onCreated={() => {
            setCreateModalOpen(false);
            loadDemands();
          }}
        />
      )}
    </div>
  );
}

function StatCard({ title, count, progress, icon, color, barColor }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-[0_2px_20px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-6">
        <div className={cn("p-4 rounded-2xl", color)}>{icon}</div>
        <span className="text-4xl font-bold tracking-tighter text-slate-800">{count}</span>
      </div>
      <div>
        <div className="flex justify-between items-end mb-2">
          <p className="text-slate-500 font-medium">{title}</p>
          <span className="text-sm font-bold text-slate-800">{progress}%</span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn("h-full rounded-full", barColor)}
          />
        </div>
      </div>
    </div>
  );
}

const ProjectRow: React.FC<{ demand: Demand }> = ({ demand }) => {
  const priorityColors = {
    baixa: "bg-slate-100 text-slate-600",
    media: "bg-blue-100 text-blue-700",
    alta: "bg-orange-100 text-orange-700",
    critica: "bg-red-100 text-red-700 border border-red-200"
  };

  return (
    <div className="group flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="font-semibold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{demand.title}</h3>
          
          <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            {demand.type}
          </span>
          {demand.ticket_code && (
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{demand.ticket_code}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider", priorityColors[demand.priority] || priorityColors.baixa)}>
            {demand.priority}
          </span>
          {demand.currentStep ? (
            <span className="text-indigo-600 font-medium bg-indigo-50 px-2.5 py-0.5 rounded-full text-xs">
              Mód: {demand.currentStep.label}
            </span>
          ) : (
            <span className="text-slate-400 font-medium text-xs">Sem etapas pendentes</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-6 w-full md:w-auto">
        <div className="flex-1 md:w-32">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-slate-500 font-medium">Progresso</span>
            <span className="text-xs font-bold text-slate-700">{demand.progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600" style={{ width: `${demand.progress}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DialButton({ icon, label, onClick, color }: any) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 group">
      <span className="bg-white px-3 py-1.5 rounded-lg shadow-md text-sm font-medium text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
        {label}
      </span>
      <div className={cn("p-4 rounded-full text-white shadow-lg transform transition-transform hover:scale-110", color)}>
        {icon}
      </div>
    </button>
  );
}
