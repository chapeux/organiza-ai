import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import DashboardView from './DashboardView';
import TasksView from './TasksView';
import TicketsView from './TicketsView';
import ProjectView from './ProjectView';
import CreateDemandView from './CreateDemandView';
import EditDemandView from './EditDemandView';
import ProfileView from './ProfileView';
import ReportsView from './ReportsView';
import ManagerDashboardView from './ManagerDashboardView';
import TeamView from './TeamView';
import NotificationBell from './NotificationBell';
import { LayoutDashboard, CheckSquare, Briefcase, Ticket, LineChart, HelpCircle, LogOut, Search, Moon, Sun, Settings, Plus, User, ShieldCheck, Users } from 'lucide-react';

export default function AppLayout({ session }: { session?: any }) {
  const [viewingDemand, setViewingDemand] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'painel' | 'equipe' | 'relatorios' | 'nova_demanda' | 'editar_demanda' | 'perfil' | 'gestao' | 'visualizar_demanda'>('painel');
  const [editingDemand, setEditingDemand] = useState<any>(null);
  const [userPrefs, setUserPrefs] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('weg-theme') === 'dark';
  });

  useEffect(() => {
    async function fetchPreferences() {
      if(session?.user?.id) {
        const { data } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        setUserPrefs(data);
      }
    }
    fetchPreferences();
  }, [session?.user?.id]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('weg-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('weg-theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleViewDemand = (demand: any) => {
    setViewingDemand(demand);
    setActiveTab('visualizar_demanda');
  };

  const handleEditDemand = (demand: any) => {
    setEditingDemand(demand);
    setActiveTab('editar_demanda');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const onViewNotificationDemand = async (demandId: string) => {
    const { data: demand, error } = await supabase
      .from('demands')
      .select('*')
      .eq('id', demandId)
      .single();
    if (demand) {
      handleViewDemand(demand);
    }
  };

  const userName = session?.user?.user_metadata?.full_name || (session?.user?.email ? session.user.email.split('@')[0] : 'Arquiteto Industrial');
  const userRole = session?.user?.user_metadata?.role;
  const avatarUrl = session?.user?.user_metadata?.avatar_url;

  const isGestor = userRole === 'Gestor';

  return (
    <div className="bg-surface text-on-surface flex min-h-screen">
      {/* SideNavBar */}
      <aside className="h-screen w-64 fixed left-0 top-0 border-r border-outline-variant/20 bg-surface-container-low flex flex-col py-6 z-40 hidden md:flex">
        <div className="px-6 mb-10 cursor-pointer" onClick={() => setActiveTab('painel')}>
          <div className="flex items-center gap-2">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/WEG_Equipamentos_El%C3%A9tricos.svg/1280px-WEG_Equipamentos_El%C3%A9tricos.svg.png" alt="WEG Logo" className="h-6 object-contain" />
            <h1 className="font-black text-primary text-xl tracking-tight">Synergy</h1>
          </div>
          <p className="text-xs text-on-surface-variant font-medium truncate mt-1" title={userName}>
            {userName}
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Painel" 
            active={activeTab === 'painel'} 
            onClick={() => setActiveTab('painel')} 
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Equipe" 
            active={activeTab === 'equipe'} 
            onClick={() => setActiveTab('equipe')} 
          />
          <NavItem 
            icon={<LineChart size={20} />} 
            label="Relatórios" 
            active={activeTab === 'relatorios'} 
            onClick={() => setActiveTab('relatorios')} 
          />
          {isGestor && (
            <NavItem 
              icon={<ShieldCheck size={20} />} 
              label="Gestão" 
              active={activeTab === 'gestao'} 
              onClick={() => setActiveTab('gestao')} 
            />
          )}
        </nav>
        <div className="mt-auto px-3 space-y-1 pt-6 border-t border-outline-variant/20">
          <NavItem icon={<HelpCircle size={20} />} label="Ajuda" />
          <NavItem onClick={handleLogout} icon={<LogOut size={20} />} label="Sair" className="!text-error" />
        </div>
      </aside>

      {/* Main Content Canvas */}
      <main className="flex-1 md:ml-64 min-h-screen flex flex-col items-stretch w-full max-w-[100vw] overflow-x-hidden">
        {/* TopAppBar */}
        <header className="w-full top-0 sticky bg-surface-container-lowest flex justify-between items-center px-4 md:px-8 py-4 z-30 border-b border-outline-variant/10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md md:ml-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
              <input 
                className="w-full bg-surface-container-low border border-outline-variant/10 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-primary transition-all text-on-surface placeholder:text-outline" 
                placeholder="Buscar chamados..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 pl-2">
            <NotificationBell userId={session?.user?.id} onViewDemand={onViewNotificationDemand} />
            <button
              onClick={toggleTheme}
              className="p-2 text-on-surface-variant hover:bg-surface-container-highest rounded-full transition-colors active:scale-95 duration-150"
              title={isDarkMode ? "Mudar para Claro" : "Mudar para Escuro"}
            >
              {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <button onClick={() => setActiveTab('perfil')} className="p-2 text-on-surface-variant hover:bg-surface-container-highest rounded-full transition-colors active:scale-95 duration-150">
              <Settings size={24} />
            </button>
            <div 
              onClick={() => setActiveTab('perfil')}
              className="h-10 w-10 rounded-full border-2 border-primary-container cursor-pointer hover:opacity-80 transition-opacity bg-primary-container text-on-primary-container flex items-center justify-center font-bold uppercase overflow-hidden relative"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userName ? userName.charAt(0) : (session?.user?.email ? session.user.email.charAt(0) : 'U')
              )}
            </div>
          </div>
        </header>

        {activeTab === 'painel' && <DashboardView onEditDemand={handleEditDemand} searchQuery={searchQuery} userName={userName} currentUserId={session?.user?.id} userPrefs={userPrefs} />}
        {activeTab === 'equipe' && <TeamView currentUser={session?.user} onEditDemand={handleEditDemand} onViewDemand={handleViewDemand} searchQuery={searchQuery} />}
        {activeTab === 'gestao' && isGestor && <ManagerDashboardView onViewDemand={handleViewDemand} />}
        {activeTab === 'perfil' && <ProfileView session={session} />}
        {activeTab === 'relatorios' && <ReportsView isGestor={isGestor} />}
        {activeTab === 'visualizar_demanda' && viewingDemand && <EditDemandView key={`view-${viewingDemand.id}`} demand={viewingDemand} onBack={() => setActiveTab('equipe')} readOnly />}
        {activeTab === 'nova_demanda' && <CreateDemandView session={session} onBack={() => setActiveTab('painel')} />}
        {activeTab === 'editar_demanda' && editingDemand && <EditDemandView key={`edit-${editingDemand.id}`} demand={editingDemand} onBack={() => setActiveTab('painel')} />}

        {/* FAB */}
        {activeTab === 'painel' && (
          <div className="fixed bottom-8 right-8 z-50">
            <button 
              onClick={() => setActiveTab('nova_demanda')}
              className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-[1.5rem] p-4 flex items-center gap-2 shadow-[0_24px_24px_-4px_rgba(0,63,108,0.2)] hover:brightness-110 hover:scale-105 active:scale-90 transition-all duration-150 group"
            >
              <Plus size={24} strokeWidth={3} />
              <span className="font-manrope font-bold pr-2 hidden sm:block">Nova Demanda</span>
            </button>
          </div>
        )}

        {/* Mobile Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md flex justify-around items-center py-3 border-t border-slate-100 z-40">
          <MobileNavItem icon={<LayoutDashboard size={20} />} label="Painel" active={activeTab==='painel'} onClick={() => setActiveTab('painel')} />
          <MobileNavItem icon={<Users size={20} />} label="Equipe" active={activeTab==='equipe'} onClick={() => setActiveTab('equipe')} />
          {isGestor && <MobileNavItem icon={<ShieldCheck size={20} />} label="Gestão" active={activeTab==='gestao'} onClick={() => setActiveTab('gestao')} />}
          <MobileNavItem icon={<LineChart size={20} />} label="Relatórios" active={activeTab==='relatorios'} onClick={() => setActiveTab('relatorios')} />
          <MobileNavItem icon={<User size={20} />} label="Perfil" active={activeTab==='perfil'} onClick={() => setActiveTab('perfil')} />
        </nav>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, className }: any) {
  if (active) {
    return (
      <a 
        onClick={onClick}
        className={cn("bg-primary text-on-primary font-bold border-r-4 border-primary-fixed/50 flex items-center gap-3 px-3 py-2 transition-all duration-200 ease-in-out font-manrope text-sm cursor-pointer shadow-sm", className)}
      >
        <div className="text-on-primary">{icon}</div>
        {label}
      </a>
    );
  }
  return (
    <a 
      onClick={onClick}
      className={cn("flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high transition-all duration-200 ease-in-out font-manrope text-sm rounded-lg cursor-pointer", className)}
    >
      <div className="text-outline">{icon}</div>
      {label}
    </a>
  );
}

function MobileNavItem({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center", active ? "text-primary font-semibold" : "text-outline")}>
      <div className={active ? "text-primary" : "text-outline"}>{icon}</div>
      <span className="text-[10px] font-manrope mt-1">{label}</span>
    </button>
  );
}
