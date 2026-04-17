import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { format, addDays } from 'date-fns';

type CreateDemandModalProps = {
  type: 'task' | 'project' | 'ticket';
  onClose: () => void;
  onCreated: () => void;
  editDemand?: any;
};

type Step = {
  id?: string;
  label: string;
  days_to_complete?: number;
  is_completed?: boolean;
};

export default function CreateDemandModal({ type: propsType, onClose, onCreated, editDemand }: CreateDemandModalProps) {
  const [type, setType] = useState<'task' | 'project' | 'ticket'>(editDemand ? editDemand.type : propsType);
  const [title, setTitle] = useState(editDemand ? editDemand.title : '');
  const [description, setDescription] = useState(editDemand ? editDemand.description : '');
  const [priority, setPriority] = useState<'baixa' | 'media' | 'alta' | 'critica'>(editDemand ? editDemand.priority : 'media');
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
	if (editDemand) {
		const loadSteps = async () => {
			const { data } = await supabase
				.from('workflow_steps')
				.select('id, label, is_completed')
				.eq('demand_id', editDemand.id)
				.order('order_index', { ascending: true });
			if (data) {
				setSteps(data.map(d => ({ id: d.id, label: d.label, is_completed: d.is_completed })));
			}
		};
		loadSteps();
	}
  }, [editDemand]);
  
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const typeLabels = {
    task: 'Tarefa',
    project: 'Projeto',
    ticket: 'Chamado'
  };

  const handleEnhance = async () => {
    if (!description) return;
    setIsEnhancing(true);
    try {
        const res = await fetch('/api/groq/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: description })
        });
        const data = await res.json();
        if (data.result) {
            setDescription(data.result);
        }
    } catch (err) {
        console.error('Enhance error', err);
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleSuggestWorkflow = async () => {
    if (!title) return;
    setIsSuggesting(true);
    try {
        const res = await fetch('/api/groq/suggest-workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, type })
        });
        const data = await res.json();
        if (data.steps && Array.isArray(data.steps)) {
            setSteps(data.steps);
        }
    } catch (err) {
        console.error('Suggest error', err);
    } finally {
        setIsSuggesting(false);
    }
  };

  const handleSave = async () => {
    if (!title) return;
    setIsSaving(true);
    try {
      if (editDemand) {
        const { error } = await supabase.from('demands').update({
          title,
          description,
          type,
          priority
        }).eq('id', editDemand.id);
        if (error) throw error;
      } else {
        const { data: demand, error: demandError } = await supabase.from('demands').insert({
          title,
          description,
          type,
          priority,
          progress: 0,
          status: 'aberto'
        }).select().single();
        if (demandError) throw demandError;
        
        // Save steps if any
        if (steps.length > 0) {
          const workflowSteps = steps.map((s, i) => ({
            demand_id: demand.id,
            label: s.label,
            order_index: i,
            is_completed: false,
            estimated_date: addDays(new Date(), (s.days_to_complete || 0) * (i + 1)).toISOString()
          }));
          const { error: stepsError } = await supabase.from('workflow_steps').insert(workflowSteps);
          if (stepsError) throw stepsError;
        }
      }
      onCreated();
    } catch (err: any) {
      console.error('Save error', err);
      alert(`Erro ao salvar: ${err?.message || JSON.stringify(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800">Novo {typeLabels[type]}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Título</label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Atualização do Servidor Central"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all placeholder:text-slate-400 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Tipo</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-slate-800"
              >
                <option value="task">Tarefa</option>
                <option value="project">Projeto</option>
                <option value="ticket">Chamado</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Prioridade</label>
              <select 
                value={priority} 
                onChange={e => setPriority(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-slate-800"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700">Descrição Técnica</label>
              <button 
                onClick={handleEnhance}
                disabled={!description || isEnhancing}
                className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isEnhancing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Melhorar com IA
              </button>
            </div>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Descreva a demanda com suas palavras. Use a IA para formatar..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all placeholder:text-slate-400 text-slate-800 resize-none leading-relaxed"
            />
          </div>

          {/* Workflow Steps */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">Workflow / Etapas</h3>
                <p className="text-xs text-slate-500 mt-0.5">Defina as fases da demanda</p>
              </div>
              <button 
                onClick={handleSuggestWorkflow}
                disabled={!title || isSuggesting}
                className="text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Gerar com IA
              </button>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {steps.map((step, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    key={idx} 
                    className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 group"
                  >
                    <div className="bg-white w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-slate-400 shadow-sm">
                      {idx + 1}
                    </div>
                    <input 
                      type="text" 
                      value={step.label}
                      onChange={e => {
                        const newSteps = [...steps];
                        newSteps[idx].label = e.target.value;
                        setSteps(newSteps);
                      }}
                      className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700"
                    />
                    {step.id && (
                      <button
                        onClick={async () => {
                          const newStatus = !step.is_completed;
                          await supabase.from('workflow_steps').update({ is_completed: newStatus }).eq('id', step.id);
                          const newSteps = [...steps];
                          newSteps[idx].is_completed = newStatus;
                          setSteps(newSteps);
                        }}
                        className={`text-[10px] px-2 py-1 rounded hover:opacity-80 ${step.is_completed ? 'bg-amber-500 text-white' : 'bg-primary text-white'}`}
                      >
                        {step.is_completed ? 'Reabrir Etapa' : 'Finalizar'}
                      </button>
                    )}
                    {step.days_to_complete !== undefined && (
                       <span className="text-xs text-slate-400 font-medium bg-slate-200/50 px-2 py-1 rounded-md">+{step.days_to_complete}d</span>
                    )}
                    <button 
                      onClick={() => setSteps(steps.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <button 
                onClick={() => setSteps([...steps, { label: '' }])}
                className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-500 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <Plus size={18} /> Adicionar Etapa Manual
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={!title || isSaving}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && <Loader2 size={18} className="animate-spin" />}
            Salvar {typeLabels[type]}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
