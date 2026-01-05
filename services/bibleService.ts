
export interface BibleVerse {
    number: number;
    text: string;
}

export interface BibleChapter {
    book: {
        abbrev: string;
        name: string;
        author: string;
        group: string;
        version: string;
    };
    chapter: {
        number: number;
        verses: number;
    };
    verses: BibleVerse[];
}

class BibleService {
    private baseUrl = 'https://www.abibliadigital.com.br/api';
    private defaultVersion = 'nvi'; // Nova Versão Internacional
    private cache = new Map<string, string[]>();

    async getChapterVerses(bookAbbrev: string, chapter: number, version: string = this.defaultVersion): Promise<string[]> {
        const cacheKey = `${bookAbbrev.toLowerCase()}-${chapter}-${version}`;
        if (this.cache.has(cacheKey)) {
            console.log(`Serving ${cacheKey} from cache`);
            return this.cache.get(cacheKey)!;
        }
        // Try bible-api.com only for supported versions
        const bibleApiMapping: Record<string, string> = {
            'aa': 'almeida', // Default Almeida on bible-api
            'kjv': 'kjv',
            'web': 'web'
        };

        const mappedVersion = bibleApiMapping[version.toLowerCase()];

        if (mappedVersion) {
            try {
                // Map abbreviations to full book names for bible-api.com
                const bookNameMap: Record<string, string> = {
                    'gn': 'genesis', 'ex': 'exodus', 'lv': 'leviticus', 'nm': 'numbers',
                    'dt': 'deuteronomy', 'js': 'joshua', 'jz': 'judges', 'rt': 'ruth',
                    '1sm': '1samuel', '2sm': '2samuel', '1rs': '1kings', '2rs': '2kings',
                    '1cr': '1chronicles', '2cr': '2chronicles', 'sl': 'psalms', 'pv': 'proverbs',
                    'ec': 'ecclesiastes', 'ct': 'songofsolomon', 'is': 'isaiah', 'jr': 'jeremiah',
                    'lm': 'lamentations', 'ez': 'ezekiel', 'dn': 'daniel', 'os': 'hosea',
                    'jl': 'joel', 'am': 'amos', 'ob': 'obadiah', 'jn': 'jonah', 'mq': 'micah',
                    'na': 'nahum', 'hc': 'habakkuk', 'sf': 'zephaniah', 'ag': 'haggai',
                    'zc': 'zechariah', 'ml': 'malachi', 'mt': 'matthew', 'mc': 'mark',
                    'lc': 'luke', 'jo': 'john', 'at': 'acts', 'rm': 'romans',
                    '1co': '1corinthians', '2co': '2corinthians', 'gl': 'galatians',
                    'ef': 'ephesians', 'fp': 'philippians', 'cl': 'colossians',
                    '1ts': '1thessalonians', '2ts': '2thessalonians', '1ti': '1timothy',
                    '2ti': '2timothy', 'tt': 'titus', 'fm': 'philemon', 'hb': 'hebrews',
                    'tg': 'james', '1pe': '1peter', '2pe': '2peter', '1jo': '1john',
                    '2jo': '2jo', '3jo': '3jo', 'jd': 'jude', 'ap': 'revelation',
                    'ne': 'nehemiah', 'et': 'esther'
                };

                const bookName = bookNameMap[bookAbbrev.toLowerCase()] || bookAbbrev;
                const fallbackUrl = `https://bible-api.com/${bookName}+${chapter}?translation=${mappedVersion}`;
                // Add cache busting to prevent stale responses
                const response = await fetch(fallbackUrl);

                if (response.ok) {
                    const data = await response.json();
                    if (data.verses && data.verses.length > 0) {
                        const verses = data.verses.map((v: any) => v.text.replace(/\s+$/, ''));
                        this.cache.set(cacheKey, verses);
                        return verses;
                    }
                }
            } catch (error) {
                console.warn('Primary API (bible-api) failed, trying fallback:', error);
            }
        }

        // Fallback to abibliadigital
        try {
            const abbrev = bookAbbrev.toLowerCase();
            const response = await fetch(`${this.baseUrl}/verses/${version}/${abbrev}/${chapter}`);

            if (response.ok) {
                const data: BibleChapter = await response.json();
                if (data.verses && data.verses.length > 0) {
                    const verses = data.verses.map(v => v.text);
                    this.cache.set(cacheKey, verses);
                    return verses;
                }
            }
            // If we get here, response wasn't OK or data was empty. Proceed to final fallback.
            console.warn(`Abibliadigital returned status ${response.status}, trying final fallback.`);
        } catch (fallbackError) {
            console.error('Fallback API (abibliadigital) failed, trying final fallback (Almeida):', fallbackError);
        }

        // Final fallback: Use bible-api.com with Almeida
        // This ensures we at least show Portuguese text instead of nothing or English
        try {
            // Map abbreviations to full book names for bible-api.com
            const bookNameMap: Record<string, string> = {
                'gn': 'genesis', 'ex': 'exodus', 'lv': 'leviticus', 'nm': 'numbers',
                'dt': 'deuteronomy', 'js': 'joshua', 'jz': 'judges', 'rt': 'ruth',
                '1sm': '1samuel', '2sm': '2samuel', '1rs': '1kings', '2rs': '2kings',
                '1cr': '1chronicles', '2cr': '2chronicles', 'sl': 'psalms', 'pv': 'proverbs',
                'ec': 'ecclesiastes', 'ct': 'songofsolomon', 'is': 'isaiah', 'jr': 'jeremiah',
                'lm': 'lamentations', 'ez': 'ezekiel', 'dn': 'daniel', 'os': 'hosea',
                'jl': 'joel', 'am': 'amos', 'ob': 'obadiah', 'jn': 'jonah', 'mq': 'micah',
                'na': 'nahum', 'hc': 'habakkuk', 'sf': 'zephaniah', 'ag': 'haggai',
                'zc': 'zechariah', 'ml': 'malachi', 'mt': 'matthew', 'mc': 'mark',
                'lc': 'luke', 'jo': 'john', 'at': 'acts', 'rm': 'romans',
                '1co': '1corinthians', '2co': '2corinthians', 'gl': 'galatians',
                'ef': 'ephesians', 'fp': 'philippians', 'cl': 'colossians',
                '1ts': '1thessalonians', '2ts': '2thessalonians', '1ti': '1timothy',
                '2ti': '2timothy', 'tt': 'titus', 'fm': 'philemon', 'hb': 'hebrews',
                'tg': 'james', '1pe': '1peter', '2pe': '2peter', '1jo': '1john',
                '2jo': '2jo', '3jo': '3jo', 'jd': 'jude', 'ap': 'revelation',
                'ne': 'nehemiah', 'et': 'esther'
            };
            const bookName = bookNameMap[bookAbbrev.toLowerCase()] || bookAbbrev;
            const finalResponse = await fetch(`https://bible-api.com/${bookName}+${chapter}?translation=almeida`);
            if (finalResponse.ok) {
                const data = await finalResponse.json();
                if (data.verses && data.verses.length > 0) {
                    const verses = data.verses.map((v: any) => v.text.replace(/\s+$/, ''));
                    this.cache.set(cacheKey, verses); // Cache this as the result for now
                    return verses;
                }
            }
        } catch (finalError) {
            console.error("All APIs failed", finalError);
        }

        return [];
    }

    // Parses a passage string like "Gênesis 1 - 3" or "Salmos 23"
    // and returns the book and chapter range.
    // Simplifying for now: focus on the first chapter of the passage.
    parsePassage(passage: string) {
        const parts = passage.match(/^(.+?)\s+(\d+)/);
        if (!parts) return { book: 'gn', chapter: 1 };

        const bookName = parts[1].trim();
        const chapter = parseInt(parts[2]);

        // Simple mapping for common books to abbreviations used by abibliadigital
        const bookMap: Record<string, string> = {
            'Gênesis': 'gn',
            'Êxodo': 'ex',
            'Levítico': 'lv',
            'Números': 'nm',
            'Deuteronômio': 'dt',
            'Josué': 'js',
            'Juízes': 'jz',
            'Rute': 'rt',
            '1 Samuel': '1sm',
            '2 Samuel': '2sm',
            '1 Reis': '1rs',
            '2 Reis': '2rs',
            '1 Crônicas': '1cr',
            '2 Crônicas': '2cr',
            'Esdras': 'ez',
            'Neemias': 'ne',
            'Ester': 'et',
            'Jó': 'jo',
            'Salmos': 'sl',
            'Provérbios': 'pv',
            'Eclesiastes': 'ec',
            'Cantares': 'ct',
            'Isaías': 'is',
            'Jeremias': 'jr',
            'Lamentações': 'lm',
            'Ezequiel': 'ez',
            'Daniel': 'dn',
            'Oseias': 'os',
            'Joel': 'jl',
            'Amós': 'am',
            'Obadias': 'ob',
            'Jonas': 'jn',
            'Miqueias': 'mq',
            'Naum': 'na',
            'Habacuque': 'hc',
            'Sofonias': 'sf',
            'Ageu': 'ag',
            'Zacarias': 'zc',
            'Malaquias': 'ml',
            'Mateus': 'mt',
            'Marcos': 'mc',
            'Lucas': 'lc',
            'João': 'jo',
            'Atos': 'at',
            'Romanos': 'rm',
            '1 Coríntios': '1co',
            '2 Coríntios': '2co',
            'Gálatas': 'gl',
            'Efésios': 'ef',
            'Filipenses': 'fp',
            'Colossenses': 'cl',
            '1 Tessalonicenses': '1ts',
            '2 Tessalonicenses': '2ts',
            '1 Timóteo': '1ti',
            '2 Timóteo': '2ti',
            'Tito': 'tt',
            'Filemom': 'fm',
            'Hebreus': 'hb',
            'Tiago': 'tg',
            '1 Pedro': '1pe',
            '2 Pedro': '2pe',
            '1 João': '1jo',
            '2 João': '2jo',
            '3 João': '3jo',
            'Judas': 'jd',
            'Apocalipse': 'ap'
        };

        return {
            bookAbbrev: bookMap[bookName] || bookName.substring(0, 2).toLowerCase(),
            chapter
        };
    }
}

export const bibleService = new BibleService();
