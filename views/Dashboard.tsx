import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_USER, IMAGES } from '../constants';
import { readingPlanService } from '../services/readingPlanService';
import { supabase } from '../services/supabaseClient';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const currentDay = readingPlanService.getCurrentDay();
  const todayPlan = readingPlanService.getPlanForDay(currentDay);

  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [completedDays, setCompletedDays] = useState(0);
  const [topReaders, setTopReaders] = useState<{ name: string, days: number }[]>([]);
  const [weeklyProgress, setWeeklyProgress] = useState<boolean[]>(new Array(7).fill(false));
  const totalDays = readingPlanService.getTotalDays();

  const getWeekRange = () => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday

    // Start of week (Sunday)
    const start = new Date(today);
    start.setDate(today.getDate() - day);
    start.setHours(0, 0, 0, 0);

    // End of week (Saturday)
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      // Aguarda sincronização do plano
      await readingPlanService.ensureSynced();

      if (session?.user) {
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        setProfile(profileData);

        // Fetch progress for this user (Total count)
        const { count, error } = await supabase
          .from('reading_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .eq('is_read', true);

        if (!error && count !== null) {
          setCompletedDays(count);
        }

        // Fetch progress for this week
        const { start, end } = getWeekRange();
        const { data: weekData } = await supabase
          .from('reading_progress')
          .select('read_at')
          .eq('user_id', session.user.id)
          .eq('is_read', true)
          .gte('read_at', start.toISOString())
          .lte('read_at', end.toISOString());

        if (weekData) {
          const newWeeklyProgress = new Array(7).fill(false);
          weekData.forEach(record => {
            if (record.read_at) {
              const date = new Date(record.read_at);
              // Adjust for timezone offset if necessary, but usually UTC from DB to local Date works for getDay if stored correctly.
              // Just simply using getDay() on the Date object created from ISO string
              const dayIndex = date.getDay(); // 0-6 (Sun-Sat)
              newWeeklyProgress[dayIndex] = true;
            }
          });
          setWeeklyProgress(newWeeklyProgress);
        }
      }

      // Fetch top readers via secure RPC function
      const { data: leaderboard, error } = await supabase.rpc('get_leaderboard');

      if (!error && leaderboard) {
        setTopReaders(leaderboard.map((l: any) => ({
          name: l.name || 'Sem nome', // Fallback for name
          days: l.days_count
        })));
      } else {
        console.warn("Failed to fetch leaderboard (RPC function might be missing)", error);
      }
    };
    init();
  }, []);

  const nextBooks = readingPlanService.getNextBooks(completedDays);

  const progressPercent = Math.round((completedDays / totalDays) * 100);
  const userName = profile?.name || session?.user?.user_metadata?.full_name || 'Guerreiro';

  // Calculate completed readings this week for display
  const weeklyCompletedCount = weeklyProgress.filter(Boolean).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
          Bom dia, <span className="text-primary">{userName}</span>!
        </h1>
        <p className="text-lg text-slate-500 font-medium tracking-tight">Hoje é dia de avançar no conhecimento. Vamos para a leitura de hoje?</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Prayer Reminder Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-[28px] p-6 md:p-8 border-2 border-primary/20 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
              <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-3xl text-primary">volunteer_activism</span>
              </div>
              <div className="text-center md:text-left space-y-2">
                <h3 className="font-black text-xl tracking-tight text-slate-900 dark:text-white">Prepare seu coração</h3>
                <p className="text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-lg">
                  Antes de iniciar a leitura, ore e peça a Deus sabedoria e entendimento para que a Palavra transforme sua vida hoje.
                </p>
              </div>
            </div>
          </div>

          {/* Daily Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] shadow-premium border border-slate-100 dark:border-zinc-800 overflow-hidden group/card hover:border-primary/20 transition-all duration-500">
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-8 py-5 flex justify-between items-center text-white">
              <h3 className="font-bold text-lg flex items-center gap-3">
                <span className="material-symbols-outlined fill-1">calendar_today</span>
                Leitura de Hoje
              </h3>
              <span className="bg-white/20 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20">Dia {currentDay} de 365</span>
            </div>
            <div className="p-6 md:p-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-8 md:mb-10">
                <div className="space-y-1">
                  <h4 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{todayPlan?.passage}</h4>
                  <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    Tempo estimado: {todayPlan?.estimatedTime}
                  </div>
                </div>
                <button
                  onClick={() => navigate('/reading')}
                  className="bg-primary hover:bg-primary-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl shadow-primary/30 hover:shadow-primary/40 transition-all flex items-center gap-3 w-full md:w-auto justify-center active:scale-[0.98] group/btn"
                >
                  <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">auto_stories</span>
                  COMEÇAR LEITURA
                </button>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-800/40 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 group-focus-within/card:border-primary/30 transition-colors">
                <h5 className="text-xs font-black text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
                  <span className="material-symbols-outlined text-primary text-[20px]">edit_note</span>
                  Insights & Reflexões
                </h5>
                <textarea
                  className="w-full bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-slate-400 transition-all outline-none resize-none"
                  placeholder="O que o Espírito Santo falou ao seu coração hoje?"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-bold text-slate-900 dark:text-white text-xl">Progresso da Semana</h3>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{weeklyCompletedCount} Leituras Concluídas</span>
              </div>
            </div>
            <div className="h-48 flex items-end justify-between gap-4 px-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => {
                const isCompleted = weeklyProgress[idx];
                const isToday = new Date().getDay() === idx;

                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-3 group">
                    <div className={`w-full ${isToday ? 'bg-primary/20 ring-1 ring-primary/40' : 'bg-slate-100 dark:bg-zinc-800'} rounded-t-xl h-full relative overflow-hidden transition-all`}>
                      <div
                        className={`absolute bottom-0 w-full bg-primary rounded-t-xl transition-all duration-700 ${isCompleted ? 'h-full' : 'h-0'}`}
                      />
                    </div>
                    <span className={`text-xs font-bold transition-colors ${isToday ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`}>{day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-zinc-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-8">Progresso Anual</h3>
            <div className="flex justify-center mb-8">
              <div className="relative h-48 w-48">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle className="text-slate-100 dark:text-zinc-800 stroke-current" cx="50" cy="50" fill="transparent" r="40" strokeWidth="8" />
                  <circle
                    className="text-primary stroke-current"
                    cx="50" cy="50"
                    fill="transparent" r="40" strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * progressPercent) / 100}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">{progressPercent}%</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Concluído</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl text-center">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Lidos</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{completedDays}</p>
              </div>
              <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl text-center">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-1">Restantes</p>
                <p className="text-xl font-black text-slate-900 dark:text-white">{totalDays - completedDays}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-zinc-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 dark:text-white">Top Leitores</h3>
              <button className="text-xs font-black text-primary hover:underline">VER TODOS</button>
            </div>
            <div className="space-y-4">
              {topReaders.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Nenhum leitor ainda</p>
              ) : topReaders.map((reader, idx) => {
                const colors = [
                  'bg-yellow-100 text-yellow-700',
                  'bg-slate-100 text-slate-700',
                  'bg-orange-100 text-orange-700'
                ];
                const icons = ['emoji_events', 'looks_two', 'looks_3'];
                return (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${colors[idx] || colors[2]}`}>
                        {reader.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{reader.name}</p>
                        <p className="text-xs text-slate-500">{reader.days} dias</p>
                      </div>
                    </div>
                    <span className={`material-symbols-outlined ${idx === 0 ? 'text-yellow-500' : 'text-slate-300'}`}>{icons[idx]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary to-primary-dark rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-red-200 dark:shadow-none">
            <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-[160px] text-white opacity-10">auto_stories</span>
            <h3 className="font-black text-xl mb-4 relative z-10">Próximos Livros</h3>
            <ul className="space-y-3 relative z-10">
              {nextBooks.length > 0 ? nextBooks.map((book, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <div className={`size-1.5 rounded-full ${idx === 0 ? 'bg-white' : 'bg-white/40'}`} />
                  <span className={`text-sm font-bold ${idx === 0 ? 'opacity-100' : 'opacity-70'}`}>{book}</span>
                </li>
              )) : (
                <li className="text-sm font-bold opacity-70">Reta final do plano!</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
