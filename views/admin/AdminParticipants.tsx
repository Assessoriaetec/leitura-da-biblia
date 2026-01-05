import React, { useState, useEffect } from 'react';
import { IMAGES } from '../../constants';
import { supabase } from '../../services/supabaseClient';
import { readingPlanService } from '../../services/readingPlanService';

interface UserWithProgress {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  completedDays: number;
  lastReadDay: number;
  status: 'em_dia' | 'atrasado' | 'concluido';
  progressPercent: number;
  is_active: boolean; // Added for status control
}

const AdminParticipants: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<UserWithProgress[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [successMember, setSuccessMember] = useState<string | null>(null);

  // Edit/Delete State
  const [editingUser, setEditingUser] = useState<UserWithProgress | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithProgress | null>(null);

  const currentDay = readingPlanService.getCurrentDay();
  const totalDays = readingPlanService.getTotalDays();

  // --- NEW: History Modal Logic ---
  const [selectedUser, setSelectedUser] = useState<UserWithProgress | null>(null);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleOpenDetails = async (user: UserWithProgress) => {
    setSelectedUser(user);
    setLoadingHistory(true);
    setUserHistory([]);

    const { data, error } = await supabase.rpc('get_user_history', { target_user_id: user.id });

    if (error) { console.error('Error fetching history:', error); }
    else { setUserHistory(data || []); }
    setLoadingHistory(false);
  };

  const closeDetails = () => { setSelectedUser(null); setUserHistory([]); };

  const fetchProfiles = async () => {
    setLoading(true);

    // Fetch all profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .order('name');

    if (!profilesData) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    // Fetch progress using the secure RPC function
    const { data: progressData, error: rpcError } = await supabase
      .rpc('get_participants_progress');

    if (rpcError) {
      console.error('SERVER RPC ERROR:', rpcError);
    }

    // Create a map for faster lookup
    const progressMap = new Map();
    if (progressData) {
      progressData.forEach((p: any) => {
        progressMap.set(p.user_id, p);
      });
    }

    // Map progress to users
    const usersWithProgress: UserWithProgress[] = profilesData.map(profile => {
      const userStats = progressMap.get(profile.id);
      const completedDays = userStats?.completed_days || 0;
      const lastReadDay = userStats?.last_read_day || 0;

      const progressPercent = Math.round((completedDays / totalDays) * 100);

      // Determine status
      let status: 'em_dia' | 'atrasado' | 'concluido' = 'em_dia';
      if (completedDays >= totalDays) {
        status = 'concluido';
      } else if (completedDays < currentDay - 1) {
        // User is behind if they haven't completed at least yesterday's reading
        status = 'atrasado';
      }

      return {
        id: profile.id,
        name: profile.name || 'Sem nome',
        email: profile.email || '',
        avatar_url: profile.avatar_url,
        completedDays,
        lastReadDay,
        status,
        progressPercent,
        is_active: profile.is_active !== false, // Default to true if null
      };
    });

    setProfiles(usersWithProgress);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  // Calculate stats
  const stats = {
    total: profiles.length,
    active: profiles.length,
    delayed: profiles.filter(p => p.status === 'atrasado').length,
    completed: profiles.filter(p => p.status === 'concluido').length,
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Call the Edge Function
      const { data, error: functionError } = await supabase.functions.invoke('create-member', {
        body: newMember
      });

      if (functionError) {
        throw functionError;
      }

      setSuccessMember(newMember.name);
      setNewMember({ name: '', email: '', password: '' });
      fetchProfiles();
    } catch (err: any) {
      console.error('Erro detalhado:', err);
      let displayMessage = err.message || 'Erro desconhecido';

      // Advanced error extraction for Supabase Edge Functions
      if (err.context && typeof err.context.json === 'function') {
        try {
          // Clone the response if needed, but context is usually direct
          const body = await err.context.json();
          displayMessage = body.error || body.message || displayMessage;
        } catch (e) {
          try {
            const bodyText = await err.context.text();
            if (bodyText) displayMessage = bodyText;
          } catch (e2) { }
        }
      }

      alert('Erro ao criar membro: ' + displayMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Use RPC to bypass RLS and handle cascades
      const { error } = await supabase.rpc('delete_member', { target_user_id: userToDelete.id });
      if (error) throw error;

      setProfiles(prev => prev.filter(p => p.id !== userToDelete.id));
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erro ao excluir usuário. Verifique se você tem permissão ou se há dependências.');
    }
  };

  const handleUpdateStatus = async (userId: string, newStatus: boolean) => {
    try {
      // Use RPC to bypass RLS
      const { error } = await supabase.rpc('update_member_status', {
        target_user_id: userId,
        new_status: newStatus
      });

      if (error) throw error;

      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_active: newStatus } : p));

      if (editingUser && editingUser.id === userId) {
        setEditingUser({ ...editingUser, is_active: newStatus });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Erro ao atualizar status do membro.");
    }
  };



  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
        <div>
          <h1 className="text-[40px] font-black text-slate-900 dark:text-white leading-tight tracking-tight">Participantes</h1>
          <p className="text-lg text-slate-500 font-medium tracking-tight mt-1">Gerencie os membros e acompanhe o progresso individual.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex relative group">
            <span className="material-symbols-outlined absolute left-4 top-3 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
            <input className="pl-12 pr-6 py-3 border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 rounded-[20px] text-sm w-80 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 font-medium" placeholder="Buscar por nome ou email..." />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-3 bg-primary hover:bg-primary-600 text-white px-8 py-4 rounded-[20px] font-black shadow-2xl shadow-primary/30 hover:shadow-primary/40 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined !text-[20px]">person_add</span>
            NOVO MEMBRO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total de Membros', val: stats.total.toString(), color: 'text-primary', bg: 'bg-primary/5', icon: 'groups' },
          { label: 'Membros Ativos', val: stats.active.toString(), color: 'text-emerald-600', bg: 'bg-emerald-500/5', icon: 'check_circle' },
          { label: 'Com Atraso', val: stats.delayed.toString(), color: 'text-orange-600', bg: 'bg-orange-500/5', icon: 'warning' },
          { label: 'Concluídos', val: stats.completed.toString(), color: 'text-indigo-600', bg: 'bg-indigo-500/5', icon: 'emoji_events' },
        ].map((s, i) => (

          <div key={i} className="bg-white dark:bg-zinc-900 p-8 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-premium group hover:border-primary/20 transition-all duration-500">
            <div className="flex items-center justify-between mb-6">
              <div className={`p-3 rounded-2xl ${s.bg} border border-transparent group-hover:border-current/10 transition-all`}>
                <span className={`material-symbols-outlined ${s.color} !text-[24px] fill-1`}>{s.icon}</span>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.label.split(' ')[0]}</span>
            </div>
            <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{s.val}</h3>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/20 flex justify-between items-center">
          <h3 className="font-bold text-lg">Lista de Participantes</h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold border rounded-lg hover:bg-white transition-colors">
              <span className="material-symbols-outlined text-sm">filter_list</span> <span className="hidden sm:inline">Filtrar</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold border rounded-lg hover:bg-white transition-colors">
              <span className="material-symbols-outlined text-sm">download</span> <span className="hidden sm:inline">Exportar</span>
            </button>
          </div>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="block md:hidden divide-y divide-slate-50 dark:divide-zinc-800">
          {loading ? (
            <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando membros...</div>
          ) : profiles.map((p) => {
            const statusConfig = {
              em_dia: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', dot: 'bg-green-500', label: 'Em dia' },
              atrasado: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', dot: 'bg-orange-500', label: 'Atrasado' },
              concluido: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', dot: 'bg-indigo-500', label: 'Concluído' },
            };
            const sc = statusConfig[p.status];
            return (
              <div key={p.id} className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} className="size-12 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm shrink-0" alt="U" />
                    ) : (
                      <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm uppercase shrink-0">{p.name[0]}</div>
                    )}
                    <div>
                      <p className={`text-base font-bold ${!p.is_active ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{p.name}</p>
                      <p className="text-xs text-slate-400 font-bold flex items-center gap-1">
                        {p.email}
                        {!p.is_active && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[9px] uppercase">Inativo</span>}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${sc.bg} ${sc.text} ${sc.border}`}>
                    <span className={`size-1.5 rounded-full ${sc.dot}`} />
                    {sc.label}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Progresso</span>
                      <p className="text-sm font-bold text-slate-700">Dia {p.lastReadDay > 0 ? p.lastReadDay : '-'} <span className="text-slate-300 font-normal">/ {totalDays}</span></p>
                    </div>
                    <span className="text-xl font-black text-primary">{p.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full transition-all duration-1000" style={{ width: `${p.progressPercent}%` }} />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-50 dark:border-zinc-800/50">
                  <button
                    onClick={() => handleOpenDetails(p)}
                    className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    VER DETALHES
                  </button>
                  <button
                    onClick={() => { setEditingUser(p); setIsEditModalOpen(true); }}
                    className="size-8 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button
                    onClick={() => { setUserToDelete(p); setIsDeleteModalOpen(true); }}
                    className="size-8 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-zinc-800/10 border-b border-slate-100 dark:border-zinc-800">
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Participante</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Leitura Atual</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Progresso Geral</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Status</th>
                <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando membros...</td>
                </tr>
              ) : profiles.map((p, i) => {
                const statusConfig = {
                  em_dia: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-100', dot: 'bg-green-500', label: 'Em dia' },
                  atrasado: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', dot: 'bg-orange-500', label: 'Atrasado' },
                  concluido: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', dot: 'bg-indigo-500', label: 'Concluído' },
                };
                const sc = statusConfig[p.status];

                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group">
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} className="size-10 rounded-full border-2 border-white dark:border-zinc-800 shadow-sm shrink-0" alt="U" />
                        ) : (
                          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-xs uppercase shrink-0">{p.name[0]}</div>
                        )}
                        <div className="min-w-0">
                          <p className={`text-sm font-bold truncate max-w-[120px] sm:max-w-none ${!p.is_active ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{p.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-slate-400 font-bold truncate max-w-[120px] sm:max-w-none">{p.email}</p>
                            {!p.is_active && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[9px] uppercase font-black">Inativo</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                      <p className="text-sm font-bold">Dia {p.lastReadDay > 0 ? p.lastReadDay : '-'}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{p.completedDays} dias lidos</p>
                    </td>
                    <td className="py-4 px-6 min-w-[140px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black">{p.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${p.progressPercent}%` }} />
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${sc.bg} ${sc.text} ${sc.border}`}>
                        <span className={`size-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenDetails(p)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><span className="material-symbols-outlined text-lg">visibility</span></button>
                        <button onClick={() => { setEditingUser(p); setIsEditModalOpen(true); }} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><span className="material-symbols-outlined text-lg">edit</span></button>
                        <button onClick={() => { setUserToDelete(p); setIsDeleteModalOpen(true); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><span className="material-symbols-outlined text-lg">delete</span></button>
                      </div>
                    </td>
                  </tr>
                )
              })}

            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50/50 dark:bg-zinc-800/20 flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mostrando {profiles.length} de {stats.total}</p>
          <div className="flex gap-1">
            <button className="px-3 py-1 text-xs font-bold border rounded hover:bg-white disabled:opacity-50" disabled>Anterior</button>
            <button className="px-3 py-1 text-xs font-bold border rounded hover:bg-white">Próximo</button>
          </div>
        </div>
      </div>

      {/* Modal Novo Membro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] shadow-2xl w-full max-w-lg p-10 space-y-8 animate-in zoom-in-95 duration-300 border border-white/20">
            {successMember ? (
              // Success State
              <div className="text-center space-y-6 py-4">
                <div className="mx-auto size-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600 !text-[40px] fill-1">check_circle</span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">Membro Criado!</h2>
                  <p className="text-slate-500 font-medium">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{successMember}</span> foi adicionado(a) com sucesso.
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => { setSuccessMember(null); }}
                    className="flex-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-white py-4 rounded-2xl font-bold transition-all"
                  >
                    Adicionar Outro
                  </button>
                  <button
                    onClick={() => { setIsModalOpen(false); setSuccessMember(null); }}
                    className="flex-1 bg-primary hover:bg-primary-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/30 transition-all"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            ) : (
              // Form State
              <>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black tracking-tight">Novo Membro</h2>
                    <p className="text-slate-500 font-medium">Cadastre um novo leitor na célula.</p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-slate-400">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={handleCreateMember} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</label>
                    <input
                      required
                      type="text"
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 font-medium"
                      placeholder="Nome do leitor"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">E-mail</label>
                    <input
                      required
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 font-medium"
                      placeholder="leitor@email.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Senha Inicial</label>
                    <input
                      required
                      type="password"
                      value={newMember.password}
                      onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-zinc-800 border-none rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400 font-medium"
                      placeholder="••••••••"
                    />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1 italic">Informe esta senha ao membro para o primeiro acesso.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-primary hover:bg-primary-600 text-white py-5 rounded-2xl font-black text-lg shadow-2xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? (
                      <span className="material-symbols-outlined animate-spin text-2xl">refresh</span>
                    ) : (
                      'CRIAR MEMBRO'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* --- EDIT STATUS MODAL --- */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-zinc-800">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Gerenciar Membro</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="size-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center"><span className="material-symbols-outlined text-slate-500">close</span></button>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl">
              <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center font-black text-primary text-lg">
                {editingUser.name[0]}
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{editingUser.name}</p>
                <p className="text-xs font-bold text-slate-400">{editingUser.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">Status da Conta</label>
              <button
                onClick={() => handleUpdateStatus(editingUser.id, !editingUser.is_active)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${editingUser.is_active
                  ? 'border-emerald-100 bg-emerald-50 hover:bg-emerald-100'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined ${editingUser.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {editingUser.is_active ? 'check_circle' : 'block'}
                  </span>
                  <div className="text-left">
                    <p className={`font-black text-sm ${editingUser.is_active ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {editingUser.is_active ? 'ATIVO' : 'INATIVO'}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      {editingUser.is_active ? 'Membro pode acessar' : 'Acesso bloqueado'}
                    </p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${editingUser.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`size-4 bg-white rounded-full shadow-sm transition-transform ${editingUser.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>

            <button onClick={() => setIsEditModalOpen(false)} className="w-full py-4 bg-primary text-white font-black rounded-xl hover:bg-primary-600 transition-colors">
              CONCLUIR
            </button>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-red-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] shadow-2xl p-8 text-center space-y-6 animate-in zoom-in-95 duration-200 border-2 border-red-100 dark:border-red-900/30">
            <div className="size-20 rounded-full bg-red-50 mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-red-500">delete_forever</span>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Excluir Membro?</h3>
              <p className="text-sm font-medium text-slate-500">
                Tem certeza que deseja excluir <strong>{userToDelete.name}</strong>?
              </p>
              <p className="text-xs text-red-400 font-bold mt-2 uppercase bg-red-50 dark:bg-red-900/20 py-2 rounded-lg">
                Ação Irreversível
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">CANCELAR</button>
              <button onClick={handleDeleteUser} className="flex-1 py-3 font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors">SIM, EXCLUIR</button>
            </div>
          </div>
        </div>
      )}

      {/* --- DETAILS MODAL --- */}
      {selectedUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeDetails}></div>
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl relative z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-50 dark:border-zinc-800 flex justify-between items-center">
              <div className="flex items-center gap-4">
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} className="size-12 rounded-full border-2 border-slate-100" />
                ) : (
                  <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary">{selectedUser.name[0]}</div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedUser.name}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Histórico de Leitura</p>
                </div>
              </div>
              <button onClick={closeDetails} className="size-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex justify-between items-center mb-6">
                <div className="text-center flex-1 border-r border-slate-100">
                  <span className="block text-2xl font-black text-slate-900">{selectedUser.completedDays}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dias Lidos</span>
                </div>
                <div className="text-center flex-1">
                  <span className="block text-2xl font-black text-primary">{selectedUser.progressPercent}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Concluído</span>
                </div>
              </div>

              <h4 className="text-sm font-bold text-slate-900 mb-4">Dias Concluídos</h4>
              {loadingHistory ? (
                <div className="py-8 text-center"><span className="material-symbols-outlined animate-spin text-slate-400">progress_activity</span></div>
              ) : userHistory.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {userHistory.map((h, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-green-50 border border-green-100 flex flex-col items-center justify-center text-green-700">
                      <span className="text-xs font-black">DIA</span>
                      <span className="text-lg font-bold">{h.day_number}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium text-sm">Nenhum dia concluído ainda.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-50 dark:border-zinc-800 bg-slate-50/50 rounded-b-3xl">
              <button
                onClick={closeDetails}
                className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
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

export default AdminParticipants;
