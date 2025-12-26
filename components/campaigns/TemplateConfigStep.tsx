import React, { useEffect, useState } from 'react';
import { Megaphone, Bell, ShieldCheck, LayoutTemplate, Grid, MessageSquare, Plus, FolderOpen, Search, CheckCircle, XCircle, Clock, Loader2, RefreshCw } from 'lucide-react';
import { MetaTemplate, TemplateCategory, TemplateType } from '../../types';
import { fetchMetaTemplates } from '../../services/metaService';

interface TemplateConfigStepProps {
  category: TemplateCategory;
  setCategory: (c: TemplateCategory) => void;
  type: TemplateType;
  setType: (t: TemplateType) => void;
  onSelectTemplate: (template: MetaTemplate) => void;
}

const TemplateConfigStep: React.FC<TemplateConfigStepProps> = ({ 
  category, setCategory, type, setType, onSelectTemplate 
}) => {
  
  const [activeTab, setActiveTab] = useState<'CREATE' | 'SELECT'>('SELECT');
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getCategoryIcon = (cat: TemplateCategory) => {
    switch(cat) {
      case 'MARKETING': return <Megaphone className="w-4 h-4" />;
      case 'UTILITY': return <Bell className="w-4 h-4" />;
      case 'AUTHENTICATION': return <ShieldCheck className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: MetaTemplate['status']) => {
    switch (status) {
      case 'APPROVED': return <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Aprovado</span>;
      case 'REJECTED': return <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Rejeitado</span>;
      case 'PENDING': return <span className="flex items-center gap-1 text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" /> Pendente</span>;
      default: return null;
    }
  };

  useEffect(() => {
    if (activeTab === 'SELECT' && templates.length === 0) {
      loadTemplates();
    }
  }, [activeTab]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMetaTemplates();
      setTemplates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-left-4 fade-in duration-300">
      
      {/* Top Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-lg w-full max-w-md">
        <button 
          onClick={() => setActiveTab('SELECT')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'SELECT' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <FolderOpen className="w-4 h-4" /> Meus Modelos
        </button>
        <button 
          onClick={() => setActiveTab('CREATE')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'CREATE' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Plus className="w-4 h-4" /> Criar do Zero
        </button>
      </div>

      {activeTab === 'CREATE' ? (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Configurar novo modelo</h2>
              <p className="text-gray-600 text-sm">Escolha a categoria e o tipo para começar um novo modelo.</p>
            </div>

            {/* Category Tabs */}
            <div className="flex border-b border-gray-200">
              {(['MARKETING', 'UTILITY', 'AUTHENTICATION'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-3 px-6 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${
                    category === cat 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {getCategoryIcon(cat)}
                  {cat === 'MARKETING' ? 'Marketing' : cat === 'UTILITY' ? 'Utilidade' : 'Autenticação'}
                </button>
              ))}
            </div>

            {/* Radio Options */}
            <div className="space-y-4">
              <label className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all ${type === 'STANDARD' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'hover:bg-gray-50 border-gray-200'}`}>
                  <input type="radio" name="type" className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500" checked={type === 'STANDARD'} onChange={() => setType('STANDARD')} />
                  <div className="ml-3">
                      <div className="flex items-center gap-2">
                          <LayoutTemplate className={`w-5 h-5 ${type === 'STANDARD' ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="block font-bold text-gray-900">Padrão</span>
                      </div>
                      <span className="block text-sm text-gray-500 mt-1">Envie mensagens com mídia e botões personalizados para engajar seus clientes.</span>
                  </div>
              </label>

              <label className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all ${type === 'CATALOG' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'hover:bg-gray-50 border-gray-200'}`}>
                  <input type="radio" name="type" className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500" checked={type === 'CATALOG'} onChange={() => setType('CATALOG')} />
                  <div className="ml-3">
                      <div className="flex items-center gap-2">
                          <Grid className={`w-5 h-5 ${type === 'CATALOG' ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="block font-bold text-gray-900">Catálogo</span>
                      </div>
                      <span className="block text-sm text-gray-500 mt-1">Envie mensagens para aumentar as vendas conectando seu catálogo de produtos.</span>
                  </div>
              </label>

              <label className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-all ${type === 'FLOWS' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'hover:bg-gray-50 border-gray-200'}`}>
                  <input type="radio" name="type" className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500" checked={type === 'FLOWS'} onChange={() => setType('FLOWS')} />
                  <div className="ml-3">
                      <div className="flex items-center gap-2">
                          <MessageSquare className={`w-5 h-5 ${type === 'FLOWS' ? 'text-blue-600' : 'text-gray-400'}`} />
                          <span className="block font-bold text-gray-900">Flows</span>
                      </div>
                      <span className="block text-sm text-gray-500 mt-1">Envie um formulário para coletar interesses dos clientes e pedidos ou pesquisas.</span>
                  </div>
              </label>
            </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
           <div className="flex justify-between items-center mb-4">
             <div>
                <h2 className="text-xl font-bold text-gray-900">Meus Modelos</h2>
                <p className="text-gray-600 text-sm">Selecione um modelo existente sincronizado da Meta.</p>
             </div>
             <button onClick={loadTemplates} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" title="Atualizar Lista">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
             </button>
           </div>
           
           <div className="relative">
             <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
             <input 
               type="text" 
               placeholder="Buscar modelos..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-primary focus:border-primary text-gray-700 placeholder-gray-400"
             />
           </div>

           {isLoading ? (
             <div className="flex justify-center py-12">
               <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
             </div>
           ) : filteredTemplates.length === 0 ? (
             <div className="text-center py-12 text-gray-400 border border-dashed border-gray-300 rounded-lg">
               Nenhum modelo encontrado.
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-2">
                {filteredTemplates.map(template => (
                  <div 
                    key={template.id} 
                    onClick={() => onSelectTemplate(template)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md hover:bg-blue-50/50 cursor-pointer transition-all group"
                  >
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-800 text-sm group-hover:text-blue-700">{template.name}</h3>
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">{template.language}</span>
                        </div>
                        {getStatusBadge(template.status)}
                     </div>
                     <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                        {template.components.find(c => c.type === 'BODY')?.text}
                     </p>
                     <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                        {getCategoryIcon(template.category)}
                        {template.category}
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default TemplateConfigStep;