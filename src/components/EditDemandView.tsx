import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import CommentSection from './CommentSection';

interface EditDemandViewProps {
  key?: React.Key;
  demand: any;
  onBack: () => void;
  readOnly?: boolean;
}

interface WorkflowStep {
  id: string;
  demand_id: string;
  label: string;
  order_index: number;
  is_completed: boolean;
  estimated_date?: string | null;
  completed_at?: string | null;
}

export default function EditDemandView({ demand, onBack, readOnly = false }: EditDemandViewProps) {
  const [title, setTitle] = useState(demand.title || '');
  const [description, setDescription] = useState(demand.description || '');
  const [ticketCode, setTicketCode] = useState(demand.ticket_code || '');
  const [location, setLocation] = useState(demand.location || '');
  const [networkPath, setNetworkPath] = useState(demand.network_path || '');
  const [deadline, setDeadline] = useState(demand.deadline ? format(new Date(demand.deadline), 'yyyy-MM-dd') : '');
  const [recurrence, setRecurrence] = useState(demand.recurrence || 'none');
  const [isPublic, setIsPublic] = useState(demand.is_public || false);
  const [teamEmails, setTeamEmails] = useState('');
  const [manualStatus, setManualStatus] = useState(demand.status || 'aberto');
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSteps();
    fetchTeam();
  }, [demand.id]);

  const fetchTeam = async () => {
    if (!demand.id) return;
    try {
      const { data, error } = await supabase
        .from('demand_team_members')
        .select('user_email')
        .eq('demand_id', demand.id);
      if (!error && data) {
        setTeamEmails(data.map(tm => tm.user_email).join(', '));
      }
    } catch (err) {
      console.log('Error fetching team emails:', err);
    }
  };

  const fetchSteps = async () => {
    if (!demand.id) {
      setSteps([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('demand_id', demand.id)
        .order('order_index', { ascending: true });
        
      if (error) throw error;
      setSteps(data || []);
      // If no steps, sync manualStatus from project
      if (!data || data.length === 0) {
        setManualStatus(demand.status || 'aberto');
      }
    } catch (err) {
      console.error('Error fetching steps:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to find latest date from steps
  const maxStepDate = steps.reduce((max, step) => {
    if (!step.estimated_date) return max;
    const stepDate = new Date(step.estimated_date);
    return !max || stepDate > max ? stepDate : max;
  }, null as Date | null);

  // Helper to find latest date from steps or global deadline
  const finalDeadline = deadline ? new Date(deadline) : (maxStepDate || null);
  const formattedFinalDate = finalDeadline ? format(finalDeadline, 'dd MMM, yyyy', { locale: ptBR }) : 'Não definido';

  const completedStepsCount = steps.filter(s => s.is_completed).length;
  const progressPercentage = steps.length > 0 
    ? Math.round((completedStepsCount / steps.length) * 100) 
    : (manualStatus === 'concluido' ? 100 : 0);

  const derivedStatus = steps.length > 0 
    ? (progressPercentage === 100 ? 'concluido' : (demand.status === 'concluido' ? 'em_andamento' : (demand.status || 'aberto')))
    : manualStatus;

  const handleManualComplete = async () => {
    setSaving(true);
    try {
      const nextStatus = manualStatus === 'concluido' ? 'em_andamento' : 'concluido';
      const nextProgress = nextStatus === 'concluido' ? 100 : 0;
      
      const { error } = await supabase
        .from('demands')
        .update({ 
          status: nextStatus,
          progress: nextProgress
        })
        .eq('id', demand.id);
        
      if (error) throw error;
      setManualStatus(nextStatus);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Error manually completing:', error);
      alert('Erro ao atualizar status');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update demand basic info
      const { error: demandError } = await supabase
        .from('demands')
        .update({
          title,
          description,
          ticket_code: demand.type === 'ticket' ? ticketCode : null,
          location: location || null,
          network_path: networkPath || null,
          is_public: isPublic,
          deadline: deadline || (maxStepDate ? maxStepDate.toISOString() : null),
          status: derivedStatus,
          progress: progressPercentage,
          recurrence
        })
        .eq('id', demand.id);

      if (demandError) throw demandError;

      // Update team members
      await supabase.from('demand_team_members').delete().eq('demand_id', demand.id); // Clear first
      if (teamEmails.trim()) {
        const emails = teamEmails.split(',').map(e => e.trim()).filter(e => e);
        if (emails.length > 0) {
          const teamPayload = emails.map(email => ({
             demand_id: demand.id,
             user_email: email
          }));
          await supabase.from('demand_team_members').insert(teamPayload);
        }
      }

      // Update steps
      // For simplicity, we assume steps are already managed when checked or changed individually 
      // but we could also do batch updates here if needed.

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Erro ao salvar as alterações');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('demands')
        .delete()
        .eq('id', demand.id);
        
      if (error) throw error;
      onBack();
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Erro ao excluir projeto');
      setDeleting(false);
    }
  };

  const handleRenew = async () => {
    setRenewing(true);
    try {
      // 1. Create new demand based on current one
      const nextDeadline = maxStepDate ? new Date(maxStepDate) : new Date();
      if (recurrence === 'mensal') nextDeadline.setMonth(nextDeadline.getMonth() + 1);
      else if (recurrence === 'semanal') nextDeadline.setDate(nextDeadline.getDate() + 7);
      else if (recurrence === 'trimestral') nextDeadline.setMonth(nextDeadline.getMonth() + 3);

      const newDemand = {
        title: title,
        description: description,
        ticket_code: demand.type === 'ticket' ? ticketCode : null,
        type: demand.type,
        priority: demand.priority,
        status: 'aberto',
        user_id: demand.user_id,
        deadline: nextDeadline.toISOString(),
        progress: 0,
        recurrence
      };

      const { data: createdDemand, error: dError } = await supabase
        .from('demands')
        .insert([newDemand])
        .select()
        .single();

      if (dError) throw dError;

      // 2. Clone workflow steps
      const newSteps = steps.map(s => {
        const nextEstDate = s.estimated_date ? new Date(s.estimated_date) : null;
        if (nextEstDate) {
          if (recurrence === 'mensal') nextEstDate.setMonth(nextEstDate.getMonth() + 1);
          else if (recurrence === 'semanal') nextEstDate.setDate(nextEstDate.getDate() + 7);
          else if (recurrence === 'trimestral') nextEstDate.setMonth(nextEstDate.getMonth() + 3);
        }
        
        return {
          demand_id: createdDemand.id,
          label: s.label,
          order_index: s.order_index,
          is_completed: false,
          estimated_date: nextEstDate ? nextEstDate.toISOString() : null
        };
      });

      const { error: sError } = await supabase
        .from('workflow_steps')
        .insert(newSteps);

      if (sError) throw sError;

      alert('Próxima ocorrência gerada com sucesso!');
      onBack();
    } catch (err) {
      console.error('Error renewing:', err);
      alert('Erro ao renovar demanda');
    } finally {
      setRenewing(false);
    }
  };

  const toggleStepCompletion = async (stepId: string, isCompleted: boolean) => {
    // Record completion timestamp
    const completedAt = isCompleted ? new Date().toISOString() : null;

    // Optimistic update
    const nextSteps = steps.map(s => s.id === stepId ? { ...s, is_completed: isCompleted, completed_at: completedAt } : s);
    setSteps(nextSteps);
    
    // Derived values to immediately sync progress/status
    const completedCount = nextSteps.filter(s => s.is_completed).length;
    const progress = nextSteps.length > 0 ? Math.round((completedCount / nextSteps.length) * 100) : (demand.progress || 0);
    const newStatus = progress === 100 && nextSteps.length > 0 
      ? 'concluido' 
      : (demand.status === 'concluido' ? 'em_andamento' : (demand.status || 'aberto'));

    try {
      await supabase
        .from('workflow_steps')
        .update({ is_completed: isCompleted, completed_at: completedAt })
        .eq('id', stepId);
        
      await supabase
        .from('demands')
        .update({ progress, status: newStatus })
        .eq('id', demand.id);
    } catch (error) {
      console.error('Error toggling step', error);
      // Revert if failed
      fetchSteps();
    }
  };

  const handleAddStep = async () => {
    try {
      const newStep = {
        demand_id: demand.id,
        label: 'Nova Etapa',
        is_completed: false,
        order_index: steps.length
      };

      const { data, error } = await supabase
        .from('workflow_steps')
        .insert([newStep])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setSteps([...steps, data]);
      }
    } catch (error) {
      console.error('Error adding step:', error);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || readOnly) return;
    
    const { source, destination } = result;
    if (source.index === destination.index) return;

    const newSteps = Array.from(steps);
    const [reorderedItem] = newSteps.splice(source.index, 1);
    newSteps.splice(destination.index, 0, reorderedItem);

    // Update state immediately
    setSteps(newSteps);

    // Update order_index in database
    try {
      const updates = newSteps.map((step: WorkflowStep, index: number) => ({
        id: step.id,
        order_index: index,
        demand_id: demand.id,
        label: step.label,
        is_completed: step.is_completed,
        estimated_date: step.estimated_date,
        completed_at: step.completed_at
      }));

      const { error } = await supabase
        .from('workflow_steps')
        .upsert(updates);
      
      if (error) throw error;
    } catch (err) {
      console.error('Error updating step order:', err);
      fetchSteps(); // Revert on error
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'project': return 'Projeto';
      case 'task': return 'Tarefa';
      case 'ticket': return 'Chamado';
      default: return type;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      {/* Project Header Section */}
      <div className="mb-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <div 
              className="flex items-center gap-2 text-primary font-headline font-bold text-sm cursor-pointer hover:underline"
              onClick={onBack}
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              {getTypeName(demand.type)} / {readOnly ? 'Visualização' : 'Edição'}
            </div>
            <h2 className="text-4xl font-extrabold font-headline tracking-tight text-primary uppercase">
              {demand.title}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
              <div className="flex items-center gap-1.5 text-on-surface-variant font-medium text-xs uppercase tracking-widest bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/10">
                <span className="material-symbols-outlined text-sm">event</span>
                <span>Criado em: {new Date(demand.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                <span className="material-symbols-outlined text-sm">person</span>
                <span>Criador: {demand.creator_email}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold font-label uppercase tracking-wider ${
                derivedStatus === 'concluido' 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-secondary-container text-on-secondary-container'
              }`}>
                {derivedStatus ? derivedStatus.replace('_', ' ') : 'Em Andamento'}
              </span>
              <div className="flex items-center gap-3 min-w-[200px]">
                <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-primary-container" 
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold text-primary">{progressPercentage}%</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {steps.length === 0 && !loading && !readOnly && (
              <button 
                onClick={handleManualComplete}
                disabled={saving}
                className={`px-4 py-2.5 rounded-lg font-headline font-bold text-sm flex items-center gap-2 transition-all ${
                  manualStatus === 'concluido' 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'bg-primary text-on-primary hover:opacity-90 shadow-md'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {manualStatus === 'concluido' ? 'check_circle' : 'task_alt'}
                </span>
                {manualStatus === 'concluido' ? 'Concluída' : 'Concluir Agora'}
              </button>
            )}
            
            {!readOnly && (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2.5 rounded-lg font-headline font-bold text-sm text-error border border-error/30 hover:bg-error/5 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
              <span className="hidden sm:inline">Excluir</span>
            </button>
            )}

            {!readOnly && (
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={saving || saveSuccess}
              className={`px-6 py-2.5 rounded-lg font-headline font-bold text-sm shadow-lg transition-all disabled:opacity-70 flex items-center justify-center min-w-[120px] gap-2 ${
                saveSuccess 
                  ? 'bg-green-600 text-white' 
                  : 'bg-primary text-on-primary hover:opacity-90'
              }`}
            >
              <AnimatePresence mode="wait">
                {saveSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">check_circle</span>
                    Salvo
                  </motion.div>
                ) : (
                  <motion.div
                    key="default"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">save</span>
                        Salvar
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
            )}
          </div>
        </div>

        {/* Project Status Info Horizontal Bar */}
        <div className="bg-primary text-on-primary rounded-xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary-container rounded-full opacity-30 blur-3xl"></div>
          
          <div className="flex items-center gap-6 z-10 w-full sm:w-auto overflow-x-auto hide-scrollbar">
            <div className="flex flex-col min-w-[120px]">
              <p className="text-[10px] uppercase font-bold text-on-primary-container tracking-widest mb-0.5 whitespace-nowrap">Prazo Final</p>
              <p className="text-lg font-black font-headline capitalize">{formattedFinalDate}</p>
            </div>

            <div className="h-8 w-[1px] bg-white/20 hidden md:block"></div>

            <div className="flex flex-col min-w-[120px]">
              <p className="text-[10px] uppercase font-bold text-on-primary-container tracking-widest mb-0.5 whitespace-nowrap">Recorrência</p>
              {readOnly ? (
                <p className="text-lg font-black font-headline capitalize">{recurrence === 'none' ? 'Nenhuma' : recurrence}</p>
              ) : (
                <select 
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="bg-transparent border-none p-0 text-lg font-black font-headline capitalize focus:ring-0 cursor-pointer text-on-primary appearance-none"
                >
                  <option value="none" className="text-on-surface bg-surface-container">Nenhuma</option>
                  <option value="semanal" className="text-on-surface bg-surface-container">Semanal</option>
                  <option value="mensal" className="text-on-surface bg-surface-container">Mensal</option>
                  <option value="trimestral" className="text-on-surface bg-surface-container">Trimestral</option>
                </select>
              )}
            </div>

            {recurrence !== 'none' && progressPercentage === 100 && !readOnly && (
              <motion.button 
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                onClick={handleRenew}
                disabled={renewing}
                className="bg-on-primary text-primary px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:opacity-90 shadow-xl transition-colors shrink-0 mx-2"
              >
                <span className="material-symbols-outlined animate-spin-slow">restart_alt</span>
                {renewing ? 'Gerando...' : 'Renovar Ciclo'}
              </motion.button>
            )}
          </div>
          
          <div className="flex items-center gap-4 z-10">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-on-primary-container tracking-widest mb-0.5">Progresso {steps.length > 0 ? 'de Tarefas' : 'Manual'}</p>
              <p className="text-xl font-black font-headline">
                {steps.length > 0 ? `${completedStepsCount} de ${steps.length} concluídas` : (manualStatus === 'concluido' ? 'Concluída' : 'Em Aberto')}
              </p>
            </div>
             <div className="bg-primary-container/40 p-2 rounded-full">
              <span className="material-symbols-outlined text-white text-2xl">task_alt</span>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="grid grid-cols-12 gap-6 pb-24 md:pb-0">
        <div className="col-span-12 space-y-6">
          
          {/* Basic Info Card */}
          <section className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-sm transition-all border border-transparent hover:border-outline-variant/20">
            <h3 className="font-headline font-bold text-lg mb-6 flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined">info</span>
              Informações Básicas
            </h3>
            
            <div className={`space-y-6 ${readOnly ? 'pointer-events-none opacity-80' : ''}`}>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2 tracking-wide">Título do Projeto</label>
                <input 
                  type="text" 
                  value={title}
                  readOnly={readOnly}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-primary font-semibold focus:ring-2 focus:ring-primary transition-all outline-none" 
                />
              </div>
              {demand.type === 'ticket' && (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2 tracking-wide">Número do Chamado (ID)</label>
                  <input 
                    type="text" 
                    value={ticketCode}
                    readOnly={readOnly}
                    onChange={(e) => setTicketCode(e.target.value)}
                    placeholder="Ex: TKT-1234"
                    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-primary font-semibold focus:ring-2 focus:ring-primary transition-all outline-none" 
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2 tracking-wide">Local / Unidade (Opcional)</label>
                <input 
                  type="text" 
                  value={location}
                  readOnly={readOnly}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: WEG Itajaí"
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-primary font-semibold focus:ring-2 focus:ring-primary transition-all outline-none" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2 tracking-wide">Link ou Caminho de Rede (Opcional)</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-on-surface-variant">link</span>
                  <input 
                    type="text" 
                    value={networkPath}
                    readOnly={readOnly}
                    onChange={(e) => setNetworkPath(e.target.value)}
                    placeholder="Ex: P:\Engenharia\Projetos\Linha04"
                    className="w-full px-4 py-3 pl-12 bg-surface-container-low border-none rounded-lg text-primary font-semibold focus:ring-2 focus:ring-primary transition-all outline-none" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2 tracking-wide">Prazo Final da Demanda</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-on-surface-variant">event</span>
                  <input 
                    type="date" 
                    value={deadline}
                    readOnly={readOnly}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-4 py-3 pl-12 bg-surface-container-low border-none rounded-lg text-primary font-semibold focus:ring-2 focus:ring-primary transition-all outline-none" 
                  />
                </div>
              </div>

              {!readOnly && (
                <div className="space-y-4">
                  <label className="text-xs font-bold text-primary uppercase tracking-widest px-1 font-headline">Privacidade e Equipe</label>
                  <div className="bg-surface-container-low p-4 rounded-xl space-y-4 border border-outline-variant/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-on-surface">Demanda Pública</h4>
                        <p className="text-xs text-on-surface-variant">Permite que outros usuários visualizem esta demanda na aba Equipe.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
                        <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    
                    <div className="pt-2 border-t border-outline-variant/10">
                      <label className="text-xs font-semibold text-on-surface mt-2 block">Adicionar email de membros da equipe (separados por vírgula)</label>
                      <input 
                        className="w-full mt-1 bg-surface-container border-0 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary text-on-surface transition-all outline-none" 
                        placeholder="joao@weg.net, maria@weg.net" 
                        type="text"
                        value={teamEmails}
                        onChange={e => setTeamEmails(e.target.value)}
                      />
                      <p className="text-xs text-on-surface-variant mt-1 mb-2">E-mails das pessoas que poderão editar as informações deste projeto.</p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2 tracking-wide">Descrição Técnica</label>
                <textarea 
                  value={description}
                  readOnly={readOnly}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm text-on-surface-variant focus:ring-2 focus:ring-primary transition-all resize-none outline-none" 
                  rows={4}
                ></textarea>
              </div>
            </div>
          </section>

          {/* Workflow Section */}
          <section className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <h3 className="font-headline font-bold text-lg flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined">format_list_bulleted</span>
                Workflow & Etapas
              </h3>
              {!readOnly && (
              <button 
                onClick={handleAddStep}
                className="flex items-center gap-2 text-sm font-bold text-primary hover:bg-surface-container-low px-3 py-2 rounded-lg transition-colors w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                Adicionar Etapa
              </button>
              )}
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-14 bg-surface-container-highest rounded-xl"></div>
                  ))}
                </div>
              ) : steps.length === 0 ? (
                <p className="text-sm text-center text-outline py-8">Nenhuma etapa definida para este projeto ainda.</p>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="steps">
                    {(provided) => (
                      <div 
                        {...provided.droppableProps} 
                        ref={provided.innerRef}
                        className="space-y-4"
                      >
                        {steps.map((step: WorkflowStep, index: number) => {
                          const DraggableAny = Draggable as any;
                          return (
                            <DraggableAny 
                              key={step.id} 
                              draggableId={step.id} 
                              index={index}
                              isDragDisabled={readOnly}
                            >
                              {(provided: any, snapshot: any) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 p-4 rounded-xl transition-all border ${
                                    snapshot.isDragging ? 'shadow-2xl scale-[1.02] rotate-1 z-50 bg-surface-container-high border-primary' :
                                    step.is_completed 
                                      ? 'bg-primary-fixed/30 border-primary-fixed' 
                                      : 'bg-surface-container-low border-transparent hover:border-outline-variant'
                                  }`}
                                >
                                  {!readOnly && (
                                    <div {...provided.dragHandleProps} className="text-outline cursor-grab active:cursor-grabbing hover:text-primary transition-colors">
                                      <span className="material-symbols-outlined text-[20px]">drag_indicator</span>
                                    </div>
                                  )}
                                  
                                  <button 
                                    disabled={readOnly}
                                    onClick={() => toggleStepCompletion(step.id, !step.is_completed)}
                                    className={`w-6 h-6 shrink-0 flex items-center justify-center rounded-full border-2 transition-colors ${
                                      step.is_completed 
                                        ? 'border-primary bg-primary text-on-primary' 
                                        : 'border-outline-variant bg-surface-container hover:border-primary'
                                    }`}
                                  >
                                    {step.is_completed && <span className="material-symbols-outlined text-[16px] font-bold">check</span>}
                                  </button>
                                  
                                  <input 
                                    type="text" 
                                    value={step.label}
                                    readOnly={readOnly}
                                    onChange={async (e) => {
                                      const newLabel = e.target.value;
                                      setSteps(steps.map(s => s.id === step.id ? { ...s, label: newLabel } : s));
                                      await supabase.from('workflow_steps').update({ label: newLabel }).eq('id', step.id);
                                    }}
                                    className={`flex-1 bg-transparent border-none p-0 text-sm font-semibold focus:ring-0 min-w-[150px] ${
                                      step.is_completed ? 'text-primary' : 'text-on-surface'
                                    }`} 
                                    placeholder="Nome da etapa..." 
                                  />
                                  
                                  <div className={`flex shrink-0 items-center gap-2 px-3 py-1.5 rounded border transition-colors ${
                                    step.is_completed ? 'bg-primary/10 border-transparent text-primary' : 'bg-surface-container-high/50 border-outline-variant/30 text-outline'
                                  }`}>
                                    {step.is_completed ? (
                                      <>
                                        <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                                        <span className="text-[11px] font-bold uppercase tracking-wider">
                                          Concluído em: {step.completed_at ? format(new Date(step.completed_at), "dd/MM/yyyy 'às' HH:mm") : format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                                        <input 
                                          type="date"
                                          disabled={readOnly}
                                          value={step.estimated_date ? format(new Date(step.estimated_date), 'yyyy-MM-dd') : ''}
                                          onChange={async (e) => {
                                            const newDate = e.target.value;
                                            setSteps(steps.map(s => s.id === step.id ? { ...s, estimated_date: newDate ? new Date(newDate).toISOString() : null } : s));
                                            await supabase.from('workflow_steps').update({ estimated_date: newDate ? new Date(newDate).toISOString() : null }).eq('id', step.id);
                                          }}
                                           className="bg-transparent border-none p-0 text-[11px] font-bold uppercase tracking-wider focus:ring-0 min-w-[100px] cursor-pointer"
                                        />
                                      </>
                                    )}
                                  </div>
                                   {!readOnly && (
                                   <button 
                                    onClick={async () => {
                                      setSteps(steps.filter(s => s.id !== step.id));
                                       await supabase.from('workflow_steps').delete().eq('id', step.id);
                                    }}
                                    className="p-1.5 text-outline hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors ml-auto sm:ml-0"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                  </button>
                                  )}
                                </div>
                              )}
                            </DraggableAny>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>
          </section>

          <CommentSection demandId={demand.id} />
          
        </div>
      </div>

      {/* Deletion Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            ></motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden z-10"
            >
              <div className="p-8">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <span className="material-symbols-outlined text-3xl">warning</span>
                </div>
                
                <h3 className="text-2xl font-black font-headline text-center text-on-surface mb-2 uppercase">Excluir Projeto?</h3>
                <p className="text-on-surface-variant text-center font-medium leading-relaxed">
                  Esta ação é irreversível. Todas as etapas do workflow e dados deste projeto serão removidos permanentemente.
                </p>
              </div>
              
              <div className="flex border-t border-outline-variant/10">
                <button
                  disabled={deleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-4 font-headline font-bold text-sm text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  disabled={deleting}
                  onClick={handleDelete}
                  className="flex-1 py-4 font-headline font-bold text-sm bg-red-500 text-white hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {deleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">delete_forever</span>
                      Sim, Excluir
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
