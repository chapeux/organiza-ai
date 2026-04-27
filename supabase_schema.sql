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
    location TEXT,
    network_path TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para gerenciar membros da equipe adicionados à demanda
CREATE TABLE public.demand_team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    demand_id UUID REFERENCES public.demands(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(demand_id, user_email)
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
DROP VIEW IF EXISTS public.demand_progress CASCADE;
CREATE OR REPLACE VIEW public.demand_progress AS
SELECT 
    demand_id,
    COUNT(*) as total_steps,
    COUNT(*) FILTER (WHERE is_completed = true) as completed_steps,
    ROUND((COUNT(*) FILTER (WHERE is_completed = true)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100) as percentage
FROM public.workflow_steps
GROUP BY demand_id;

-- 4. View de Demandas com E-mail do Criador
-- Nota: Rodamos sem security_invoker para que a view execute com as permissões
-- do criador (postgres), permitindo o join com auth.users que é restrito.
-- O filtro WHERE interno garante que a privacidade seja respeitada.
DROP VIEW IF EXISTS public.demands_with_email CASCADE;
CREATE OR REPLACE VIEW public.demands_with_email AS
SELECT 
    d.*,
    u.email as creator_email
FROM public.demands d
LEFT JOIN auth.users u ON d.user_id = u.id
WHERE 
    d.user_id = auth.uid() 
    OR d.is_public = true 
    OR EXISTS (
        SELECT 1 FROM public.demand_team_members tm 
        WHERE tm.demand_id = d.id 
        AND tm.user_email = (COALESCE(auth.jwt() ->> 'email', ''))
    );

-- Habilitar RLS (Row Level Security) nas tabelas base
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_team_members ENABLE ROW LEVEL SECURITY;

-- ==== POLÍTICAS DE ACESSO ====
-- Removemos antes de criar para evitar erros de "já existe"

-- Tabela Demands
DROP POLICY IF EXISTS "Users can view demands" ON public.demands;
CREATE POLICY "Users can view demands" ON public.demands FOR SELECT USING (
  auth.uid() = user_id 
  OR is_public = true 
  OR (COALESCE(auth.jwt() ->> 'email', '')) IN (SELECT user_email FROM public.demand_team_members WHERE demand_id = id)
);

DROP POLICY IF EXISTS "Users can insert own demands" ON public.demands;
CREATE POLICY "Users can insert own demands" ON public.demands FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update demands" ON public.demands;
CREATE POLICY "Users can update demands" ON public.demands FOR UPDATE USING (
  auth.uid() = user_id
  OR (COALESCE(auth.jwt() ->> 'email', '')) IN (SELECT user_email FROM public.demand_team_members WHERE demand_id = id)
);

DROP POLICY IF EXISTS "Users can delete own demands" ON public.demands;
CREATE POLICY "Users can delete own demands" ON public.demands FOR DELETE USING (auth.uid() = user_id);

-- Tabela Workflow Steps
DROP POLICY IF EXISTS "Users can view steps" ON public.workflow_steps;
CREATE POLICY "Users can view steps" ON public.workflow_steps FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.demands WHERE id = demand_id AND (user_id = auth.uid() OR is_public = true OR (COALESCE(auth.jwt() ->> 'email', '')) IN (SELECT user_email FROM public.demand_team_members WHERE demand_id = public.demands.id)))
);

DROP POLICY IF EXISTS "Users can insert steps" ON public.workflow_steps;
CREATE POLICY "Users can insert steps" ON public.workflow_steps FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.demands WHERE id = demand_id AND (user_id = auth.uid() OR (COALESCE(auth.jwt() ->> 'email', '')) IN (SELECT user_email FROM public.demand_team_members WHERE demand_id = public.demands.id)))
);

DROP POLICY IF EXISTS "Users can update steps" ON public.workflow_steps;
CREATE POLICY "Users can update steps" ON public.workflow_steps FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.demands WHERE id = demand_id AND (user_id = auth.uid() OR (COALESCE(auth.jwt() ->> 'email', '')) IN (SELECT user_email FROM public.demand_team_members WHERE demand_id = public.demands.id)))
);

DROP POLICY IF EXISTS "Users can delete steps" ON public.workflow_steps;
CREATE POLICY "Users can delete steps" ON public.workflow_steps FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.demands WHERE id = demand_id AND (user_id = auth.uid() OR (COALESCE(auth.jwt() ->> 'email', '')) IN (SELECT user_email FROM public.demand_team_members WHERE demand_id = public.demands.id)))
);

-- Tabela Team Members
DROP POLICY IF EXISTS "Ver membros da equipe" ON public.demand_team_members;
CREATE POLICY "Ver membros da equipe" ON public.demand_team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modificar membros da equipe (Dono)" ON public.demand_team_members;
CREATE POLICY "Modificar membros da equipe (Dono)" ON public.demand_team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.demands WHERE id = demand_id AND user_id = auth.uid())
);
