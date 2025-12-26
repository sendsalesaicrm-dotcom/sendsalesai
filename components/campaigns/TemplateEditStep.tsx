import React, { useState } from 'react';
import { Info, Plus, Braces, Smile, Bold, Italic, AlertTriangle, MousePointerClick, Link as LinkIcon, Phone, Copy, Trash2 } from 'lucide-react';
import { ButtonConfig } from '../../types';

interface TemplateEditStepProps {
  name: string;
  setName: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  header: string;
  setHeader: (v: string) => void;
  body: string;
  setBody: (v: string) => void;
  footer: string;
  setFooter: (v: string) => void;
  buttons: ButtonConfig[];
  setButtons: (v: ButtonConfig[]) => void;
  variables: string[];
  variableValues: Record<string, string>;
  setVariableValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  variableError: string | null;
}

const TemplateEditStep: React.FC<TemplateEditStepProps> = ({
  name, setName, language, setLanguage,
  header, setHeader, body, setBody, footer, setFooter,
  buttons, setButtons, variables, variableValues, setVariableValues,
  variableError
}) => {
  const [isButtonMenuOpen, setIsButtonMenuOpen] = useState(false);

  const insertNextVariable = () => {
    const nums = variables.map(v => parseInt(v));
    const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    setBody(`${body} {{${nextNum}}}`);
  };

  const insertFormat = (char: string) => {
    setBody(`${body}${char}`);
  };

  const handleAddButton = (type: ButtonConfig['type']) => {
    const newButton: ButtonConfig = {
        type,
        text: type === 'QUICK_REPLY' ? '' : type === 'URL' ? 'Acessar site' : type === 'PHONE_NUMBER' ? 'Ligar agora' : 'Copiar código',
        value: ''
    };
    if (buttons.length < 10) {
        setButtons([...buttons, newButton]);
    }
    setIsButtonMenuOpen(false);
  };

  const handleRemoveButton = (index: number) => {
    const newButtons = [...buttons];
    newButtons.splice(index, 1);
    setButtons(newButtons);
  };

  const handleUpdateButton = (index: number, field: keyof ButtonConfig, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setButtons(newButtons);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
        <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Nome e idioma do modelo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Dê um nome ao seu modelo</label>
                <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="nome_do_modelo"
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary focus:outline-none focus:ring-1"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{name.length}/512</p>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Selecione o idioma</label>
                <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary focus:outline-none focus:ring-1"
                >
                    <option value="pt_BR">Português (BR)</option>
                    <option value="en_US">English (US)</option>
                    <option value="es_ES">Español</option>
                </select>
            </div>
        </div>
    </div>

    <hr className="border-gray-200" />

    <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Conteúdo</h2>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Adicione um cabeçalho, corpo de texto e rodapé para o seu modelo. A API de Nuvem hospedada pela Meta vai analisar as variáveis e o conteúdo do modelo para proteger a segurança e integridade dos nossos serviços.
        </p>

        {/* Header Input */}
        <div className="space-y-2 mb-6">
            <label className="block text-sm font-bold text-gray-700">Cabeçalho <span className="font-normal text-gray-500">• Opcional</span></label>
            <input 
                type="text"
                value={header}
                onChange={(e) => setHeader(e.target.value)}
                placeholder="Adicione um título curto"
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary focus:outline-none focus:ring-1"
                maxLength={60}
            />
            <p className="text-xs text-gray-400 text-right">{header.length}/60</p>
        </div>

        {/* Body Input */}
        <div className="space-y-2 mb-6">
            <div className="flex justify-between items-center">
                    <label className="block text-sm font-bold text-gray-700">Corpo</label>
                    <button 
                    onClick={insertNextVariable}
                    className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                    >
                    <Plus className="w-3 h-3" /> Adicionar variável
                    </button>
            </div>
            <div className="relative">
                <textarea 
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary focus:outline-none focus:ring-1 font-sans"
                    placeholder="Digite o texto da sua mensagem aqui. Use {{1}}, {{2}} para variáveis."
                />
                <div className="absolute bottom-2 right-2 flex gap-1 bg-white/90 backdrop-blur-sm rounded-lg p-1 border border-gray-100 shadow-sm">
                    <button 
                        onClick={insertNextVariable}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 transition-colors" 
                        title="Adicionar variável {{}}"
                    >
                        <Braces className="w-4 h-4" />
                    </button>
                    <button 
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors" 
                        title="Adicionar emoji"
                    >
                        <Smile className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => insertFormat('*')}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors" 
                        title="Negrito"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => insertFormat('_')}
                        className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors" 
                        title="Itálico"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="flex justify-between items-start">
                <div>
                    {variableError && (
                        <div className="text-xs text-red-600 flex items-center gap-1 mt-1 font-medium bg-red-50 px-2 py-1 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            {variableError}
                        </div>
                    )}
                </div>
                <p className="text-xs text-gray-400 text-right mt-1">{body.length}/1024</p>
            </div>
        </div>

        {/* Variable Samples Section */}
        {variables.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div>
                    <h4 className="text-sm font-bold text-gray-800">Amostras de variáveis</h4>
                    <p className="text-xs text-gray-500 mt-1">
                        Inclua amostras de todas as variáveis na sua mensagem para ajudar a Meta a analisar seu modelo.
                    </p>
                </div>
                <div className="space-y-3">
                    {variables.map((variable) => (
                        <div key={variable} className="flex items-center gap-3">
                            <div className="w-12 flex-shrink-0 flex justify-center">
                                <span className="bg-gray-200 text-gray-600 text-xs font-mono px-2 py-1 rounded">
                                    {`{{${variable}}}`}
                                </span>
                            </div>
                            <input 
                                type="text"
                                value={variableValues[variable] || ''}
                                onChange={(e) => setVariableValues(prev => ({...prev, [variable]: e.target.value}))}
                                placeholder={`Ex: Valor para {{${variable}}}`}
                                className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary focus:outline-none focus:ring-1"
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Footer Input */}
        <div className="space-y-2 mb-6">
            <label className="block text-sm font-bold text-gray-700">Rodapé <span className="font-normal text-gray-500">• Opcional</span></label>
            <input 
                type="text"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="Adicione um texto de rodapé"
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary focus:outline-none focus:ring-1"
                maxLength={60}
            />
            <p className="text-xs text-gray-400 text-right">{footer.length}/60</p>
        </div>

        {/* Buttons Configuration */}
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Botões <span className="font-normal text-gray-500">• Opcional</span></label>
                <p className="text-xs text-gray-500 mb-3">Crie até 10 botões para ação rápida.</p>
                
                <div className="relative inline-block">
                    <button 
                        onClick={() => setIsButtonMenuOpen(!isButtonMenuOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-sm font-medium text-gray-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Adicionar botão
                    </button>
                    
                    {isButtonMenuOpen && (
                        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                            <button onClick={() => handleAddButton('QUICK_REPLY')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                                <MousePointerClick className="w-4 h-4 text-gray-500" /> Personalizado
                            </button>
                            <button onClick={() => handleAddButton('URL')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-gray-500" /> Acessar o site
                            </button>
                            <button onClick={() => handleAddButton('PHONE_NUMBER')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-500" /> Ligar
                            </button>
                            <button onClick={() => handleAddButton('COPY_CODE')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                                <Copy className="w-4 h-4 text-gray-500" /> Copiar código
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Buttons List */}
            {buttons.length > 0 && (
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {buttons.map((btn, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-gray-200 shadow-sm relative group">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded">
                                    {btn.type === 'QUICK_REPLY' ? 'Personalizado' : btn.type === 'URL' ? 'Acessar site' : btn.type === 'PHONE_NUMBER' ? 'Ligar' : 'Copiar código'}
                                </span>
                                <button 
                                    onClick={() => handleRemoveButton(idx)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                    title="Remover botão"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Texto do botão</label>
                                    <input 
                                        type="text" 
                                        value={btn.text}
                                        onChange={(e) => handleUpdateButton(idx, 'text', e.target.value)}
                                        className="w-full bg-white text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                        placeholder="Digite o texto do botão"
                                        maxLength={25}
                                    />
                                </div>
                                {btn.type === 'URL' && (
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">URL do site</label>
                                        <input 
                                            type="text" 
                                            value={btn.value || ''}
                                            onChange={(e) => handleUpdateButton(idx, 'value', e.target.value)}
                                            className="w-full bg-white text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                            placeholder="https://www.exemplo.com"
                                        />
                                    </div>
                                )}
                                {btn.type === 'PHONE_NUMBER' && (
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Número de telefone</label>
                                        <input 
                                            type="text" 
                                            value={btn.value || ''}
                                            onChange={(e) => handleUpdateButton(idx, 'value', e.target.value)}
                                            className="w-full bg-white text-sm border border-gray-300 rounded px-2 py-1.5 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                            placeholder="+55 11 99999-9999"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
    </div>
  );
};

export default TemplateEditStep;