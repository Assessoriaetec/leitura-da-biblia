import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { UserRole } from './types';
import AuthView from './views/AuthView';
import Dashboard from './views/Dashboard';
import ReadingView from './views/ReadingView';
import Community from './views/Community';
import NotesView from './views/NotesView';
import AdminParticipants from './views/admin/AdminParticipants';
import AdminPlan from './views/admin/AdminPlan';
import { supabase } from './services/supabaseClient';
import { ThemeProvider } from './contexts/ThemeContext';

// Settings page with real data
const Settings = () => {
  const [profile, setProfile] = React.useState<any>(null);
  const [session, setSession] = React.useState<any>(null);
  const [name, setName] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (data) {
          setProfile(data);
          setName(data.name || '');
        }
      }
    };
    init();
  }, []);

  const handleSave = async () => {
    if (!session?.user) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', session.user.id);

    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      alert('Perfil atualizado com sucesso!');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      <h1 className="text-3xl font-black">Configurações</h1>
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="size-20 rounded-full object-cover" alt="Avatar" />
          ) : (
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary text-2xl">
              {name ? name[0].toUpperCase() : 'U'}
            </div>
          )}
          <button className="text-primary font-bold hover:underline">Alterar Foto</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
            <input
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
            <input
              className="w-full border border-slate-200 dark:border-zinc-700 rounded-xl px-4 py-3 bg-slate-50 dark:bg-zinc-800/50 text-slate-500 dark:text-slate-400"
              value={profile?.email || session?.user?.email || ''}
              disabled
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-600 transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State for Access Denied Modal
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);

  const checkUserStatus = async (currentSession: any) => {
    if (!currentSession?.user) {
      setSession(null);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking status:", error);
        setAccessDeniedError('Erro ao verificar status da conta. Tente novamente.');
        setSession(null);
        // Do not await signOut to prevent blocking UI
        supabase.auth.signOut();
        return;
      }

      // Check if deleted (no profile) or Inactive
      if (!profile || profile.is_active === false) {
        console.log("Access denied: " + (profile ? "Inactive" : "No Profile"));
        setAccessDeniedError('Sua conta está inativa ou excluída. Contate o administrador.');
        setSession(null);
        // Do not await signOut to prevent blocking UI
        supabase.auth.signOut();
        return;
      }

      // Allowed
      setSession(currentSession);
    } catch (err) {
      console.error("Unexpected error:", err);
      setAccessDeniedError('Erro inesperado de autenticação.');
      setSession(null);
      supabase.auth.signOut();
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initial check
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        setSession(session);
        setLoading(false); // OPTIMISTIC: Unblock UI immediately for better UX

        if (session) {
          // Check status in background
          checkUserStatus(session);
        }
      }
    };
    initSession();

    // Listener for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setLoading(false);

        if (newSession) {
          await checkUserStatus(newSession);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-4xl">auto_stories</span>
          </div>
          <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Carregando...</p>
        </div>
      </div>
    );
  }

  const isAdmin = session?.user?.email === 'samuel.bfaro@gmail.com';
  const userRole = isAdmin ? UserRole.ADMIN : UserRole.USER;

  return (
    <ThemeProvider>
      <Router>
        {/* Access Denied Modal Overlay */}
        {accessDeniedError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-red-100 dark:border-red-900/30 relative animate-in fade-in zoom-in duration-200">

              <div className="flex flex-col items-center text-center gap-4">
                <div className="size-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-3xl text-red-500">block</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">Acesso Negado</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                    {accessDeniedError}
                  </p>
                </div>

                <button
                  onClick={() => setAccessDeniedError(null)}
                  className="w-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all text-white font-bold py-3 px-6 rounded-xl mt-4 shadow-lg shadow-red-500/20"
                >
                  Entendido
                </button>
              </div>

            </div>
          </div>
        )}

        <Routes>
          <Route
            path="/login"
            element={!session ? <AuthView /> : <Navigate to="/dashboard" replace />}
          />

          <Route
            path="/*"
            element={
              session ? (
                <Layout userRole={userRole}>
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="reading" element={<ReadingView />} />
                    <Route path="community" element={<Community />} />
                    <Route path="notes" element={<NotesView />} />
                    <Route path="settings" element={<Settings />} />

                    {/* Admin Routes */}
                    <Route path="admin" element={<Navigate to="/admin/participants" replace />} />
                    <Route path="admin/participants" element={<AdminParticipants />} />
                    <Route path="admin/plan" element={<AdminPlan />} />
                    <Route path="admin/reports" element={<div className="p-8"><h1 className="text-3xl font-black">Relatórios (Em breve)</h1></div>} />
                    <Route path="admin/settings" element={<div className="p-8"><h1 className="text-3xl font-black">Admin Config (Em breve)</h1></div>} />

                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
