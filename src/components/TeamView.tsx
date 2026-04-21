import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Briefcase, Ticket, CheckSquare, Search, Eye, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface TeamViewProps {
  searchQuery: string;
  onEditDemand: (demand: any) => void;
  onViewDemand: (demand: any) => void;
}

export default function TeamView({ searchQuery, onEditDemand, onViewDemand }: TeamViewProps) {
  const [demands, setDemands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      setCurrentUser(userData.user);

      // Fetch demands where we are not the owner.
      // Thanks to RLS, this will return demands that are public or we are a member of.
      const { data, error } = await supabase
        .from('demands_with_email')
        .select('*')
        .neq('user_id', userData.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDemands(data || []);
    } catch (err) {
      console.error('Error fetching team demands:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDemands = demands.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (d.ticket_code && d.ticket_code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return <Briefcase className="text-secondary" size={20} />;
      case 'ticket': return <Ticket className="text-error" size={20} />;
      default: return <CheckSquare className="text-primary" size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-on-surface font-manrope">Demanda da Equipe</h2>
        <p className="text-outline">Projetos e tickets compartilhados por outros usuários.</p>
      </div>

      <div className="bg-surface-container rounded-2xl border border-outline-variant/20 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container-low text-on-surface-variant text-sm">
                <th className="py-3 px-6 font-semibold">Código</th>
                <th className="py-3 px-6 font-semibold">Título</th>
                <th className="py-3 px-6 font-semibold">Criado por</th>
                <th className="py-3 px-6 font-semibold">Tipo</th>
                <th className="py-3 px-6 font-semibold">Status</th>
                <th className="py-3 px-6 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredDemands.length > 0 ? (
                filteredDemands.map((demand) => (
                  <tr key={demand.id} className="border-b border-outline-variant/10 hover:bg-surface-container-high transition-colors">
                    <td className="py-3 px-6 text-sm font-mono text-outline">{demand.ticket_code || '-'}</td>
                    <td className="py-3 px-6 font-medium text-on-surface">{demand.title}</td>
                    <td className="py-3 px-6 text-sm text-outline">
                      {demand.creator_email?.split('@')[0] || 'Usuário Desconhecido'}
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(demand.type)}
                        <span className="text-sm capitalize">{demand.type === 'project' ? 'Projeto' : demand.type === 'ticket' ? 'Chamado' : 'Tarefa'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-bold",
                        demand.status === 'aberto' ? 'bg-error/10 text-error' :
                        demand.status === 'em_andamento' ? 'bg-secondary/10 text-secondary' :
                        'bg-primary/10 text-primary'
                      )}>
                        {demand.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center">
                       <button
                         onClick={() => onEditDemand(demand)}
                         className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-primary/10 rounded-full"
                         title="Editar"
                       >
                         <Edit2 size={18} />
                       </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-outline">
                    Nenhuma demanda da equipe encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
