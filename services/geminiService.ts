import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

// Helper to safely get the API key
const getApiKey = () => {
  return process.env.API_KEY || '';
};

// Generate a system prompt/persona based on user description
export const generateSystemPrompt = async (description: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "Erro: Chave de API ausente.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Crie um prompt de sistema profissional e conciso para um agente de vendas IA com base na descrição a seguir. O prompt deve definir a persona, o tom e as regras. A resposta DEVE ser em Português.
      
      Descrição: ${description}`,
    });
    return response.text || "Falha ao gerar prompt.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao gerar prompt. Verifique sua chave de API.";
  }
};

// Suggest a reply for a conversation
export const suggestReply = async (history: Message[], context: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) return "Erro: Chave de API ausente.";

  try {
    // Map the new Message type to a readable string for the LLM
    const formattedHistory = history.map(m => {
      const role = m.sender_type === 'user' ? (m.is_ai_generated ? 'AI AGENT' : 'HUMAN AGENT') : 'CUSTOMER';
      return `${role}: ${m.content}`;
    }).join('\n');
    
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Você é um assistente de vendas prestativo.
      
      Contexto sobre o lead: ${context}
      
      Histórico da Conversa:
      ${formattedHistory}
      
      Sugira uma resposta curta, profissional e engajadora para o agente enviar a seguir. A resposta deve ser em Português do Brasil.`,
    });
    return response.text || "Não foi possível gerar resposta.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao gerar resposta.";
  }
};