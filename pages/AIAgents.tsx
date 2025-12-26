import React, { useState } from 'react';
import { Bot, Save, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { generateSystemPrompt } from '../services/geminiService';
import { useToast } from '../context/ToastContext';

const AIAgents: React.FC = () => {
  const { showToast } = useToast();
  const [personaName, setPersonaName] = useState('Representante de Vendas');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(`Você é um representante de vendas amigável e profissional da SendSales.ai.
Seu objetivo é responder a perguntas de clientes sobre nossa plataforma de CRM WhatsApp e agendar demonstrações.
Mantenha as respostas concisas (menos de 50 palavras) e conversacionais.
Não seja insistente.`);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGeneratePrompt = async () => {
    if (!description.trim()) {
        setError('Por favor, insira uma descrição primeiro.');
        return;
    }
    setError('');
    setIsGenerating(true);
    
    const generated = await generateSystemPrompt(description);
    setSystemPrompt(generated);
    setIsGenerating(false);
    showToast('Prompt gerado com sucesso!', 'info');
  };

  const handleSave = () => {
      // Simulate save
      showToast('Agente IA salvo com sucesso!', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-8">
      <div className="flex justify-between items-start">
         <div>
            <h1 className="text-3xl font-bold text-primary dark:text-secondary flex items-center gap-3">
                <Bot className="w-8 h-8 text-accent" /> Configuração do Agente IA
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">Configure a personalidade e as regras para seus assistentes virtuais automatizados.</p>
         </div>
         <button 
            onClick={handleSave}
            className="px-4 py-2 bg-secondary text-white rounded-lg font-bold hover:bg-green-600 transition-colors shadow-md flex items-center gap-2"
         >
            <Save className="w-4 h-4" /> Salvar Alterações
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Config */}
        <div className="lg:col-span-2 space-y-6">
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 pb-2">Identidade do Agente</h2>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome Interno da Persona</label>
                    <input 
                        type="text" 
                        value={personaName}
                        onChange={(e) => setPersonaName(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 focus:ring-accent focus:border-accent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Gerador de Prompt do Sistema</h2>
                    <span className="text-xs bg-accent/10 dark:bg-accent/20 text-accent dark:text-indigo-300 px-2 py-1 rounded font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Powered by Gemini
                    </span>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Descreva o objetivo do seu agente (ex: "Um agente de suporte que ajuda a resolver problemas de login com gentileza")
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Ex: Vender imóveis de luxo para clientes de alto padrão..."
                                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 focus:ring-accent focus:border-accent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                            <button 
                                onClick={handleGeneratePrompt}
                                disabled={isGenerating}
                                className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                            >
                                {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {isGenerating ? 'Gerando...' : 'Gerar Prompt'}
                            </button>
                        </div>
                        {error && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instruções do Sistema (Editável)</label>
                        <textarea 
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            rows={12}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-4 font-mono text-sm leading-relaxed focus:ring-accent focus:border-accent bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                            Tokens usados: ~{systemPrompt.length / 4}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Sidebar Help */}
        <div className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 p-6 rounded-xl">
                <h3 className="font-bold text-indigo-900 dark:text-indigo-200 mb-2 flex items-center gap-2">
                    <Bot className="w-5 h-5" /> Melhores Práticas
                </h3>
                <ul className="space-y-3 text-sm text-indigo-800 dark:text-indigo-300">
                    <li className="flex gap-2">
                        <span className="font-bold">•</span>
                        <span>Seja específico sobre o tom (ex: "Profissional mas casual").</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold">•</span>
                        <span>Defina restrições (ex: "Nunca prometa uma data de entrega específica").</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-bold">•</span>
                        <span>Instrua o agente a transferir para um humano se o usuário estiver irritado.</span>
                    </li>
                </ul>
            </div>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-xl shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">Configurações do Modelo</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Modelo</label>
                        <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                            <option>Gemini 2.5 Flash (Recomendado)</option>
                            <option>Gemini 1.5 Pro</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Temperatura (Criatividade)</label>
                        <input type="range" className="w-full accent-accent" min="0" max="1" step="0.1" defaultValue="0.7" />
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>Preciso</span>
                            <span>Criativo</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AIAgents;