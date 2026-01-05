import readingPlan from '../data/reading-plan.json';
import { supabase } from './supabaseClient';

export interface ReadingPlanDay {
    day: number;
    passage: string;
    theme: string;
    category: string;
    book: string;
    estimatedTime: string;
}

class ReadingPlanService {
    private plan: ReadingPlanDay[] = readingPlan;
    private initialized: boolean = false;
    private syncPromise: Promise<void> | null = null;

    constructor() {
        this.syncPromise = this.syncWithSupabase();
    }

    async syncWithSupabase(): Promise<void> {
        try {
            const { data, error } = await supabase
                .from('reading_plan')
                .select('*')
                .order('day_number');

            if (error) throw error;

            if (data && data.length > 0) {
                this.plan = data.map(d => ({
                    day: d.day_number,
                    passage: d.passage,
                    theme: d.theme,
                    category: d.category,
                    book: d.book,
                    estimatedTime: d.estimated_time
                }));
                this.initialized = true;
                console.log('ReadingPlanService: Sincronizado com Supabase:', this.plan.length, 'dias');
            }
        } catch (err) {
            console.error('ReadingPlanService: Erro ao sincronizar:', err);
        }
    }

    async ensureSynced(): Promise<void> {
        if (this.syncPromise) await this.syncPromise;
    }

    getPlanForDay(day: number): ReadingPlanDay | undefined {
        return this.plan.find(p => p.day === day);
    }

    getCurrentDay(): number {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = (now.getTime() - start.getTime());
        const oneDay = 1000 * 60 * 60 * 24;
        const day = Math.floor(diff / oneDay);

        return Math.min(Math.max(day, 1), 365);
    }

    getTotalDays(): number {
        return 365;
    }

    getNextBooks(currentDay: number, count: number = 3): string[] {
        const nextBooks: string[] = [];
        const currentBook = this.getPlanForDay(currentDay)?.book;

        // Start looking from the next day
        for (let i = currentDay + 1; i <= 365; i++) {
            const day = this.getPlanForDay(i);
            if (day && day.book !== currentBook && !nextBooks.includes(day.book)) {
                nextBooks.push(day.book);
            }
            if (nextBooks.length >= count) break;
        }

        // If we don't have enough, we might need to show the current one or just what we found
        return nextBooks;
    }
}

export const readingPlanService = new ReadingPlanService();
