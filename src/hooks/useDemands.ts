import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type Demand = {
  id: string;
  title: string;
  type: 'task' | 'project' | 'ticket';
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  status: string;
  ticket_code?: string;
  progress?: number;
  currentStep?: { label: string; estimated_date: string };
  created_at: string;
  description?: string;
  has_steps: boolean;
  user_id?: string;
  creator_email?: string; // Novo campo
  deadline?: string;     // Prazo manual (ISO)
  deadline_display?: string; // Prazo formatado para exibição
  location?: string;     // Novo campo Local
  network_path?: string; // Link ou Caminho de Rede
  is_public?: boolean;
  completedDate?: string; // Data de conclusão
};

export function useDemands(typeFilter?: 'task' | 'project' | 'ticket') {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);

  const hasSupabase = !!import.meta.env.VITE_SUPABASE_URL;

  const loadDemands = async () => {
    if (!hasSupabase) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (!user) {
        setDemands([]);
        setLoading(false);
        return;
      }

       const userEmail = user.email;

       // Passo 1: Descobrir em quais demandas eu fui adicionado como equipe
       let teamDemandIds: string[] = [];
       if (userEmail) {
         const { data: teamMembers } = await supabase
           .from('demand_team_members')
           .select('demand_id')
           .eq('user_email', userEmail);
         if (teamMembers) {
           teamDemandIds = teamMembers.map(tm => tm.demand_id);
         }
       }

       // Passo 2: Buscar demandas onde sou dono OU estou na equipe
       let query = supabase
        .from('demands_with_email')
        .select('*');

       if (teamDemandIds.length > 0) {
         // Filtra dono OU id in teamDemandIds
         query = query.or(`user_id.eq.${user.id},id.in.(${teamDemandIds.join(',')})`);
       } else {
         query = query.eq('user_id', user.id);
       }

       query = query.order('created_at', { ascending: false });

      if (typeFilter) {
        query = query.eq('type', typeFilter);
      }

      const { data: demandsData, error } = await query;

      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }

      // Fetch progress and steps
      const { data: progressData } = await supabase.from('demand_progress').select('*');
      const { data: stepsData } = await supabase
        .from('workflow_steps')
        .select('demand_id, is_completed, label, estimated_date, completed_at')
        .order('order_index', { ascending: false });

      const enriched: Demand[] = (demandsData || []).map(d => {
        const prog = progressData?.find((p: any) => p.demand_id === d.id);
        const stepsForDemand = (stepsData?.filter((s: any) => s.demand_id === d.id) || []) as any[];
        
        // Calculate progress based on steps completion
        let calculatedProgress = 0;
        let lastCompletedDate: Date | null = null;

        if (stepsForDemand.length > 0) {
            const completed = stepsForDemand.filter(s => s.is_completed);
            calculatedProgress = Math.round((completed.length / stepsForDemand.length) * 100);

            completed.forEach(s => {
                if (s.completed_at) {
                    const date = new Date(s.completed_at);
                    if (!lastCompletedDate || date > lastCompletedDate) lastCompletedDate = date;
                }
            });
        } else {
            // If completed manually (no steps), show 100%
            if (d.status === 'concluido' || d.status === 'concluído') {
                calculatedProgress = 100;
                lastCompletedDate = d.updated_at ? new Date(d.updated_at) : new Date(); // fallback
            } else {
                calculatedProgress = prog ? prog.percentage : 0;
            }
        }

        // Fetch current step label separately efficiently (for display)
        const currentStep = stepsForDemand.find((s: any) => !s.is_completed);

        // Define prazo: prioriza o campo manual, senão usa a última etapa do workflow
        let deadlineDisplay = 'Sem prazo definido';
        if (d.deadline) {
          deadlineDisplay = new Date(d.deadline).toLocaleDateString('pt-BR');
        } else if (stepsForDemand.length > 0) {
          // Última etapa (para pegar o prazo final do projeto/tarefa)
          const lastStep = stepsForDemand[0]; // order_index desc
          if (lastStep.estimated_date) {
            deadlineDisplay = new Date(lastStep.estimated_date).toLocaleDateString('pt-BR');
          }
        }

        return {
          ...d,
          creator_email: d.creator_email || 'N/A',
          deadline: d.deadline,
          deadline_display: deadlineDisplay,
          progress: calculatedProgress,
          has_steps: stepsForDemand.length > 0,
          currentStep: currentStep ? { label: currentStep.label, estimated_date: currentStep.estimated_date || '' } : undefined,
          workflow_steps: stepsForDemand,
          completedDate: lastCompletedDate ? lastCompletedDate.toISOString() : undefined
        };
      });

      setDemands(enriched);
    } catch (err) {
      console.error('Error fetching demands', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemands();
  }, [hasSupabase, typeFilter]);

  return { demands, loading, refresh: loadDemands, hasSupabase };
}
