
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // Vite uses import.meta.env. VITE_ prefix is standard.
    // @ts-ignore
    const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || (process.env.API_KEY as string) || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async getReadingInsight(passage: string, theme: string) {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analise brevemente o significado bíblico e uma lição prática para hoje baseado na leitura de ${passage} com o tema ${theme}. Responda em português de forma inspiradora.`,
        config: {
          temperature: 0.7,
          maxOutputTokens: 300,
        },
      });
      return response.text;
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Não foi possível gerar um insight no momento. Continue sua leitura com fé!";
    }
  }
}

export const gemini = new GeminiService();
