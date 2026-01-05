import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { officialPlan } from '../../services/officialPlanData';

const AdminPlan: React.FC = () => {
    // --- ESTADO ---
    const [loading, setLoading] = useState(true);
    const [planDays, setPlanDays] = useState<any[]>([]);
    const [initializing, setInitializing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    // Confirmação interna (evita alert/confirm que podem dar erro em alguns navegadores)
    const [showConfirm, setShowConfirm] = useState(false);

    // Diagnóstico
    const [timer, setTimer] = useState(0);
    const [clickCount, setClickCount] = useState(0);

    // --- UTILITÁRIOS ---
    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
    };

    // --- AÇÕES ---
    const fetchPlan = async () => {
        setLoading(true);
        addLog('Buscando dados no Supabase...');
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const email = sessionData.session?.user?.email || 'NÃO LOGADO';
            setUserEmail(email);

            const { data, error, status } = await supabase
                .from('reading_plan')
                .select('*')
                .order('day_number');

            if (error) {
                addLog(`ERRO (Status ${status}): ${error.message}`);
                return;
            }
            addLog(`Sucesso! ${data?.length || 0} dias no banco.`);
            if (data) setPlanDays(data);
        } catch (err: any) {
            addLog(`Falha no fetch: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleInitializePlan = async () => {
        setInitializing(true);
        setShowConfirm(false);
        setLogs(['--- INICIANDO GERAÇÃO AUTOMÁTICA ---']);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.email) throw new Error('Sessão expirada.');

            addLog(`Admin Logado: ${session.user.email}`);

            const fullPlan = officialPlan.map(day => ({
                day_number: day.day,
                passage: day.passage,
                theme: day.theme,
                category: day.category,
                book: day.book,
                estimated_time: day.estimatedTime
            }));

            const batchSize = 30;
            const totalBatches = Math.ceil(fullPlan.length / batchSize);

            for (let i = 0; i < fullPlan.length; i += batchSize) {
                const batchNum = Math.floor(i / batchSize) + 1;
                addLog(`Processando Lote ${batchNum}/${totalBatches}...`);

                const batch = fullPlan.slice(i, i + batchSize);
                const { error } = await supabase
                    .from('reading_plan')
                    .upsert(batch, { onConflict: 'day_number' });

                if (error) {
                    addLog(`!!! ERRO LOTE ${batchNum}: ${error.message}`);
                    throw error;
                }
            }

            addLog('--- SUCESSO! PLANO GERADO ---');
            await fetchPlan();
        } catch (err: any) {
            addLog(`FALHA: ${err.message}`);
        } finally {
            setInitializing(false);
        }
    };

    const handleClearPlan = async () => {
        setInitializing(true);
        addLog('Limpando tabela...');
        try {
            const { error } = await supabase.from('reading_plan').delete().gt('day_number', 0);
            if (error) throw error;
            addLog('Limpeza concluída.');
            setPlanDays([]);
        } catch (err: any) {
            addLog(`Erro ao limpar: ${err.message}`);
        } finally {
            setInitializing(false);
        }
    };

    // --- EFEITOS ---
    useEffect(() => {
        fetchPlan();
        const interval = setInterval(() => setTimer(t => t + 1), 1000);
        const handleGlobalClick = () => setClickCount(c => c + 1);
        window.addEventListener('click', handleGlobalClick);
        return () => {
            clearInterval(interval);
            window.removeEventListener('click', handleGlobalClick);
        };
    }, []);

    // --- RENDER ---
    return (
        <div className="space-y-8 p-6 pb-32">
            <header className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 leading-tight">Painel de Controle do Plano</h1>
                    <div className="mt-2 flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                            <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>
                            Live: {timer}s
                        </span>
                        <div className="w-px h-3 bg-slate-200"></div>
                        <span className="text-[10px] font-black uppercase text-slate-400">Cliques: {clickCount}</span>
                        <div className="w-px h-3 bg-slate-200"></div>
                        <span className="text-[10px] font-black uppercase text-primary">{userEmail}</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleClearPlan}
                        disabled={initializing}
                        className="px-6 py-3 border-2 border-red-100 text-red-500 rounded-2xl font-bold hover:bg-red-50 transition-all disabled:opacity-50"
                    >
                        LIMPAR
                    </button>
                    {!showConfirm ? (
                        <button
                            onClick={() => setShowConfirm(true)}
                            disabled={initializing}
                            className="px-8 py-3 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {initializing ? 'PROCESSANDO...' : 'GERAR PLANO'}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl shadow-xl">
                            <span className="text-white text-xs font-bold px-3">Confirmar?</span>
                            <button
                                onClick={handleInitializePlan}
                                className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-600 transition-colors"
                            >
                                SIM
                            </button>
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="bg-slate-700 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-slate-600 transition-colors"
                            >
                                NÃO
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Console de Logs Estilizado */}
            <div className="bg-[#0f172a] rounded-[32px] p-6 shadow-2xl border border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-emerald-500"></div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-emerald-400">
                        <span className="material-symbols-outlined text-sm">terminal</span>
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">System Output</h3>
                    </div>
                </div>
                <div className="h-48 overflow-y-auto font-mono text-xs space-y-2 custom-scrollbar pr-2">
                    {logs.map((log, i) => (
                        <div key={i} className={`flex gap-3 ${log.includes('!!!') || log.includes('FALHA') ? 'text-red-400' : 'text-emerald-400/80'}`}>
                            <span className="text-slate-600 select-none">›</span>
                            <span>{log}</span>
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-slate-600 italic">Aguardando interação do usuário...</div>}
                </div>
            </div>

            {/* Tabela de Dados */}
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
                <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    Histórico do Banco
                    <span className="bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-full font-bold">
                        {planDays.length}/365
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">(Exibindo todos os dias)</span>
                </h2>

                <div className="overflow-x-auto rounded-3xl border border-slate-50">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Dia</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Passagem</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tema</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Livro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {planDays.length > 0 ? planDays.slice(0, 365).map(day => (
                                <tr key={day.day_number} className="hover:bg-slate-50/30 transition-colors">
                                    <td className="p-4 font-black text-primary">#{day.day_number}</td>
                                    <td className="p-4 font-bold text-slate-700">{day.passage}</td>
                                    <td className="p-4 text-sm text-slate-500 font-medium">{day.theme}</td>
                                    <td className="p-4 text-sm font-bold text-slate-300 italic">{day.book}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="material-symbols-outlined text-4xl text-slate-200 animate-bounce">database</span>
                                            <span className="text-slate-300 font-black uppercase text-[10px] tracking-widest">
                                                {loading ? 'Sincronizando...' : 'Banco de Dados Vazio'}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* BOTÃO DE EMERGÊNCIA (BOLT) */}
            <div className="fixed bottom-8 right-8 z-[10000]">
                <button
                    onClick={handleInitializePlan}
                    className="bg-primary hover:bg-primary-600 text-white size-16 rounded-full shadow-[0_20px_50px_rgba(var(--primary-rgb),0.3)] flex items-center justify-center hover:scale-110 active:scale-90 transition-all border-4 border-white"
                >
                    <span className="material-symbols-outlined text-3xl">bolt</span>
                </button>
            </div>
        </div>
    );
};

export default AdminPlan;
