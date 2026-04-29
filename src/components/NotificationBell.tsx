import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, BellRing, Check, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  demand_id: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell({ userId }: { userId?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;

    fetchNotifications();
    checkDeadlines();

    // Subscribe to changes
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new as Notification : n));
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
      })
      .subscribe();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userId]);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) setNotifications(data);
    setLoading(false);
  };

  const checkDeadlines = async () => {
    await supabase.rpc('check_and_create_deadline_notifications');
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!userId) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-on-surface-variant hover:bg-surface-container-highest rounded-full transition-colors active:scale-95 duration-150 relative"
        title="Notificações"
      >
        {unreadCount > 0 ? (
          <>
            <BellRing size={24} className="text-primary" />
            <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-error rounded-full outline outline-2 outline-white dark:outline-surface">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        ) : (
          <Bell size={24} />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/20 z-50 overflow-hidden flex flex-col max-h-[80vh]">
          <div className="p-4 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low">
            <h3 className="font-headline font-bold text-lg text-primary">Notificações</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <Check size={14} />
                Marcar todas lidas
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1 p-2">
            {loading ? (
              <div className="p-4 text-center text-sm text-outline">Carregando...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-outline flex flex-col items-center gap-2">
                <Bell size={32} className="opacity-20" />
                <p>Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                  className={`p-3 rounded-lg flex gap-3 group relative cursor-pointer mb-1 transition-colors ${notification.is_read ? 'hover:bg-surface-container-low' : 'bg-primary/5 border border-primary/20 hover:bg-primary/10'}`}
                >
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  )}
                  <div className={`flex-1 min-w-0 ${notification.is_read ? 'ml-3' : ''}`}>
                    <p className={`text-sm mb-1 ${notification.is_read ? 'text-on-surface-variant' : 'text-on-surface font-bold'}`}>
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                    )}
                    <span className="text-[10px] text-outline font-bold uppercase tracking-wider block mt-2">
                      {format(new Date(notification.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <button 
                    onClick={(e) => deleteNotification(notification.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-error hover:bg-error/10 rounded transition-all absolute top-2 right-2"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
