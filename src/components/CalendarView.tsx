import React, { useState, useMemo } from 'react';
import { useDemands } from '../hooks/useDemands';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays,
  addWeeks, subWeeks 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Loader2, Users } from 'lucide-react';
import { cn, parseDateString } from '../lib/utils'; // Make sure parseDateString is correctly imported and exported

export type CalendarEvent = {
  id: string;
  title: string;
  demandTitle: string;
  stepLabel: string;
  date: Date;
  assignee: string;
  priority: string;
  type: string;
  isCompleted: boolean;
  demand: any; // Add raw demand
};

export default function CalendarView({ 
  onViewDemand,
  currentUserId
}: { 
  onViewDemand: (demand: any) => void,
  currentUserId?: string
}) {
  const { demands, loading } = useDemands();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'mes'|'semana'>('mes');

  const events: CalendarEvent[] = useMemo(() => {
    const evts: CalendarEvent[] = [];
    demands.forEach(d => {
      if (d.workflow_steps && d.workflow_steps.length > 0) {
        d.workflow_steps.forEach((step: any, idx: number) => {
          if (step.estimated_date) {
            const dateObj = parseDateString(step.estimated_date);
            if (dateObj) {
              evts.push({
                id: `${d.id}-${idx}`,
                title: `${d.title} - ${step.label}`,
                demandTitle: d.title,
                stepLabel: step.label,
                date: dateObj,
                assignee: d.creator_email || 'N/A',
                priority: d.priority,
                type: d.type,
                isCompleted: step.is_completed,
                demand: d
              });
            }
          }
        });
      } else if (d.deadline) {
        const dateObj = parseDateString(d.deadline);
        if (dateObj) {
          evts.push({
             id: `${d.id}-main`,
             title: `${d.title} - Entrega Final`,
             demandTitle: d.title,
             stepLabel: 'Entrega Final',
             date: dateObj,
             assignee: d.creator_email || 'N/A',
             priority: d.priority,
             type: d.type,
             isCompleted: d.status === 'concluido' || d.status === 'concluído',
             demand: d
          });
        }
      }
    });
    return evts;
  }, [demands]);

  const next = () => {
    if (viewMode === 'semana') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };
  const prev = () => {
    if (viewMode === 'semana') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };
  const goToday = () => {
      setCurrentDate(new Date());
      setSelectedDate(new Date());
  };

  const getPriorityClasses = (priority: string, isTaskBar: boolean) => {
      switch (priority) {
          case 'critica': return isTaskBar ? 'border-red-600 bg-red-600/10 text-red-600 dark:text-red-400' : 'bg-red-600 text-white';
          case 'alta': return isTaskBar ? 'border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-orange-500 text-white';
          case 'media': return isTaskBar ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-blue-500 text-white';
          case 'baixa': return isTaskBar ? 'border-slate-500 bg-slate-500/10 text-slate-600 dark:text-slate-400' : 'bg-slate-500 text-white';
          default: return isTaskBar ? 'border-slate-400 bg-slate-400/10 text-slate-600 dark:text-slate-400' : 'bg-slate-400 text-white';
      }
  };

  const renderCells = () => {
    let startDate, endDate;
    if (viewMode === 'semana') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
        endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
        endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    }

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, "d");
        const cloneDay = day;
        
        const dayEvents = events.filter(e => isSameDay(e.date, cloneDay));

        const isCurrentMonth = viewMode === 'semana' || isSameMonth(day, startOfMonth(currentDate));

        days.push(
          <div
            className={cn(
              "md:min-h-[140px] min-h-[100px] p-2 border-r border-b border-outline-variant/30 flex flex-col gap-1 transition-colors",
              !isCurrentMonth ? "text-outline-variant bg-surface-container-lowest/50" : "bg-surface-container-lowest cursor-pointer",
              !isCurrentMonth ? "" : (isSameDay(day, selectedDate) ? "bg-primary/5" : "hover:bg-surface-container-low")
            )}
            key={day.toISOString()}
            onClick={() => isCurrentMonth && setSelectedDate(cloneDay)}
          >
            <span className={cn(
                "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mb-1",
                isSameDay(day, new Date()) ? "bg-primary text-on-primary" : "text-on-surface",
                !isCurrentMonth && "text-outline-variant"
            )}>
                {formattedDate}
            </span>
            {isCurrentMonth && (
              <div className="flex-1 flex flex-col gap-1 overflow-y-auto hide-scrollbar">
                {dayEvents.slice(0, 3).map(evt => (
                    <div 
                        key={evt.id} 
                        className={cn(
                        "text-[10px] sm:text-xs truncate px-1.5 py-0.5 rounded border-l-4 font-medium", 
                        getPriorityClasses(evt.priority, true),
                        evt.isCompleted && "opacity-50 line-through border-outline bg-surface-container text-outline"
                        )}
                        title={evt.title}
                    >
                        {evt.demandTitle}
                    </div>
                ))}
                {dayEvents.length > 3 && (
                    <div className="text-[10px] text-outline font-medium px-1">+{dayEvents.length - 3} mais</div>
                )}
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toISOString()}>
          {days}
        </div>
      );
      days = [];
    }
    return rows;
  };

  const selectedDayEvents = events.filter(e => isSameDay(e.date, selectedDate));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 w-full h-full">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col xl:flex-row h-[calc(100vh-80px)] w-full overflow-hidden bg-surface">
      {/* Calendar Grid Area */}
      <div className="flex-1 flex flex-col overflow-y-auto hide-scrollbar">
         {/* Calendar Header */}
         <div className="p-6 bg-surface-container-lowest border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-headline font-bold text-on-surface capitalize">
                {format(currentDate, "MMMM yyyy", { locale: ptBR })}
              </h2>
              <div className="flex items-center rounded-lg border border-outline-variant/50 bg-surface-container overflow-hidden">
                <button onClick={prev} className="p-2 hover:bg-surface-container-highest transition-colors text-on-surface">
                  <ChevronLeft size={20} />
                </button>
                <div className="w-px h-5 bg-outline-variant/30" />
                <button onClick={next} className="p-2 hover:bg-surface-container-highest transition-colors text-on-surface">
                  <ChevronRight size={20} />
                </button>
              </div>
              <button onClick={goToday} className="px-4 py-2 border border-outline-variant/50 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors">
                Hoje
              </button>
            </div>

            <div className="flex bg-surface-container rounded-lg p-1 border border-outline-variant/30">
              {(['mes', 'semana'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all",
                    viewMode === mode 
                      ? "bg-surface-container-lowest shadow-sm text-primary" 
                      : "text-on-surface-variant hover:text-on-surface"
                  )}
                >
                  {mode === 'mes' ? 'Mês' : 'Semana'}
                </button>
              ))}
            </div>
         </div>

         {/* Calendar Body */}
         <div className="flex-1 bg-surface-container-lowest flex flex-col">
            <div className="grid grid-cols-7 border-b border-outline-variant/30 bg-surface-container-lowest sticky top-[88px] z-10">
              {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
                <div key={d} className="py-4 text-center text-xs font-bold text-outline uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>
            <div className="flex-1 flex flex-col">
               {renderCells()}
            </div>
         </div>
      </div>

      {/* Sidebar for Selected Day */}
      <div className="w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-outline-variant/20 bg-surface-container-lowest p-6 flex flex-col xl:h-full xl:overflow-y-auto hide-scrollbar shrink-0">
         <div className="flex justify-between items-center mb-6">
             <h3 className="font-headline font-bold text-primary flex items-center gap-2">
                 <CalendarIcon size={20} /> Demandas do Dia
             </h3>
             <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">
                 {selectedDayEvents.length} Tarefa{selectedDayEvents.length !== 1 && 's'}
             </span>
         </div>
         
         <div className="mb-4">
            <p className="text-sm font-medium text-on-surface-variant">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
         </div>

         <div className="flex flex-col gap-4">
            {selectedDayEvents.map(evt => (
                <div key={evt.id} className="p-4 rounded-xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col gap-2 relative overflow-hidden transition-shadow hover:shadow-md cursor-pointer" onClick={() => onViewDemand(evt.demand)}>
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", getPriorityClasses(evt.priority, false))} />
                    
                    <div className="flex justify-between items-start">
                      <div className="text-xs text-primary font-bold flex items-center gap-1.5">
                         <Clock size={12} /> Prazo de Etapa
                      </div>
                      {evt.isCompleted && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-success/20 text-success rounded font-bold uppercase tracking-wider">
                            Concluído
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className={cn("font-bold text-on-surface text-sm line-clamp-2", evt.isCompleted && "line-through text-outline")}>
                        {evt.demandTitle}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium truncate",
                          evt.isCompleted ? "bg-surface-container text-outline" : "bg-primary/5 text-primary"
                        )}>
                           {evt.stepLabel}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-outline-variant/10">
                        <div className="flex items-center gap-2">
                            {evt.demand.creator_avatar_url ? (
                               <img src={evt.demand.creator_avatar_url} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                               <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary font-bold">
                                  {evt.assignee[0].toUpperCase()}
                               </div>
                            )}
                           <span className="text-xs text-on-surface-variant truncate max-w-[120px]">{evt.assignee.split('@')[0]}</span>
                           {currentUserId && evt.demand.user_id && currentUserId !== evt.demand.user_id && (
                             <Users size={14} className="text-primary opacity-70 ml-1" title="Compartilhado por equipe" />
                           )}
                        </div>
                        <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", getPriorityClasses(evt.priority, true))}>
                          {evt.priority}
                        </span>
                    </div>
                </div>
            ))}
            
            {selectedDayEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center mt-10 p-6 bg-surface-container rounded-xl border border-outline-variant/20 border-dashed">
                  <CalendarIcon size={32} className="text-outline-variant mb-2" />
                  <p className="text-sm font-medium text-on-surface">Nenhuma demanda</p>
                  <p className="text-xs text-outline mt-1">Nenhuma etapa expira neste dia.</p>
                </div>
            )}
         </div>
      </div>
    </div>
  );
}
