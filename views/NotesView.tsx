import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { readingPlanService } from '../services/readingPlanService';

interface UserNote {
    day_number: number;
    notes: string;
    passage?: string;
    theme?: string;
    updated_at: string;
}

const NotesView: React.FC = () => {
    const [notes, setNotes] = useState<UserNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNote, setSelectedNote] = useState<UserNote | null>(null);

    useEffect(() => {
        const fetchNotes = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();

            if (session?.user) {
                // Busca progressos que tenham notas
                const { data, error } = await supabase
                    .from('reading_progress')
                    .select('day_number, notes, updated_at')
                    .eq('user_id', session.user.id)
                    .not('notes', 'is', null)
                    .neq('notes', '')
                    .order('day_number', { ascending: false });

                if (!error && data) {
                    await readingPlanService.ensureSynced();

                    const notesWithPlan = data.map(n => {
                        const plan = readingPlanService.getPlanForDay(n.day_number);
                        return {
                            ...n,
                            passage: plan?.passage,
                            theme: plan?.theme
                        };
                    });

                    setNotes(notesWithPlan);
                }
            }
            setLoading(false);
        };

        fetchNotes();
    }, []);

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin size-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Carregando suas anotações...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Minhas Anotações</h1>
                    <p className="text-slate-500 font-medium">Todas as suas reflexões diárias em um só lugar.</p>
                </div>
                <div className="bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20">
                    <span className="text-primary font-black text-sm">{notes.length} Notas</span>
                </div>
            </header>

            {notes.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-[40px] p-20 border border-slate-100 dark:border-zinc-800 shadow-sm text-center space-y-4">
                    <div className="size-20 bg-slate-50 dark:bg-zinc-800 text-slate-300 dark:text-zinc-600 rounded-3xl flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-4xl">edit_off</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nenhuma anotação encontrada</h3>
                        <p className="text-slate-500 dark:text-slate-400">Comece a escrever seus aprendizados na tela de leitura diária.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {notes.map((note) => (
                        <div
                            key={note.day_number}
                            onClick={() => setSelectedNote(note)}
                            className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-slate-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all cursor-pointer group flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-3 py-1 rounded-full">Dia {note.day_number}</span>
                                <span className="text-[10px] font-bold text-slate-400">
                                    {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : 'Recentemente'}
                                </span>
                            </div>

                            <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors mb-1">{note.passage}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-4">{note.theme}</p>

                            <div className="flex-1">
                                <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-4 italic leading-relaxed">
                                    "{note.notes}"
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-50 dark:border-zinc-800 flex justify-end">
                                <span className="text-[10px] font-black text-primary uppercase flex items-center gap-1 group-hover:gap-2 transition-all">
                                    Ver completa
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Visualização */}
            {selectedNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-zinc-800">
                        <div className="p-8 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-start bg-slate-50/50 dark:bg-zinc-800/50">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-lg">Dia {selectedNote.day_number}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{selectedNote.theme}</span>
                                </div>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-none">{selectedNote.passage}</h2>
                            </div>
                            <button
                                onClick={() => setSelectedNote(null)}
                                className="size-10 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors text-slate-400"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1">
                            <div className="bg-white dark:bg-zinc-900/50 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800">
                                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg whitespace-pre-wrap">
                                    {selectedNote.notes}
                                </p>
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                {selectedNote.updated_at ? `Salvo em ${new Date(selectedNote.updated_at).toLocaleString()}` : 'Salvo recentemente'}
                            </span>
                            <button
                                onClick={() => setSelectedNote(null)}
                                className="bg-primary text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                            >
                                FECHAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotesView;
