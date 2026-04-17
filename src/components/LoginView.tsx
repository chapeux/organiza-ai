import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function LoginView({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            }
          }
        });
        if (error) throw error;
        alert('Cadastro realizado! Por favor, faça login.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Erro de autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-surface font-body text-on-surface">
      <section className="hidden md:flex md:w-1/2 lg:w-3/5 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 z-0">
          <img 
            alt="Indústria Inteligente" 
            className="w-full h-full object-cover opacity-30" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuANRvERpA-gDokX5ACJgTj4RT5xsurFkpsegTNeYtgw3yIJQf6Cr3Xw2mTfvuc7_3_6yk2PfQCgIBISqprGLJh4HcjCPNNyyvStBb3FmNPG9bLtQ-2X-MKWaD7NClBhzXm2GfBOi-S29AMHiFWTJvJ3RLuHbwC8f6EmVs8oHN201s7WhRZPfkklvMacrA2KDnShbir3BZA4JnKRFIzmaxhP4u9HXOTSjbS2fUZZKbZKBFUEjk0kUTgN-DyOtnyBrvuAG_TMju5jtsk"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-tr from-[#002f54] via-[#003f6c]/80 to-transparent z-10"></div>
        <div className="relative z-20 flex flex-col justify-center p-16 w-full h-full">
          <div className="max-w-xl">
            <h1 className="font-headline text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight mb-8">
              Organize suas tarefas com maestria.
            </h1>
            <p className="text-blue-100 text-xl font-medium leading-relaxed opacity-90 max-w-lg">
              O WEG Synergy simplifica sua gestão de atividades. Uma abordagem limpa e profissional para manter seu foco no que realmente importa.
            </p>
          </div>
        </div>
      </section>

      <section className="w-full md:w-1/2 lg:w-2/5 flex items-center justify-center p-8 bg-surface-container-lowest">
        <div className="w-full max-w-md flex flex-col">
          <div className="mb-12 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-lg shadow-md">
                <span className="material-symbols-outlined text-white font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
              </div>
              <span className="font-headline font-extrabold text-2xl text-primary tracking-tighter">WEG Synergy</span>
            </div>
            <p className="text-on-surface-variant text-sm mt-4 font-medium">
              {isSignUp ? 'Crie sua conta para começar a organizar sua planta.' : 'Acesse sua agenda de trabalho e painel de tarefas corporativas.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold text-center border border-red-100">
                {error}
              </div>
            )}

            {isSignUp && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-on-surface px-1" htmlFor="fullName">Nome Completo</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-outline text-xl">person</span>
                  <input 
                    className="w-full bg-surface-container-low border-0 rounded-lg py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary text-on-surface placeholder:text-outline transition-all duration-200" 
                    id="fullName" 
                    name="fullName" 
                    placeholder="João da Silva" 
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-on-surface px-1" htmlFor="email">E-mail Corporativo</label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-outline text-xl">alternate_email</span>
                <input 
                  className="w-full bg-surface-container-low border-0 rounded-lg py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary text-on-surface placeholder:text-outline transition-all duration-200" 
                  id="email" 
                  name="email" 
                  placeholder="nome@weg.com" 
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-sm font-bold text-on-surface" htmlFor="password">Senha</label>
                {!isSignUp && <a className="text-xs font-bold text-primary hover:text-primary-container transition-colors" href="#">Esqueceu a senha?</a>}
              </div>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-outline text-xl">lock</span>
                <input 
                  className="w-full bg-surface-container-low border-0 rounded-lg py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary text-on-surface placeholder:text-outline transition-all duration-200" 
                  id="password" 
                  name="password" 
                  placeholder="••••••••" 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center gap-3 px-1">
                <input className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary bg-surface-container-low" id="remember" name="remember" type="checkbox" />
                <label className="text-sm text-on-surface-variant font-semibold select-none" htmlFor="remember">Manter conectado neste dispositivo</label>
              </div>
            )}

            <button 
              className="w-full bg-primary text-white font-headline font-bold py-4 rounded-xl shadow-[0_8px_16px_-4px_rgba(0,63,108,0.3)] hover:brightness-110 active:scale-[0.98] transition-all duration-200 text-lg mt-4 flex justify-center items-center gap-2 disabled:opacity-70" 
              type="submit"
              disabled={loading}
            >
              {loading && <Loader2 size={20} className="animate-spin" />}
              {isSignUp ? 'Criar Conta' : 'Entrar no Dashboard'}
            </button>

            <div className="text-center mt-2">
              <button 
                type="button" 
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm font-bold text-primary hover:underline transition-all"
              >
                {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem conta? Criar uma'}
              </button>
            </div>
          </form>

          <div className="mt-auto pt-16 pb-4 md:mt-24 text-center">
            <p className="text-[10px] uppercase tracking-widest text-outline font-bold">
              © 2024 WEG S.A. Todos os direitos reservados.
            </p>
            <div className="flex justify-center gap-4 mt-4">
              <a className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors" href="#">Termos de Uso</a>
              <span className="text-outline-variant opacity-50">•</span>
              <a className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors" href="#">Privacidade</a>
              <span className="text-outline-variant opacity-50">•</span>
              <a className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors" href="#">Suporte</a>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed bottom-6 right-6 z-50">
        <button className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant/30 shadow-lg px-5 py-3 rounded-full hover:bg-surface-container-low transition-all group">
          <span className="material-symbols-outlined text-primary group-hover:rotate-12 transition-transform">help</span>
          <span className="text-sm font-bold text-on-surface-variant group-hover:text-primary transition-colors">Suporte Técnico</span>
        </button>
      </div>
    </main>
  );
}
