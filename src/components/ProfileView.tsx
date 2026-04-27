import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, Edit2, HardHat, Factory, LayoutDashboard, CheckSquare, Lock, User, Loader2 } from 'lucide-react';
import { useDemands } from '../hooks/useDemands';

export default function ProfileView({ session }: { session: any }) {
  const { demands } = useDemands();
  
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState(session?.user?.user_metadata?.full_name || '');
  const [role, setRole] = useState(session?.user?.user_metadata?.role || 'Não informado');
  const [about, setAbout] = useState(session?.user?.user_metadata?.about || 'Insira informações');
  const [avatarUrl, setAvatarUrl] = useState(session?.user?.user_metadata?.avatar_url || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Settings edit state
  const [isEditingName, setIsEditingName] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  // Derived stats
  const activeDemands = demands.filter(d => d.status !== 'concluido').length;
  const completedTickets = demands.filter(d => d.type === 'ticket' && d.status === 'concluido').length;
  const totalProjects = demands.filter(d => d.type === 'project').length;
  const totalDeliveries = demands.filter(d => d.status === 'concluido').length;

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          role,
          about,
          avatar_url: avatarUrl,
        }
      });
      if (error) throw error;
      setIsEditingInfo(false);
      setIsEditingName(false);
      alert('Perfil atualizado com sucesso!');
    } catch (error: any) {
      alert('Erro ao atualizar perfil: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploadingAvatar(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('Você deve selecionar uma imagem para fazer o upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setAvatarUrl(data.publicUrl);
      
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: data.publicUrl
        }
      });

      if (updateError) throw updateError;
      
      alert('Foto de perfil atualizada com sucesso!');
    } catch (error: any) {
      alert('Erro ao fazer upload da foto: ' + error.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setIsEditingPassword(false);
      alert('Senha atualizada com sucesso!');
    } catch (error: any) {
      alert('Erro ao atualizar senha: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 w-full pb-24 md:pb-8">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary">
              <HardHat size={20} />
            </div>
            <div>
              <h1 className="font-headline font-extrabold text-primary leading-tight">WEG Synergy</h1>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Painel de Controle</p>
            </div>
          </div>
          <h2 className="font-headline text-3xl font-extrabold text-primary tracking-tight">Meu Perfil</h2>
          <p className="text-on-surface-variant text-sm mt-1">Gerencie suas informações e preferências do sistema WEG Synergy.</p>
        </div>
          <div className="flex gap-3">
          <button 
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-sm shadow-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            {isSaving && <Loader2 size={16} className="animate-spin" />}
            Salvar Alterações
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Profile Hero Card */}
        <section className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl p-8 shadow-sm flex flex-col md:flex-row gap-8 items-start md:items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
          <div className="relative group shrink-0">
            <div className="w-32 h-32 rounded-full border-4 border-surface-container-low shadow-md bg-primary-container text-on-primary-container flex items-center justify-center text-5xl font-bold uppercase overflow-hidden relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                fullName ? fullName.charAt(0) : (session?.user?.email ? session.user.email.charAt(0) : 'U')
              )}
            </div>
            
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={uploadAvatar} 
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-1 right-1 bg-primary-container text-on-primary-container p-2 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center disabled:opacity-50"
            >
              {isUploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Edit2 size={14} />}
            </button>
          </div>
          
          <div className="flex-1 w-full">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h3 className="font-headline text-2xl font-bold text-primary">{fullName || 'Usuário'}</h3>
              <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-[10px] font-bold uppercase tracking-wider">Verificado</span>
            </div>
            
            {isEditingInfo ? (
              <div className="space-y-3 mt-4">
                 <input 
                  type="text" 
                  value={role} 
                  onChange={e => setRole(e.target.value)} 
                  className="w-full text-sm p-2 border border-outline-variant/30 rounded-md focus:ring-1 focus:ring-primary"
                  placeholder="Seu Cargo"
                />
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-on-surface-variant font-medium flex items-center gap-2">
                  <HardHat size={18} />
                  {role}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex gap-4 self-start md:self-center md:border-l border-surface-container-high md:pl-8 mt-4 md:mt-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{totalProjects}</p>
              <p className="text-[10px] text-on-surface-variant uppercase font-bold">Projetos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{totalDeliveries}</p>
              <p className="text-[10px] text-on-surface-variant uppercase font-bold">Entregas</p>
            </div>
          </div>
        </section>

        {/* Quick Stats Card */}
        <section className="col-span-12 lg:col-span-4 bg-gradient-to-br from-primary to-primary-container rounded-xl p-6 text-on-primary flex flex-col justify-center shadow-xl">
          <div>
            <h4 className="font-headline font-bold text-lg mb-4">Estatísticas de Atividade</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <LayoutDashboard size={20} />
                  <span className="text-sm font-medium">Demandas Ativas</span>
                </div>
                <span className="text-xl font-bold">{activeDemands.toString().padStart(2, '0')}</span>
              </div>
              <div className="flex justify-between items-center bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <CheckSquare size={20} />
                  <span className="text-sm font-medium">Tickets Concluídos</span>
                </div>
                <span className="text-xl font-bold">{completedTickets.toString().padStart(2, '0')}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Personal Info Section */}
        <section className="col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-headline font-bold text-lg text-primary">Informações Pessoais</h4>
            <button 
              onClick={() => setIsEditingInfo(!isEditingInfo)}
              className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
            >
              <Edit2 size={14} /> {isEditingInfo ? 'Cancelar' : 'Editar'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
            <div className="space-y-1">
              <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Email Corporativo</label>
              <p className="text-on-surface font-medium">{session?.user?.email}</p>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-surface-container-low">
            <label className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block mb-2">Sobre / Especialidades</label>
            {isEditingInfo ? (
              <textarea 
                value={about}
                onChange={e => setAbout(e.target.value)}
                rows={3}
                className="w-full text-sm p-3 border border-outline-variant/30 rounded-md focus:ring-1 focus:ring-primary"
                placeholder="Descreva suas especialidades..."
              />
            ) : (
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {about}
              </p>
            )}
          </div>
        </section>

        {/* Account Settings Section */}
        <section className="col-span-12 lg:col-span-5 bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-transparent">
          <h4 className="font-headline font-bold text-lg text-primary mb-6">Configurações da Conta</h4>
          <div className="space-y-4">
            
            <div className="flex flex-col gap-2 p-4 bg-surface-container rounded-lg transition-colors">
              <div 
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => setIsEditingName(!isEditingName)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm shrink-0 border border-outline-variant/10">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Alterar Nome de Usuário</p>
                    <p className="text-xs text-on-surface-variant">{fullName || 'Não definido'}</p>
                  </div>
                </div>
                <Edit2 size={16} className="text-on-surface-variant group-hover:text-primary transition-colors" />
              </div>
              
              {isEditingName && (
                <div className="mt-3 pt-3 border-t border-outline-variant/10 flex gap-2">
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    className="flex-1 text-sm p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-md focus:ring-1 focus:ring-primary text-on-surface"
                    placeholder="Seu nome completo"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 p-4 bg-surface-container rounded-lg transition-colors">
              <div 
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => setIsEditingPassword(!isEditingPassword)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm shrink-0 border border-outline-variant/10">
                    <Lock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">Alterar Senha</p>
                    <p className="text-xs text-on-surface-variant">Clique para alterar</p>
                  </div>
                </div>
                <Edit2 size={16} className="text-on-surface-variant group-hover:text-primary transition-colors" />
              </div>
              
              {isEditingPassword && (
                <div className="mt-3 pt-3 border-t border-outline-variant/10 flex flex-col gap-3">
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    className="w-full text-sm p-3 bg-surface-container-lowest border border-outline-variant/30 rounded-md focus:ring-1 focus:ring-primary text-on-surface"
                    placeholder="Nova senha (min. 6 caracteres)"
                  />
                  <button 
                    onClick={handleUpdatePassword}
                    disabled={isSaving}
                    className="bg-primary text-on-primary py-3 rounded-md text-sm font-bold flex justify-center items-center gap-2 hover:brightness-110 active:scale-95 transition-all"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Atualizar Senha'}
                  </button>
                </div>
              )}
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}
