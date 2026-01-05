
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-zinc-950">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-10 sm:p-14">
          <div className="flex flex-col items-center text-center mb-12">
            <div className="p-4 bg-primary-light dark:bg-primary/10 rounded-3xl mb-6 ring-8 ring-primary-light/30 dark:ring-primary/5">
              <span className="material-symbols-outlined text-primary text-5xl font-black">menu_book</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">
              Plano de Leitura<br/>
              <span className="text-primary tracking-tight">Raiz de Davi</span>
            </h1>
            <p className="text-slate-500 mt-4 text-sm font-medium">Bem-vindo de volta! Acesse sua conta para acompanhar seu progresso.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">E-mail ou Usuário</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors">person</span>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400" 
                  placeholder="Ex: joao.davi" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors">lock</span>
                <input 
                  type="password" 
                  className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary-dark text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-red-200 dark:shadow-none transition-all active:scale-[0.98] mt-4"
            >
              Entrar na Conta
            </button>
          </form>
        </div>
        <div className="bg-slate-50 dark:bg-zinc-800/50 px-10 py-6 border-t border-slate-100 dark:border-zinc-800 text-center">
          <p className="text-xs text-slate-400 font-bold uppercase leading-relaxed tracking-wider">
            Esqueceu sua senha? <br/>
            <span className="text-primary hover:underline cursor-pointer">Contate o administrador</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
