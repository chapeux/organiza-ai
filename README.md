# Demand Manager & Workflow System

Um sistema para centralizar o gerenciamento de demandas, organizar tickets e estruturar fluxos de trabalho. O foco do projeto é dar visibilidade ao progresso da equipe e garantir o cumprimento de prazos através de uma interface funcional e atualizações em tempo real.

---

## 🛠️ O que o sistema faz

### Gestão de Demandas e Projetos
* **Fluxos Distintos:** Separação entre tarefas simples (tickets) e projetos estruturados com múltiplas etapas.
* **Controle de Prazos:** Definição manual de datas globais ou cálculo automático baseado na duração das etapas do workflow.
* **Priorização:** Classificação de criticidade (Baixa a Crítica) com indicadores visuais para facilitar a triagem.
* **Contexto e Localização:** Campos dedicados para caminhos de rede, links externos e unidades específicas.

### Workflow Dinâmico
* **Organizador Visual:** Reordenação de etapas via Drag-and-Drop (arrastar e soltar).
* **Progresso Automático:** Cálculo da porcentagem de conclusão conforme as etapas são finalizadas.
* **Rastreabilidade:** Registro automático de data e hora para cada ação concluída no fluxo.

### Dashboards e Relatórios
* **Visões Customizadas:** Painel focado para o usuário (prazos iminentes) e visão administrativa para gestores (supervisão total).
* **Status de Tempo:** Alertas visuais coloridos para demandas Atrasadas, No Prazo ou Próximas do Fim.
* **Exportação em PDF:** Geração de relatórios organizados com links clicáveis diretamente no documento.

---

## 💻 Tecnologias Utilizadas

* **Frontend:** React + Vite + TypeScript.
* **Estilização:** Tailwind CSS (Baseado em Material Design 3).
* **Backend & Realtime:** Supabase (PostgreSQL) com integração em tempo real.
* **Animações:** Framer Motion.
* **Ícones:** Phosphor Icons, Hugeicons e Lucide.
* **Utilitários:** `date-fns` (datas) e `jsPDF` (relatórios).

---

## 🗄️ Estrutura do Banco de Dados (Supabase)

O sistema utiliza as seguintes tabelas principais:
- `demands`: Dados mestre das solicitações.
- `workflow_steps`: Etapas e progresso individual de cada projeto.
- `demand_teams`: Gestão de visibilidade para demandas privadas.

> **Nota:** O arquivo `supabase_schema.sql` na raiz contém o script necessário para replicar o ambiente no SQL Editor do Supabase.

---

## ⚙️ Configuração e Instalação

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/seu-usuario/seu-repositorio.git](https://github.com/seu-usuario/seu-repositorio.git)
