import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const AuthView: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (signInError) throw signInError;
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Erro inesperado. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-[40px] shadow-premium p-10 space-y-8 border border-slate-100 dark:border-zinc-800 animate-in zoom-in-95 duration-500">
                <div className="text-center space-y-2">
                    <div className="relative mb-6 size-24 rounded-full overflow-hidden bg-white dark:bg-zinc-800 shadow-sm border border-slate-100 dark:border-zinc-700 mx-auto">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-105" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        Acesso Restrito
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Membros da Célula Raiz de Davi
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl text-red-600 dark:text-red-400 text-sm font-bold animate-in shake duration-300">
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">E-mail</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
                            placeholder="seu@email.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Senha</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary-600 text-white py-5 rounded-2xl font-black text-lg shadow-2xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? (
                            <span className="material-symbols-outlined animate-spin">refresh</span>
                        ) : (
                            'ENTRAR AGORA'
                        )}
                    </button>
                </form>

                <div className="text-center">
                    <p className="text-xs font-bold text-slate-400">
                        A criação de novos membros é gerenciada pelo administrador.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthView;
