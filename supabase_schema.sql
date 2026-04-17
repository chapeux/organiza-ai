-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela Principal (Demandas/Projetos/Tickets)
CREATE TABLE public.demands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    ticket_code TEXT, -- Ex: #CH-2023-089
    type TEXT CHECK (type IN ('task', 'project', 'ticket')),
    priority TEXT CHECK (priority IN ('baixa', 'media', 'alta', 'critica')),
    status TEXT DEFAULT 'aberto',
    deadline TIMESTAMP WITH TIME ZONE,
    progress INTEGER DEFAULT 0,
    recurrence TEXT DEFAULT 'none',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Workflow (Etapas/Subtarefas)
CREATE TABLE public.workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demand_id UUID REFERENCES public.demands(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    estimated_date DATE,
    is_completed BOOLEAN DEFAULT false,
    order_index INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. View para calcular progresso
CREATE OR REPLACE VIEW demand_progress AS
SELECT 
    demand_id,
    COUNT(*) as total_steps,
    COUNT(*) FILTER (WHERE is_completed = true) as completed_steps,
    ROUND((COUNT(*) FILTER (WHERE is_completed = true)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100) as percentage
FROM workflow_steps
GROUP BY demand_id;

-- Habilitar RLS (Row Level Security) (Opcional, recomendado ativando para produção)
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso básicas (Somente o usuário dono pode ver/editar suas demandas)
CREATE POLICY "Users can view own demands" ON public.demands FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own demands" ON public.demands FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own demands" ON public.demands FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own demands" ON public.demands FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own steps" ON public.workflow_steps FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.demands WHERE id = demand_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own steps" ON public.workflow_steps FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.demands WHERE id = demand_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own steps" ON public.workflow_steps FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.demands WHERE id = demand_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own steps" ON public.workflow_steps FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.demands WHERE id = demand_id AND user_id = auth.uid())
);
