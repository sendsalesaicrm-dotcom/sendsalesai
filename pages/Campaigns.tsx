import React, { useState, useEffect } from 'react';
import { 
  Check, Calendar, Users, FileText, Bot, Loader2, Megaphone, Save
} from 'lucide-react';
import { Template, ButtonConfig, TemplateCategory, TemplateType, MetaTemplate } from '../types';
import TemplateConfigStep from '../components/campaigns/TemplateConfigStep';
import TemplateEditStep from '../components/campaigns/TemplateEditStep';
import PhonePreview from '../components/campaigns/PhonePreview';
import { useToast } from '../context/ToastContext';

const steps = [
  { id: 1, title: 'Modelo', icon: FileText },
  { id: 2, title: 'Público', icon: Users },
  { id: 3, title: 'Config IA', icon: Bot },
  { id: 4, title: 'Agendar', icon: Calendar },
];

const Campaigns: React.FC = () => {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Template Creation State
  const [creationStep, setCreationStep] = useState<'CONFIG' | 'EDIT'>('CONFIG');
  const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('MARKETING');
  const [templateType, setTemplateType] = useState<TemplateType>('STANDARD');
  
  // Template Editor State
  const [templateName, setTemplateName] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('pt_BR');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('Olá {{1}}, confira nossas ofertas de hoje!');
  const [footerText, setFooterText] = useState('');
  
  // Buttons State
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  
  // Variable Samples State
  const [variableValues, setVariableValues] = useState<Record<string, string>>({'1': 'Maria'});

  // Helper: Extract unique variables from text (e.g. {{1}}, {{2}})
  const extractVariables = (text: string) => {
    const matches = text.match(/{{(\d+)}}/g);
    if (!matches) return [];
    // Extract numbers, unique them, and sort
    const uniqueNumbers = [...new Set(matches.map(m => m.replace(/{{|}}/g, '')))];
    return uniqueNumbers.sort((a, b) => parseInt(a) - parseInt(b));
  };

  const variables = extractVariables(bodyText);

  // Validation Logic based on Meta guidelines
  const variableError = (() => {
    if (variables.length === 0) return null;
    const nums = variables.map(v => parseInt(v));
    const sorted = [...nums].sort((a, b) => a - b);
    
    // Check for sequential order (1, 2, 3...)
    for(let i = 0; i < sorted.length; i++) {
        if (sorted[i] !== i + 1) return `As variáveis devem ser sequenciais. Encontrado {{${sorted[i]}}}, mas esperava-se {{${i + 1}}}.`;
    }
    return null;
  })();

  const [isAiEnabled, setIsAiEnabled] = useState(false);

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(c => c + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(c => c - 1);
  };

  // Helper for template step navigation
  const handleTemplateConfigNext = () => {
    setCreationStep('EDIT');
  };

  const handleTemplateEditBack = () => {
    setCreationStep('CONFIG');
  };

  // Handle Selection of an existing Meta Template
  const handleTemplateSelect = (template: MetaTemplate) => {
    // 1. Set Basic Info
    setTemplateName(template.name);
    setTemplateLanguage(template.language);
    setTemplateCategory(template.category);
    
    // 2. Reset Fields
    setHeaderText('');
    setBodyText('');
    setFooterText('');
    setButtons([]);

    // 3. Map Components to State
    template.components.forEach(comp => {
      if (comp.type === 'HEADER' && comp.text) {
        setHeaderText(comp.text);
      }
      if (comp.type === 'BODY' && comp.text) {
        setBodyText(comp.text);
      }
      if (comp.type === 'FOOTER' && comp.text) {
        setFooterText(comp.text);
      }
      if (comp.type === 'BUTTONS' && comp.buttons) {
        const mappedButtons: ButtonConfig[] = comp.buttons.map(btn => ({
          type: btn.type,
          text: btn.text,
          value: btn.url || btn.phone_number || ''
        }));
        setButtons(mappedButtons);
      }
    });

    // 4. Move to Preview/Edit Step
    setCreationStep('EDIT');
  };

  // Function to Save Template ONLY (Does not advance to campaign)
  const handleSaveTemplate = () => {
    if (!templateName) {
        showToast('Por favor, dê um nome ao modelo.', 'error');
        return;
    }
    
    setIsSavingTemplate(true);
    
    // Simulate API Call to save template
    setTimeout(() => {
        setIsSavingTemplate(false);
        showToast('Modelo salvo com sucesso na biblioteca!', 'success');
        
        // Reset and go back to list
        setCreationStep('CONFIG');
        // Optional: clear state if you want a fresh start
        setTemplateName('');
    }, 1500);
  };

  const handleSubmit = () => {
    setIsLoading(true);
    setTimeout(() => {
        setIsLoading(false);
        showToast('Campanha agendada com sucesso!', 'success');
        setCurrentStep(1);
        setCreationStep('CONFIG');
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-primary dark:text-secondary">Criar Nova Campanha</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Configure sua campanha de mensagens em massa.</p>
      </div>

      {/* Main Campaign Stepper */}
      <div className="relative flex justify-between items-center w-full max-w-4xl mx-auto mb-12">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10 -translate-y-1/2 rounded-full" />
        <div 
            className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 rounded-full transition-all duration-500" 
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
        />
        
        {steps.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;
          
          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-background dark:bg-gray-900 px-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isActive || isCompleted 
                    ? 'bg-primary border-primary text-white shadow-lg scale-110' 
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider ${isActive ? 'text-primary dark:text-secondary' : 'text-gray-400 dark:text-gray-500'}`}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 min-h-[600px] flex flex-col overflow-hidden">
        
        {/* STEP 1: MODELO (WhatsApp Manager) */}
        {currentStep === 1 && (
          <div className="flex flex-col h-full">
            {/* Template Sub-Header */}
            <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-8 py-4 flex items-center gap-6 text-sm font-medium text-gray-500 dark:text-gray-400">
                <div className={`flex items-center gap-2 ${creationStep === 'CONFIG' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${creationStep === 'CONFIG' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-400 dark:border-gray-500'}`}>
                        {creationStep === 'EDIT' ? <Check className="w-3 h-3" /> : '1'}
                    </div>
                    Configurar modelo
                </div>
                <div className="h-px w-8 bg-gray-300 dark:bg-gray-600" />
                <div className={`flex items-center gap-2 ${creationStep === 'EDIT' ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${creationStep === 'EDIT' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-400 dark:border-gray-500'}`}>
                        2
                    </div>
                    Editar modelo
                </div>
                <div className="h-px w-8 bg-gray-300 dark:bg-gray-600" />
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs border border-gray-400 dark:border-gray-500">
                        3
                    </div>
                    Enviar para análise
                </div>
            </div>

            <div className="flex flex-1 flex-col lg:flex-row">
                {/* LEFT COLUMN: FORM */}
                <div className="flex-1 p-8 border-r border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[700px]">
                    {creationStep === 'CONFIG' ? (
                        <TemplateConfigStep 
                            category={templateCategory}
                            setCategory={setTemplateCategory}
                            type={templateType}
                            setType={setTemplateType}
                            onSelectTemplate={handleTemplateSelect}
                        />
                    ) : (
                        <TemplateEditStep 
                            name={templateName} setName={setTemplateName}
                            language={templateLanguage} setLanguage={setTemplateLanguage}
                            header={headerText} setHeader={setHeaderText}
                            body={bodyText} setBody={setBodyText}
                            footer={footerText} setFooter={setFooterText}
                            buttons={buttons} setButtons={setButtons}
                            variables={variables}
                            variableValues={variableValues} setVariableValues={setVariableValues}
                            variableError={variableError}
                        />
                    )}
                </div>

                {/* RIGHT COLUMN: PREVIEW */}
                <PhonePreview 
                    header={headerText}
                    body={bodyText}
                    footer={footerText}
                    buttons={buttons}
                    variables={variables}
                    variableValues={variableValues}
                    category={templateCategory}
                />
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center">
                <button 
                    onClick={() => {
                        if (creationStep === 'EDIT') handleTemplateEditBack();
                        else setTemplateName(''); // Reset if cancelling from first step
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    {creationStep === 'CONFIG' ? 'Descartar' : 'Voltar'}
                </button>
                
                <div className="flex items-center gap-3">
                    {/* Add Save Template Button ONLY when Editing */}
                    {creationStep === 'EDIT' && (
                        <button 
                            onClick={handleSaveTemplate}
                            disabled={isSavingTemplate}
                          className="px-6 py-2 border border-primary text-primary dark:text-secondary dark:border-secondary rounded-lg font-bold hover:bg-secondary/10 dark:hover:bg-secondary/15 transition-colors flex items-center gap-2"
                        >
                            {isSavingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Salvar Modelo
                        </button>
                    )}

                    <button 
                        onClick={() => {
                            if (creationStep === 'CONFIG') handleTemplateConfigNext();
                            else handleNext(); // Move to Audience Step
                        }}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        {creationStep === 'CONFIG' ? 'Avançar' : 'Usar na Campanha'}
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* STEP 2: AUDIENCE */}
        {currentStep === 2 && (
          <div className="p-8 space-y-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Selecione o Público-Alvo</h2>
            <div className="space-y-3">
               <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                 <input type="radio" name="audience" className="w-5 h-5 text-primary focus:ring-primary" defaultChecked />
                 <div className="ml-3">
                   <span className="block font-medium text-gray-800 dark:text-gray-200">Todos os Leads</span>
                   <span className="block text-sm text-gray-500 dark:text-gray-400">0 contatos</span>
                 </div>
               </label>
               <label className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                 <input type="radio" name="audience" className="w-5 h-5 text-primary focus:ring-primary" />
                 <div className="ml-3">
                   <span className="block font-medium text-gray-800 dark:text-gray-200">Apenas Novos Leads</span>
                   <span className="block text-sm text-gray-500 dark:text-gray-400">0 contatos (Status: Novo)</span>
                 </div>
               </label>
            </div>
            
             <div className="pt-8 flex justify-between">
                <button onClick={handleBack} className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200">Voltar</button>
                <button onClick={handleNext} className="px-6 py-2 bg-primary text-white rounded-lg font-bold">Próximo</button>
            </div>
          </div>
        )}

        {/* STEP 3: AI CONFIG */}
        {currentStep === 3 && (
            <div className="p-8 space-y-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    Configuração IA <Bot className="text-accent" />
                </h2>
                <div className="bg-accent/5 dark:bg-accent/10 border border-accent/20 dark:border-accent/30 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-200">Ativar Respostas Automáticas da IA</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-md">
                                Se ativado, a IA responderá automaticamente às mensagens recebidas desta campanha usando a persona configurada.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isAiEnabled} onChange={(e) => setIsAiEnabled(e.target.checked)} className="sr-only peer" />
                            <div className="w-14 h-7 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                    </div>
                </div>
                {isAiEnabled && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sobrescrever Instruções do Sistema (Opcional)</label>
                        <textarea 
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-sm focus:ring-accent focus:border-accent bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100" 
                            rows={4}
                            placeholder="Instruções específicas para esta campanha (ex: 'Foque em agendar uma demonstração para a próxima semana')..."
                        />
                    </div>
                )}
                 <div className="pt-8 flex justify-between">
                    <button onClick={handleBack} className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200">Voltar</button>
                    <button onClick={handleNext} className="px-6 py-2 bg-primary text-white rounded-lg font-bold">Próximo</button>
                </div>
            </div>
        )}

        {/* STEP 4: SCHEDULE */}
        {currentStep === 4 && (
             <div className="p-8 space-y-6">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Agendar e Revisar</h2>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-6 space-y-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
                        <span className="text-gray-500 dark:text-gray-400">Modelo</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">{templateName || 'Novo Modelo'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
                        <span className="text-gray-500 dark:text-gray-400">Público</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">Todos os Leads</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
                        <span className="text-gray-500 dark:text-gray-400">Resposta Automática IA</span>
                        <span className={`font-medium ${isAiEnabled ? 'text-accent' : 'text-gray-400'}`}>
                            {isAiEnabled ? 'Ativado' : 'Desativado'}
                        </span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Horário de Envio</label>
                    <div className="relative max-w-xs">
                        <input type="datetime-local" className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 w-full focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-200" />
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none bg-white dark:bg-transparent" />
                    </div>
                </div>

                <div className="pt-8 flex justify-between">
                    <button onClick={handleBack} className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200">Voltar</button>
                     <button 
                        onClick={handleSubmit}
                        disabled={isLoading}
                      className="px-8 py-2 bg-secondary text-white rounded-lg font-bold hover:bg-secondary-dark transition-colors shadow-md flex items-center gap-2"
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isLoading ? 'Agendando...' : 'Lançar Campanha'}
                    </button>
                </div>
             </div>
        )}
      </div>
    </div>
  );
};

export default Campaigns;