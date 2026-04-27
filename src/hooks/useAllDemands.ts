import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Demand } from './useDemands';

export function useAllDemands() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDemands = async () => {
    setLoading(true);
    try {
      // Fetch ALL demands
      const { data: demandsData, error } = await supabase
        .from('demands_with_email')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error in useAllDemands fetch:', error);
        throw error;
      }

      // Fetch progress and steps
      const { data: progressData, error: progressError } = await supabase.from('demand_progress').select('*');
      if (progressError) console.warn('Progress fetch error:', progressError);
      
      const { data: stepsData, error: stepsError } = await supabase
        .from('workflow_steps')
        .select('demand_id, is_completed, label, estimated_date, completed_at')
        .order('order_index', { ascending: false });
      if (stepsError) console.warn('Steps fetch error:', stepsError);

      const enriched: Demand[] = (demandsData || []).map(d => {
        const prog = progressData?.find((p: any) => p.demand_id === d.id);
        const stepsForDemand = (stepsData?.filter((s: any) => s.demand_id === d.id) || []) as any[];
        
        let calculatedProgress = 0;
        let lastCompletedDate: Date | null = null;
        
        if (stepsForDemand.length > 0) {
            const completed = stepsForDemand.filter(s => s.is_completed);
            calculatedProgress = Math.round((completed.length / stepsForDemand.length) * 100);
            
            completed.forEach(s => {
                if (s.completed_at) {
                    const d = new Date(s.completed_at);
                    if (!lastCompletedDate || d > lastCompletedDate) lastCompletedDate = d;
                }
            });
        } else {
            if (d.status === 'concluido' || d.status === 'concluído') {
                calculatedProgress = 100;
                lastCompletedDate = d.updated_at ? new Date(d.updated_at) : new Date(); // fallback
            } else {
                calculatedProgress = prog ? prog.percentage : 0;
            }
        }

        const currentStep = stepsForDemand.find((s: any) => !s.is_completed);

        // Define prazo: prioriza o campo manual, senão usa a última etapa do workflow
        let deadlineDisplay = 'Sem prazo definido';
        if (d.deadline) {
          deadlineDisplay = new Date(d.deadline).toLocaleDateString('pt-BR');
        } else if (stepsForDemand.length > 0) {
          // Última etapa (ordem decrescente)
          const lastStep = stepsForDemand[0];
          deadlineDisplay = lastStep.estimated_date 
            ? new Date(lastStep.estimated_date).toLocaleDateString('pt-BR') 
            : 'Sem data definida';
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
      console.error('Error fetching all demands', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemands();
  }, []);

  return { demands, loading, refresh: loadDemands };
}
