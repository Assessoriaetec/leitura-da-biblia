import React, { useState, useEffect } from 'react';
import { MOCK_USER, IMAGES } from '../constants';
import { supabase } from '../services/supabaseClient';

interface DBPost {
  id: string;
  user_id: string;
  category: string;
  content: string;
  image_url?: string;
  likes: number;
  comments_count: number;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

const Community: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<DBPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rankingUsers, setRankingUsers] = useState<{ name: string, prog: number, rank: number }[]>([]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        setProfile(profileData);
      }

      fetchPosts();

      // Fetch ranking data
      const { data: allProgress } = await supabase
        .from('reading_progress')
        .select('user_id')
        .eq('is_read', true);

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, name');

      if (allProgress && allProfiles) {
        const userDaysMap: Record<string, number> = {};
        allProgress.forEach(p => {
          userDaysMap[p.user_id] = (userDaysMap[p.user_id] || 0) + 1;
        });

        const totalDays = 365;
        const ranked = allProfiles
          .map(profile => ({
            name: profile.name || 'Sem nome',
            prog: Math.round((userDaysMap[profile.id] || 0) / totalDays * 100),
            rank: 0
          }))
          .filter(r => r.prog > 0)
          .sort((a, b) => b.prog - a.prog)
          .slice(0, 3)
          .map((r, idx) => ({ ...r, rank: idx + 1 }));

        setRankingUsers(ranked);
      }
    };
    init();
  }, []);

  const handlePublish = async () => {
    if (!newPost.trim()) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('posts')
      .insert({
        user_id: session.user.id,
        content: newPost,
        category: 'Reflexão',
        user_name: profile?.name || session.user.user_metadata?.full_name || 'Usuário',
        user_avatar: profile?.avatar_url || session.user.user_metadata?.avatar_url,
        likes: 0,
        comments_count: 0
      });

    if (error) {
      console.error('Error publishing post:', error);
      alert('Erro ao publicar. Verifique se você adicionou as colunas user_name e user_avatar no Supabase.');
    } else {
      setNewPost('');
      fetchPosts();
    }
    setSubmitting(false);
  };

  const handleAmen = async (postId: string, currentLikes: number) => {
    const { error } = await supabase
      .from('posts')
      .update({ likes: currentLikes + 1 })
      .eq('id', postId);

    if (error) {
      console.error('Error updating likes:', error);
    } else {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: currentLikes + 1 } : p));
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Tem certeza que deseja apagar este post?')) return;

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('Error deleting post:', error);
      alert('Erro ao apagar post.');
    } else {
      setPosts(prev => prev.filter(p => p.id !== postId));
    }
  };

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      {/* Side Profile Info */}
      <aside className="hidden lg:flex lg:col-span-3 flex-col gap-6">
        <div className="bg-white dark:bg-zinc-900 rounded-[40px] p-8 shadow-premium border border-slate-100 dark:border-zinc-800 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/5 to-transparent" />
          <div className="relative">
            <div className="size-32 rounded-[40px] overflow-hidden border-4 border-white dark:border-zinc-800 shadow-2xl relative z-10 group cursor-pointer">
              {profile?.avatar_url || session?.user?.user_metadata?.avatar_url ? (
                <img src={profile?.avatar_url || session?.user?.user_metadata?.avatar_url} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center font-black text-primary text-2xl uppercase">
                  {(profile?.name || session?.user?.user_metadata?.full_name || 'U')[0]}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1 relative z-10">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{profile?.name || session?.user?.user_metadata?.full_name || 'Usuário'}</h3>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Leitor Raiz de Davi</p>
          </div>
          <div className="w-full grid grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-4 flex flex-col items-center border border-slate-100 dark:border-zinc-800">
              <span className="text-3xl font-black text-primary">—</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DIAS</span>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-4 flex flex-col items-center border border-slate-100 dark:border-zinc-800">
              <span className="text-3xl font-black text-primary">{Math.round((posts.length / 10) * 100)}%</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">META</span>
            </div>
          </div>
          <button className="text-xs font-black text-primary uppercase tracking-widest hover:underline active:scale-95 transition-all">Ver Meu Perfil</button>
        </div>

        <div className="bg-primary text-white rounded-3xl p-8 shadow-xl shadow-red-200 dark:shadow-none relative overflow-hidden group">
          <span className="material-symbols-outlined absolute -right-4 -top-4 text-[120px] opacity-10">groups</span>
          <h3 className="text-xl font-black mb-2 relative z-10">Convide Amigos</h3>
          <p className="text-white/80 text-sm mb-6 relative z-10 leading-relaxed">Ler em grupo é muito melhor. Traga seus amigos para o desafio da leitura anual!</p>
          <button className="bg-white text-primary text-sm font-bold py-3 px-6 rounded-2xl w-full hover:bg-slate-50 transition-colors relative z-10">Copiar Link de Convite</button>
        </div>
      </aside>

      {/* Main Feed */}
      <section className="col-span-1 lg:col-span-6 space-y-6">
        {/* Composer */}
        <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-8 shadow-premium border border-slate-100 dark:border-zinc-800 group focus-within:border-primary/20 transition-all">
          <div className="flex gap-5">
            <img src={MOCK_USER.avatar} className="size-14 rounded-2xl hidden sm:block object-cover shadow-lg" alt="Me" />
            <div className="flex-1 flex flex-col gap-6">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800/50 border-none rounded-[24px] p-6 text-lg focus:ring-0 min-h-[140px] placeholder:text-slate-400 outline-none resize-none"
                placeholder="Compartilhe um versículo ou reflexão..."
              />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button className="p-3 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all">
                    <span className="material-symbols-outlined !text-[20px]">image</span>
                  </button>
                  <button className="p-3 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all">
                    <span className="material-symbols-outlined !text-[20px]">emoji_emotions</span>
                  </button>
                </div>
                <button
                  onClick={handlePublish}
                  disabled={submitting || !newPost.trim()}
                  className="bg-primary hover:bg-primary-600 text-white font-black py-4 px-10 rounded-[20px] shadow-2xl shadow-primary/30 hover:shadow-primary/40 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {submitting ? 'PUBLICANDO...' : 'PUBLICAR NO GRUPO'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {['Feed Geral', 'Discussões', 'Dúvidas', 'Testemunhos'].map((f, i) => (
            <button key={f} className={`shrink-0 h-10 px-6 rounded-full text-sm font-bold transition-all ${i === 0 ? 'bg-zinc-950 text-white' : 'bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Posts */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm animate-pulse">
                <div className="flex gap-4 mb-4">
                  <div className="size-12 bg-slate-100 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                    <div className="h-2 bg-slate-100 rounded w-1/6" />
                  </div>
                </div>
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-3/4 mt-2" />
              </div>
            ))}
          </div>
        ) : posts.map(post => (
          <article key={post.id} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full overflow-hidden border-2 border-primary/20">
                  {post.user_avatar ? (
                    <img src={post.user_avatar} alt={post.user_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center font-black text-primary text-sm">
                      {post.user_name ? post.user_name[0] : 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white hover:underline cursor-pointer">{post.user_name || 'Usuário'}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest">{post.category}</span>
                    <span className="text-xs text-slate-400">{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => post.user_id === session?.user?.id && handleDeletePost(post.id)}
                className={`text-slate-300 hover:text-slate-600 ${post.user_id === session?.user?.id ? '' : 'invisible'}`}
                title="Apagar post"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>

            <p className="text-slate-700 dark:text-slate-300 leading-relaxed pl-16 sm:pl-0">
              {post.content}
            </p>

            {post.image_url && (
              <div className="rounded-2xl overflow-hidden border border-slate-100 dark:border-zinc-800 h-64 relative group">
                <img src={post.image_url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Post attachment" />
              </div>
            )}

            <div className="flex items-center gap-6 border-t border-slate-50 dark:border-zinc-800/50 pt-5 mt-2">
              <button
                onClick={() => handleAmen(post.id, post.likes)}
                className="flex items-center gap-2 group/btn bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-full transition-all"
              >
                <span className="material-symbols-outlined !text-[22px] text-primary transition-all group-hover/btn:scale-125 font-filled group-active/btn:scale-90">favorite</span>
                <span className="text-sm font-black text-primary uppercase tracking-tighter">Amém · {post.likes}</span>
              </button>
              <button className="flex items-center gap-2 group/btn hover:bg-slate-100 dark:hover:bg-zinc-800 px-4 py-2 rounded-full transition-all text-slate-500">
                <span className="material-symbols-outlined !text-[22px] transition-all group-hover/btn:scale-125">chat_bubble</span>
                <span className="text-sm font-black uppercase tracking-tighter">{post.comments_count}</span>
              </button>
              <button className="ml-auto text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl transition-colors">
                <span className="material-symbols-outlined !text-[20px]">send</span>
              </button>
            </div>
          </article>
        ))}
      </section>

      {/* Right Column Widget */}
      <aside className="col-span-1 lg:col-span-3 space-y-6 lg:sticky lg:top-24">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">trophy</span>
              Ranking
            </h3>
            <span className="text-[10px] font-black text-primary/60 bg-primary/10 px-2 py-1 rounded uppercase tracking-widest">Semanal</span>
          </div>
          <div className="space-y-6">
            {rankingUsers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">Nenhum leitor ainda</p>
            ) : rankingUsers.map(user => {
              const rings = ['ring-yellow-400', 'ring-slate-200', 'ring-orange-300'];
              return (
                <div key={user.rank} className="flex items-center gap-4">
                  <div className="font-black text-primary w-4 text-center">{user.rank}</div>
                  <div className={`size-10 rounded-full ring-2 ${rings[user.rank - 1] || rings[2]} bg-primary/10 flex items-center justify-center font-black text-primary text-sm`}>
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-1.5 mt-1">
                      <div className="bg-primary h-1.5 rounded-full" style={{ width: `${user.prog}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-primary">{user.prog}%</span>
                </div>
              );
            })}
          </div>
          <button className="w-full mt-6 text-xs font-black text-slate-400 hover:text-primary transition-colors tracking-widest">VER RANKING COMPLETO</button>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-zinc-800">
          <h3 className="font-black text-lg text-slate-900 dark:text-white mb-6">Tópicos em Alta</h3>
          <div className="flex flex-wrap gap-2">
            {['#Gênesis', '#Fé', '#Desafio', '#VelhoTestamento', '#Oração'].map(tag => (
              <a key={tag} href="#" className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                {tag}
              </a>
            ))}
          </div>
        </div>
      </aside >
    </div >
  );
};

export default Community;
