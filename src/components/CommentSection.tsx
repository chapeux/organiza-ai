import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Comment {
  id: string;
  demand_id: string;
  user_id: string;
  user_email: string;
  comment: string;
  created_at: string;
}

export default function CommentSection({ demandId }: { demandId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
    
    // Subscribe to changes
    const channel = supabase
      .channel('comments')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'demand_comments',
        filter: `demand_id=eq.${demandId}`
      }, (payload) => {
        setComments(prev => [payload.new as Comment, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [demandId]);

  const fetchComments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('demand_comments')
      .select('*')
      .eq('demand_id', demandId)
      .order('created_at', { ascending: false });
    
    if (data) setComments(data);
    setLoading(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('demand_comments')
      .insert([
        { 
          demand_id: demandId, 
          comment: newComment,
          user_id: user?.id,
          user_email: user?.email
        }
      ]);

    if (!error) {
      setNewComment('');
    }
    setSubmitting(false);
  };

  return (
    <section className="bg-surface-container-lowest rounded-xl p-6 sm:p-8 shadow-sm mt-6">
      <h3 className="font-headline font-bold text-lg mb-6 flex items-center gap-2 text-primary">
        <span className="material-symbols-outlined">chat</span>
        Comentários e Discussão
      </h3>

      <div className="space-y-6">
        <form onSubmit={handleAddComment} className="flex gap-4">
          <input 
            type="text" 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Adicione um comentário... mencione @pessoa"
            className="flex-1 px-4 py-3 bg-surface-container-low border-none rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
          />
          <button 
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="px-6 py-3 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Enviando...' : 'Enviar'}
          </button>
        </form>

        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-outline text-sm">Carregando comentários...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-outline text-sm">Nenhum comentário por aqui ainda.</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="bg-surface-container-low p-4 rounded-lg">
                <div className="flex justify-between text-xs text-on-surface-variant font-bold mb-2">
                  <span>{comment.user_email || 'Usuário'}</span>
                  <span>{format(new Date(comment.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}</span>
                </div>
                <p className="text-on-surface text-sm">{comment.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
