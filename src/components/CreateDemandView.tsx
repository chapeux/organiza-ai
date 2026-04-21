import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function CreateDemandView({ onBack }: { onBack?: () => void }) {
  const [type, setType] = useState<'task' | 'project' | 'ticket'>('task');
  const [title, setTitle] = useState('');
  const [ticketCode, setTicketCode] = useState('');
  const [location, setLocation] = useState('');
  const [networkPath, setNetworkPath] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'baixa' | 'media' | 'alta' | 'critica'>('media');
  const [steps, setSteps] = useState<{ id: number, label: string, date: string }[]>([
    { id: Date.now(), label: 'Levantamento Técnico', date: format(new Date(), 'yyyy-MM-dd') }
  ]);
  
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleEnhance = async () => {
    if (!description) return;
    setIsEnhancing(true);
    try {
        const res = await fetch('/api/groq/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: description })
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Server error response:', errorText);
          alert(`Erro no servidor (${res.status}): ${errorText.substring(0, 100)}`);
          return;
        }

        const data = await res.json();
        if (data.error) {
            alert(data.error);
        } else if (data.result) {
            setDescription(data.result);
        }
    } catch (err: any) {
        console.error('Enhance error', err);
        alert(`Erro de conexão: ${err.message || 'Verifique sua internet ou logs do Vercel.'}`);
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
        if (data.error) {
            alert(data.error);
        } else if (data.steps && Array.isArray(data.steps)) {
            setSteps(data.steps.map((s: any, idx: number) => ({
              id: Date.now() + idx,
              label: s.label,
              date: s.days_to_complete ? format(addDays(new Date(), s.days_to_complete), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
            })));
        }
    } catch (err) {
        console.error('Suggest error', err);
        alert('Ocorreu um erro ao conectar com o serviço de IA.');
    } finally {
        setIsSuggesting(false);
    }
  };

  const handleSave = async () => {
    if (!title) {
      alert("O título é obrigatório.");
      return;
    }
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const payload: any = {
        title,
        description,
        type,
        priority,
        user_id: user?.id,
        location: location || null,
        network_path: networkPath || null,
      };
      if (type === 'ticket') {
        payload.ticket_code = ticketCode;
      }

      const { data: demand, error: demandError } = await supabase.from('demands').insert(payload).select().single();

      if (demandError) throw demandError;

      if ((type === 'task' || type === 'project') && steps.length > 0) {
        const workflowSteps = steps.map((s, idx) => ({
          demand_id: demand.id,
          label: s.label,
          order_index: idx,
          estimated_date: s.date
        }));

        const { error: stepsError } = await supabase.from('workflow_steps').insert(workflowSteps);
        if (stepsError) throw stepsError;
      }

      if (onBack) onBack();
    } catch (err: any) {
      console.error('Save error', err);
      alert(`Erro ao salvar: ${err?.message || JSON.stringify(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 lg:p-12 bg-surface pb-32">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col gap-2 relative">
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline">Nova Demanda</h1>
          <p className="text-on-surface-variant font-medium text-sm">Registre uma nova tarefa, projeto ou ticket no ecossistema industrial.</p>
        </div>

        {/* Form Content in Bento Grid Style */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Primary Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Type Selector Card */}
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-none border-0 ring-1 ring-outline-variant/15">
              <h3 className="text-sm font-bold text-primary mb-4 uppercase tracking-wider font-headline">Tipo de Demanda</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => setType('task')}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${type === 'task' ? 'border-primary bg-primary/5' : 'border-transparent bg-surface-container-low hover:bg-surface-variant'}`}
                >
                  <span className={`material-symbols-outlined text-3xl ${type === 'task' ? 'text-primary' : 'text-on-surface-variant'}`}>task</span>
                  <span className={`text-sm ${type === 'task' ? 'font-bold text-primary' : 'font-semibold text-on-surface-variant'}`}>Tarefa</span>
                </button>
                <button 
                  onClick={() => setType('project')}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${type === 'project' ? 'border-primary bg-primary/5' : 'border-transparent bg-surface-container-low hover:bg-surface-variant'}`}
                >
                  <span className={`material-symbols-outlined text-3xl ${type === 'project' ? 'text-primary' : 'text-on-surface-variant'}`}>account_tree</span>
                  <span className={`text-sm ${type === 'project' ? 'font-bold text-primary' : 'font-semibold text-on-surface-variant'}`}>Projeto</span>
                </button>
                <button 
                  onClick={() => setType('ticket')}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${type === 'ticket' ? 'border-primary bg-primary/5' : 'border-transparent bg-surface-container-low hover:bg-surface-variant'}`}
                >
                  <span className={`material-symbols-outlined text-3xl ${type === 'ticket' ? 'text-primary' : 'text-on-surface-variant'}`}>confirmation_number</span>
                  <span className={`text-sm ${type === 'ticket' ? 'font-bold text-primary' : 'font-semibold text-on-surface-variant'}`}>Chamado</span>
                </button>
              </div>
            </div>

            {/* Form Basic Data */}
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-none ring-1 ring-outline-variant/15 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-widest px-1 font-headline">Título da Demanda</label>
                <input 
                  className="w-full bg-surface-container-low border-0 rounded-lg p-4 focus:ring-2 focus:ring-primary text-on-surface transition-all" 
                  placeholder="Ex: Otimização de Resfriamento - Linha 04" 
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>
              
              {type === 'ticket' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary uppercase tracking-widest px-1 font-headline">Número do Chamado (ID)</label>
                  <input 
                    className="w-full bg-surface-container-low border-0 rounded-lg p-4 focus:ring-2 focus:ring-primary text-on-surface transition-all" 
                    placeholder="Ex: #CH-2023-089" 
                    type="text"
                    value={ticketCode}
                    onChange={e => setTicketCode(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-widest px-1 font-headline">Local / Unidade (Opcional)</label>
                <input 
                  className="w-full bg-surface-container-low border-0 rounded-lg p-4 focus:ring-2 focus:ring-primary text-on-surface transition-all" 
                  placeholder="Ex: WEG Itajaí, Seção Expedição..." 
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-primary uppercase tracking-widest px-1 font-headline">Link ou Caminho de Rede (Opcional)</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-on-surface-variant">link</span>
                  <input 
                    className="w-full bg-surface-container-low border-0 rounded-lg p-4 pl-12 focus:ring-2 focus:ring-primary text-on-surface transition-all" 
                    placeholder="Ex: P:\Engenharia\Projetos\Linha04 ou https://weg.sharepoint.com/..." 
                    type="text"
                    value={networkPath}
                    onChange={e => setNetworkPath(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-primary uppercase tracking-widest px-1 font-headline">Descrição Detalhada</label>
                  <button 
                    onClick={handleEnhance}
                    disabled={!description || isEnhancing}
                    className="text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {isEnhancing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Melhorar com IA
                  </button>
                </div>
                <textarea 
                  className="w-full bg-surface-container-low border-0 rounded-lg p-4 focus:ring-2 focus:ring-primary text-on-surface transition-all resize-none" 
                  placeholder="Descreva os requisitos técnicos e objetivos desta demanda..." 
                  rows={6}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                ></textarea>
              </div>
            </div>

            {/* Workflow Section */}
            {(type === 'task' || type === 'project') && (
              <div className="bg-surface-container-lowest p-8 rounded-xl shadow-none ring-1 ring-outline-variant/15">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider font-headline">Configuração de Fluxo (Workflow)</h3>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleSuggestWorkflow}
                      disabled={!title || isSuggesting}
                      className="text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      GERAR COM IA
                    </button>
                    <button 
                      onClick={() => setSteps([...steps, { id: Date.now(), label: '', date: format(new Date(), 'yyyy-MM-dd') }])}
                      className="text-primary font-bold text-xs flex items-center gap-1 hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">add_circle</span>
                      ADICIONAR ETAPA
                    </button>
                  </div>
                </div>
                <div className="space-y-4 relative">
                  {steps.length === 0 ? (
                    <div className="text-sm text-on-surface-variant italic text-center py-4">Nenhuma etapa definida.</div>
                  ) : (
                    steps.map((step, idx) => (
                      <div key={step.id} className="flex gap-4 items-start group">
                        <div className="mt-1 flex flex-col items-center gap-1">
                          <div className={`w-8 h-8 rounded-full ${idx === 0 ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-highest text-on-surface-variant'} flex items-center justify-center font-bold text-xs font-headline`}>
                            {String(idx + 1).padStart(2, '0')}
                          </div>
                          {idx !== steps.length - 1 && <div className="w-0.5 h-12 bg-surface-container-highest"></div>}
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container-low p-4 rounded-lg relative">
                          <input 
                            className="bg-transparent border-0 font-semibold p-0 focus:ring-0 text-sm" 
                            type="text" 
                            placeholder="Nome da etapa..."
                            value={step.label}
                            onChange={(e) => {
                              const newSteps = [...steps];
                              newSteps[idx].label = e.target.value;
                              setSteps(newSteps);
                            }}
                          />
                          <div className="flex items-center justify-between text-on-surface-variant">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm">calendar_today</span>
                              <input 
                                className="bg-transparent border-0 text-xs p-0 focus:ring-0" 
                                type="date"
                                value={step.date}
                                onChange={(e) => {
                                  const newSteps = [...steps];
                                  newSteps[idx].date = e.target.value;
                                  setSteps(newSteps);
                                }}
                              />
                            </div>
                            <button 
                              onClick={() => setSteps(steps.filter(s => s.id !== step.id))}
                              className="text-outline hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Settings & Metadata */}
          <div className="space-y-6">
            
            {/* Priority Card */}
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-none ring-1 ring-outline-variant/15">
              <h3 className="text-sm font-bold text-primary mb-4 uppercase tracking-wider font-headline">Nível de Prioridade</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border-0 bg-surface-container-low cursor-pointer hover:bg-surface-variant transition-colors group">
                  <input 
                    className="text-primary focus:ring-primary h-4 w-4" 
                    name="priority" 
                    type="radio" 
                    value="baixa" 
                    checked={priority === 'baixa'} 
                    onChange={() => setPriority('baixa')} 
                  />
                  <span className="flex-1 text-sm font-medium">Baixa</span>
                  <span className="w-2 h-2 rounded-full bg-outline"></span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border-0 bg-surface-container-low cursor-pointer hover:bg-surface-variant transition-colors group">
                  <input 
                    className="text-primary focus:ring-primary h-4 w-4" 
                    name="priority" 
                    type="radio" 
                    value="media" 
                    checked={priority === 'media'} 
                    onChange={() => setPriority('media')} 
                  />
                  <span className="flex-1 text-sm font-medium">Média</span>
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border-0 bg-surface-container-low cursor-pointer hover:bg-surface-variant transition-colors group">
                  <input 
                    className="text-primary focus:ring-primary h-4 w-4" 
                    name="priority" 
                    type="radio" 
                    value="alta" 
                    checked={priority === 'alta'} 
                    onChange={() => setPriority('alta')} 
                  />
                  <span className="flex-1 text-sm font-medium">Alta</span>
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border-0 bg-error-container/20 cursor-pointer hover:bg-error-container/40 transition-colors group">
                  <input 
                    className="text-error focus:ring-error h-4 w-4" 
                    name="priority" 
                    type="radio" 
                    value="critica" 
                    checked={priority === 'critica'} 
                    onChange={() => setPriority('critica')} 
                  />
                  <span className="flex-1 text-sm font-bold text-error">Crítica</span>
                  <span className="w-2 h-2 rounded-full bg-error"></span>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Action Footer */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-4 pb-12 border-t border-outline-variant/10">
          <button 
            onClick={onBack} 
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-3 rounded-lg text-on-surface-variant font-bold text-sm hover:bg-surface-container transition-all active:scale-95 text-center disabled:opacity-50"
          >
            Cancelar Operação
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto px-10 py-3 rounded-lg bg-primary text-on-primary font-bold text-sm shadow-lg shadow-primary/10 hover:brightness-110 active:scale-95 transition-all text-center disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isSaving && <Loader2 size={16} className="animate-spin" />}
            Criar Demanda
          </button>
        </div>

      </div>
    </div>
  );
}
