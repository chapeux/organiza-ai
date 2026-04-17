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
  deadline?: string;     // Novo campo
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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setDemands([]);
        setLoading(false);
        return;
      }

       let query = supabase
        .from('demands_with_email') // Usando a view para ter o email
        .select('*')
        .order('created_at', { ascending: false });

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
        .select('demand_id, is_completed, label');

      const enriched: Demand[] = (demandsData || []).map(d => {
        const prog = progressData?.find((p: any) => p.demand_id === d.id);
        const stepsForDemand = stepsData?.filter((s: any) => s.demand_id === d.id) || [];
        
        // Calculate progress based on steps completion
        let calculatedProgress = 0;
        if (stepsForDemand.length > 0) {
            const completed = stepsForDemand.filter(s => s.is_completed).length;
            calculatedProgress = Math.round((completed / stepsForDemand.length) * 100);
        } else {
            // If completed manually (no steps), show 100%
            if (d.status === 'concluido') {
                calculatedProgress = 100;
            } else {
                calculatedProgress = prog ? prog.percentage : 0;
            }
        }

        // Fetch current step label separately efficiently (for display)
        const currentStep = stepsData?.find((s: any) => s.demand_id === d.id && !s.is_completed);

        return {
          ...d,
          creator_email: d.creator_email || 'N/A',
          progress: calculatedProgress,
          has_steps: stepsForDemand.length > 0,
          currentStep: currentStep ? { label: currentStep.label, estimated_date: '' } : undefined
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
