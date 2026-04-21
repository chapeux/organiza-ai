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
CREATE OR REPLACE VIEW demand_progress AS
SELECT 
    demand_id,
    COUNT(*) as total_steps,
    COUNT(*) FILTER (WHERE is_completed = true) as completed_steps,
    ROUND((COUNT(*) FILTER (WHERE is_completed = true)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100) as percentage
FROM workflow_steps
GROUP BY demand_id;

-- 4. View de Demandas com E-mail do Criador (com security invoker para aplicar RLS)
CREATE OR REPLACE VIEW demands_with_email WITH (security_invoker=true) AS
SELECT 
    d.*,
    u.email as creator_email
FROM demands d
LEFT JOIN auth.users u ON d.user_id = u.id;

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_team_members ENABLE ROW LEVEL SECURITY;

-- ==== POLÍTICAS DE ACESSO ====

-- Demandas (Select): Dono, equipes ou demandas públicas
CREATE POLICY "Users can view demands" ON public.demands FOR SELECT USING (
  auth.uid() = user_id 
  OR is_public = true 
  OR auth.jwt() ->> 'email' IN (SELECT user_email FROM demand_team_members WHERE demand_id = id)
);

CREATE POLICY "Users can insert own demands" ON public.demands FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Demandas (Update): Dono ou membros da equipe
CREATE POLICY "Users can update demands" ON public.demands FOR UPDATE USING (
  auth.uid() = user_id
  OR auth.jwt() ->> 'email' IN (SELECT user_email FROM demand_team_members WHERE demand_id = id)
);

CREATE POLICY "Users can delete own demands" ON public.demands FOR DELETE USING (auth.uid() = user_id);

-- Passos de Workflow: Mesmas permissões da demanda pai
CREATE POLICY "Users can view steps" ON public.workflow_steps FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.demands WHERE id = demand_id AND (user_id = auth.uid() OR is_public = true OR auth.jwt() ->> 'email' IN (SELECT user_email FROM demand_team_members WHERE demand_id = public.demands.id)))
);
CREATE POLICY "Users can insert steps" ON public.workflow_steps FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.demands WHERE id = demand_id AND (user_id = auth.uid() OR auth.jwt() ->> 'email' IN (SELECT user_email FROM demand_team_members WHERE demand_id = public.demands.id)))
);
CREATE POLICY "Users can update steps" ON public.workflow_steps FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.demands WHERE id = demand_id AND (user_id = auth.uid() OR auth.jwt() ->> 'email' IN (SELECT user_email FROM demand_team_members WHERE demand_id = public.demands.id)))
);
CREATE POLICY "Users can delete steps" ON public.workflow_steps FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.demands WHERE id = demand_id AND (user_id = auth.uid() OR auth.jwt() ->> 'email' IN (SELECT user_email FROM demand_team_members WHERE demand_id = public.demands.id)))
);

-- Team Members
CREATE POLICY "Ver membros da equipe" ON public.demand_team_members FOR SELECT USING (true);
CREATE POLICY "Modificar membros da equipe (Dono)" ON public.demand_team_members FOR ALL USING (
  EXISTS (SELECT 1 FROM public.demands WHERE id = demand_id AND user_id = auth.uid())
);
