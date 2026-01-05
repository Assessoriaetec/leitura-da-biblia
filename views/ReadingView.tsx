import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { gemini } from '../services/geminiService';
import { bibleService } from '../services/bibleService';
import { readingPlanService, ReadingPlanDay } from '../services/readingPlanService';
import { MOCK_USER } from '../constants';
import { supabase } from '../services/supabaseClient';


interface Highlight {
  id?: string;
  verse_index: number;
  start_offset: number;
  end_offset: number;
  color: 'yellow' | 'green' | 'blue' | 'pink';
  text_content?: string;
}

const ReadingView: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentDay, setCurrentDay] = useState(readingPlanService.getCurrentDay());
  const [dayData, setDayData] = useState<ReadingPlanDay | undefined>(readingPlanService.getPlanForDay(readingPlanService.getCurrentDay()));
  const [verses, setVerses] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, verseIndex: number, start: number, end: number, text: string } | null>(null);
  const [highlightMenu, setHighlightMenu] = useState<{ x: number, y: number, id: string, color: string } | null>(null);

  const [loading, setLoading] = useState(true);
  const [isRead, setIsRead] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [version, setVersion] = useState('nvi');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const fetchDayData = useCallback(async (day: number) => {
    if (!session?.user) return;
    setLoading(true);
    await readingPlanService.ensureSynced();
    const data = readingPlanService.getPlanForDay(day);
    setDayData(data);

    if (data) {
      const { bookAbbrev, chapter } = bibleService.parsePassage(data.passage);
      const content = await bibleService.getChapterVerses(bookAbbrev, chapter, version);
      setVerses(content);

      // Fetch progress
      const { data: progressData } = await supabase
        .from('reading_progress')
        .select('is_read, notes')
        .eq('day_number', day)
        .eq('user_id', session.user.id)
        .maybeSingle();

      setIsRead(!!progressData?.is_read);
      setNotes(progressData?.notes || '');

      // Fetch highlights
      const { data: highlightsData } = await supabase
        .from('reading_highlights')
        .select('*')
        .eq('day_number', day)
        .eq('user_id', session.user.id);

      if (highlightsData) setHighlights(highlightsData);
    }
    setLoading(false);
  }, [session, version]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleSelectionChange = () => {
      const selection = window.getSelection();

      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setSelectionMenu(null);
        // Do NOT close highlightMenu here. Clicking a highlight technically collapses selection.
        // The menu will be closed by the background click listener or new selection start.
        return;
      }

      const range = selection.getRangeAt(0);

      // Helper to find verse node from any DOM node
      const getVerseNode = (node: Node | null) => {
        if (!node) return null;
        return (node.nodeType === 3 ? node.parentElement : node as HTMLElement)?.closest('[data-verse-index]');
      };

      // Try to find the verse from the start, then end, then common ancestor
      const verseNode = getVerseNode(range.startContainer) ||
        getVerseNode(range.endContainer) ||
        getVerseNode(range.commonAncestorContainer);

      if (verseNode) {
        const indexStr = verseNode.getAttribute('data-verse-index');
        if (!indexStr) return;
        const index = parseInt(indexStr);

        try {
          // Calculate Offset relative to the specific verse node found
          const preSelectionRange = range.cloneRange();
          preSelectionRange.selectNodeContents(verseNode);

          // We need to be careful if range.startContainer is NOT inside verseNode
          // (e.g. if we found verseNode via endContainer because start was outside)

          // If start is before verseNode, startOffset is 0.
          // If start is inside verseNode, we calculate.

          let rawStart = 0;
          if (verseNode.contains(range.startContainer)) {
            preSelectionRange.setEnd(range.startContainer, range.startOffset);
            rawStart = preSelectionRange.toString().length;
          } else {
            // Start is outside (likely before). 
            // If the range intersects this verse, the start relative to THIS verse is 0.
            // Unless the selection is entirely *after* this verse? 
            // But we found the verse via intersection, so it should be fine.
            rawStart = 0;
          }

          const textLength = selection.toString().length;

          const verseNumLen = (index + 1).toString().length;
          let start = Math.max(0, rawStart - verseNumLen);
          let end = start + textLength;

          const rect = range.getBoundingClientRect();

          // Update menu position/content
          setSelectionMenu({
            x: rect.left + (rect.width / 2),
            y: rect.top,
            verseIndex: index,
            start,
            end,
            text: selection.toString()
          });
          setHighlightMenu(null); // Close highlight menu if selection is made
        } catch (err) {
          console.error("Selection calculation error:", err);
        }
      } else {
        // Only hide if we explicitly clicked somewhere else that isn't a verse
        setSelectionMenu(null);
        setHighlightMenu(null); // Close highlight menu if selection is made outside a verse
      }
    };

    const onSelectionChange = () => {
      // Debounce updates during drag, but DO NOT hide menu here.
      clearTimeout(timeout);
      timeout = setTimeout(handleSelectionChange, 100);
    };

    const onInteractionEnd = () => {
      // Force immediate update on mouse up / touch end
      clearTimeout(timeout);
      // Small delay to ensure selection API is updated by browser
      setTimeout(handleSelectionChange, 10);
    };

    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('mouseup', onInteractionEnd);
    document.addEventListener('touchend', onInteractionEnd);
    document.addEventListener('keyup', onInteractionEnd);

    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('mouseup', onInteractionEnd);
      document.removeEventListener('touchend', onInteractionEnd);
      document.removeEventListener('keyup', onInteractionEnd);
      clearTimeout(timeout);
    };
  }, []); // Empty dependency array - logic is self contained

  // REMOVE the old handleSelection definition if it exists or leave it unused.
  // We will remove the onMouseUp props from JSX below.

  const saveHighlight = async (color: 'yellow' | 'green' | 'blue' | 'pink') => {
    if (!session?.user || !selectionMenu) return;

    const newHighlight = {
      user_id: session.user.id,
      day_number: currentDay,
      verse_index: selectionMenu.verseIndex,
      start_offset: selectionMenu.start,
      end_offset: selectionMenu.end,
      color,
      text_content: selectionMenu.text
    };

    // Optimistic Update
    const tempId = Math.random().toString();
    setHighlights(prev => [...prev, { ...newHighlight, id: tempId, color }]);
    setSelectionMenu(null);
    if (window.getSelection()) window.getSelection()?.removeAllRanges();

    const { data, error } = await supabase
      .from('reading_highlights')
      .insert({ ...newHighlight })
      .select()
      .single();

    if (error) {
      console.error('Error saving highlight', error);
      // Rollback
      setHighlights(prev => prev.filter(h => h.id !== tempId));
    } else if (data) {
      // Replace temp with real
      setHighlights(prev => prev.map(h => h.id === tempId ? data : h));
    }
  };

  const removeHighlight = async (id: string) => { // Removed event
    setHighlights(prev => prev.filter(h => h.id !== id));
    setHighlightMenu(null); // Close menu
    await supabase.from('reading_highlights').delete().eq('id', id);
  };

  const renderVerseContent = (text: string, verseIndex: number) => {
    const verseHighlights = highlights
      .filter(h => h.verse_index === verseIndex)
      .sort((a, b) => a.start_offset - b.start_offset);

    if (verseHighlights.length === 0) return text;

    const nodes = [];
    let lastIndex = 0;

    verseHighlights.forEach((h, idx) => {
      // Safe check for bounds
      let start = Math.max(0, Math.min(h.start_offset, text.length));
      const end = Math.max(start, Math.min(h.end_offset, text.length));

      // Handling Overlaps:
      // If this highlight starts before the last one ended, we simply truncate the start.
      // If the adjusted start is >= end, it means this highlight is completely inside the previous one (or effectively zero width),
      // so we skip it to avoid duplication or empty spans.
      start = Math.max(start, lastIndex);

      if (start >= end) {
        // Skip completely overlapped or invalid segments
        return;
      }

      if (start > lastIndex) {
        nodes.push(<span key={`text-${idx}`}>{text.slice(lastIndex, start)}</span>);
      }

      let bgClass = "bg-yellow-200/50 dark:bg-yellow-500/30";
      if (h.color === 'green') bgClass = "bg-emerald-200/50 dark:bg-emerald-500/30";
      if (h.color === 'blue') bgClass = "bg-blue-200/50 dark:bg-blue-500/30";
      if (h.color === 'pink') bgClass = "bg-pink-200/50 dark:bg-pink-500/30";

      nodes.push(
        <span
          key={`high-${h.id || idx}`}
          className={`${bgClass} cursor-pointer hover:brightness-95 transition-colors border-b-2 border-transparent hover:border-black/5 dark:hover:border-white/10`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (h.id) {
              const rect = e.currentTarget.getBoundingClientRect();
              setHighlightMenu({
                x: rect.left + (rect.width / 2),
                y: rect.top,
                id: h.id,
                color: h.color
              });
              setSelectionMenu(null); // Close selection menu if open
            }
          }}
          title="Clique para remover"
        >
          {text.slice(start, end)}
        </span>
      );
      lastIndex = end;
    });

    if (lastIndex < text.length) {
      nodes.push(<span key="text-end">{text.slice(lastIndex)}</span>);
    }

    return nodes;
  };

  useEffect(() => {
    if (session) {
      fetchDayData(currentDay);
    }
  }, [currentDay, version, fetchDayData, session]);

  const saveNotes = async (content: string) => {
    if (!session?.user) return;
    setSavingNotes(true);
    const { error } = await supabase
      .from('reading_progress')
      .upsert({
        user_id: session.user.id,
        day_number: currentDay,
        notes: content,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,day_number' });

    if (error) console.error('Error saving notes:', error);
    setSavingNotes(false);
  };

  const toggleRead = async () => {
    if (!session?.user) return;
    const newState = !isRead;
    setIsRead(newState);

    // Update or insert progress in Supabase for this user
    const { error } = await supabase
      .from('reading_progress')
      .upsert({
        user_id: session.user.id,
        day_number: currentDay,
        is_read: newState,
        read_at: newState ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,day_number' });

    if (error) console.error('Error updating progress:', error);
  };

  const navigateDay = (direction: 'next' | 'prev') => {
    const total = readingPlanService.getTotalDays();
    if (direction === 'next' && currentDay < total) {
      setCurrentDay(prev => prev + 1);
    } else if (direction === 'prev' && currentDay > 1) {
      setCurrentDay(prev => prev - 1);
    }
  };

  if (!dayData && !loading) return (
    <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-premium">
      <h2 className="text-2xl font-black text-slate-900 mb-4">Plano não encontrado</h2>
      <button onClick={() => setCurrentDay(1)} className="text-primary font-bold underline">Voltar para o Dia 1</button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 mt-4"
      onClick={() => {
        setSelectionMenu(null);
        setHighlightMenu(null);
      }}
    >
      <nav className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Navigation Content */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <Link to="/" className="text-slate-400 hover:text-primary transition-colors">Home</Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-400">Plano Anual</span>
          <span className="text-slate-400">/</span>
          <span className="font-bold text-primary">Dia {currentDay}</span>
        </div>
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <button
            onClick={() => navigateDay('prev')}
            disabled={currentDay <= 1}
            className="size-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <span className="material-symbols-outlined pointer-events-none">chevron_left</span>
          </button>
          <span className="text-sm font-black text-slate-700 tracking-tight">DIA {currentDay} DE {readingPlanService.getTotalDays()}</span>
          <button
            onClick={() => navigateDay('next')}
            disabled={currentDay >= readingPlanService.getTotalDays()}
            className="size-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          >
            <span className="material-symbols-outlined pointer-events-none">chevron_right</span>
          </button>
        </div>
      </nav>

      <div className="space-y-4">
        <div className="flex gap-2">
          <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">{dayData?.category}</span>
          <span className="px-4 py-1.5 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-zinc-800 tracking-tighter">Leitura Diária</span>
        </div>
        <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-slate-900 dark:text-white leading-tight md:leading-none">
          {dayData?.passage}
        </h1>
        <p className="text-2xl font-bold text-primary tracking-tight">Tema: {dayData?.theme}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-slate-200 dark:border-zinc-800 shadow-sm relative overflow-visible">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-3xl -mr-24 -mt-24 rounded-full pointer-events-none" />
            <div className="flex justify-end items-center mb-6 relative z-10 w-full">
              <div className="flex gap-2 w-full md:w-auto">
                <select
                  className="bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold py-2 px-3 focus:ring-primary w-full md:w-auto text-slate-700 dark:text-zinc-300"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                >
                  <option value="nvi">NVI (Nova Versão Internacional)</option>
                  <option value="acf">ACF (Almeida Corrigida Fiel)</option>
                  <option value="aa">AA (Almeida Atualizada)</option>
                  <option value="kjv">KJV (King James Version)</option>
                </select>
                <button className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 shrink-0">
                  <span className="material-symbols-outlined">volume_up</span>
                </button>
              </div>
            </div>

            <article className="prose prose-slate prose-lg max-w-none min-h-[400px]">
              <div className="space-y-6">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white border-l-4 border-primary pl-4">{dayData?.book} {dayData?.passage.split(' ')[1]}</h3>

                {loading ? (
                  <div className="space-y-4 animate-pulse pt-4">
                    <div className="h-4 bg-slate-100 rounded-full w-3/4"></div>
                    <div className="h-4 bg-slate-100 rounded-full w-full"></div>
                    <div className="h-4 bg-slate-100 rounded-full w-5/6"></div>
                  </div>
                ) : verses.length > 0 ? (
                  <div className="text-slate-700 dark:text-zinc-300 leading-relaxed text-lg font-medium space-y-2 text-justify relative select-text">
                    {verses.map((v, i) => (
                      <p
                        key={i}
                        className="relative"
                        data-verse-index={i}
                      >
                        <span className="text-primary font-black mr-2 text-sm select-none">{i + 1}</span>
                        {renderVerseContent(v, i)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-slate-50 rounded-2xl text-center">
                    <p className="text-slate-500 font-bold">Conteúdo não disponível para esta versão.</p>
                    <p className="text-[10px] uppercase font-black text-slate-400 mt-2">Tente novamente em instantes</p>
                  </div>
                )}
              </div>
            </article>

            {/* Selection Menu */}
            {selectionMenu && (
              <div
                className="fixed z-50 bg-slate-900 text-white rounded-full px-4 py-2 flex items-center gap-3 shadow-xl animate-in zoom-in-95 duration-200"
                style={{
                  left: selectionMenu.x,
                  top: selectionMenu.y - 50, // Position slightly above the selection
                  position: 'fixed',
                  transform: 'translateX(-50%)' // Center horizontally
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button onClick={() => saveHighlight('yellow')} className="size-6 rounded-full bg-yellow-400 hover:scale-110 transition-transform ring-2 ring-white/20"></button>
                <button onClick={() => saveHighlight('green')} className="size-6 rounded-full bg-emerald-400 hover:scale-110 transition-transform ring-2 ring-white/20"></button>
                <button onClick={() => saveHighlight('blue')} className="size-6 rounded-full bg-blue-400 hover:scale-110 transition-transform ring-2 ring-white/20"></button>
                <button onClick={() => saveHighlight('pink')} className="size-6 rounded-full bg-pink-400 hover:scale-110 transition-transform ring-2 ring-white/20"></button>
                <div className="w-px h-4 bg-white/20 mx-1"></div>
                <button onClick={() => setSelectionMenu(null)} className="text-white/70 hover:text-white">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            )}

            {/* Highlight Action Menu (Delete) */}
            {highlightMenu && (
              <div
                className="fixed z-50 bg-slate-900 text-white rounded-full px-3 py-2 flex items-center justify-center shadow-xl animate-in zoom-in-95 duration-200 gap-2"
                style={{
                  left: highlightMenu.x,
                  top: highlightMenu.y - 50,
                  position: 'fixed',
                  transform: 'translateX(-50%)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => removeHighlight(highlightMenu.id)}
                  className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 px-2"
                >
                  <span className="material-symbols-outlined text-xl">delete</span>
                  <span className="text-xs font-bold uppercase">Excluir</span>
                </button>
                <div className="w-px h-4 bg-white/20"></div>
                <button onClick={() => setHighlightMenu(null)} className="text-white/70 hover:text-white px-1">
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            )}

            {/* AI Insight Section Removed */}
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_note</span>
                Anotações Pessoais
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {savingNotes ? 'Salvando...' : 'Salvo Automaticamente'}
              </span>
            </div>
            <textarea
              className="w-full bg-slate-50 dark:bg-zinc-800/50 border-none rounded-2xl p-6 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-primary min-h-[150px] resize-none"
              placeholder="O que você aprendeu com a leitura de hoje?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => saveNotes(notes)}
            />
          </div>
        </div>

        <aside className="space-y-6">
          <div className="sticky top-24 space-y-6">
            <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 shadow-premium border border-slate-100 dark:border-zinc-800 flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Estado da Leitura</span>
                <span className="text-xs font-black text-primary px-3 py-1 bg-primary/10 rounded-full">{isRead ? 'CONCLUÍDO' : 'PENDENTE'}</span>
              </div>
              <button
                onClick={toggleRead}
                className={`${isRead ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200 dark:shadow-none' : 'bg-primary hover:bg-primary-600 shadow-primary/30'} text-white w-full py-5 rounded-[20px] font-black text-base shadow-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] group whitespace-nowrap`}
              >
                <span className={`material-symbols-outlined transition-all ${isRead ? 'scale-110' : 'group-hover:rotate-12'} !text-[20px]`}>
                  {isRead ? 'check_circle' : 'task_alt'}
                </span>
                {isRead ? 'Leitura Concluída' : 'Marcar como Lido'}
              </button>
              <div className="bg-slate-50 dark:bg-zinc-800/40 p-5 rounded-2xl border border-dotted border-slate-200 dark:border-zinc-700">
                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 font-bold uppercase leading-relaxed tracking-tight">
                  {isRead
                    ? "Parabéns! Seu progresso foi atualizado com sucesso hoje."
                    : "Ao concluir, seu objetivo diário será atingido."}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Material de Apoio</h4>
              <div className="space-y-3">
                <a href="#" className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors group">
                  <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <span className="material-symbols-outlined">play_circle</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">Vídeo: Gênesis 1-11</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">The Bible Project • 7 min</p>
                  </div>
                </a>
                <a href="#" className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors group">
                  <div className="size-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                    <span className="material-symbols-outlined">article</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">Artigo: A Criação</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Teologia • 5 min leitura</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ReadingView;
