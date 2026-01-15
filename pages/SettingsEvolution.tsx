import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SettingsContext } from './Settings';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { 
  Server, 
  CheckCircle, 
  RefreshCw, 
  Loader2, 
  List, 
  QrCode, 
  Copy, 
  Phone, 
  Key, 
  Search, 
  Check, 
  Wifi, 
  LogOut, 
  Trash2,
  AlertCircle
  , Sliders
} from 'lucide-react';

const SettingsEvolution: React.FC = () => {
  const ctx = useContext(SettingsContext);
  const { currentOrganization } = useAuth();

  const [instanceLimit, setInstanceLimit] = useState<number>(2);
  const [isLoadingInstanceLimit, setIsLoadingInstanceLimit] = useState<boolean>(false);
  
  if (!ctx) return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const {
    // Conexão Principal
    evolutionUrl, setEvolutionUrl, 
    evolutionInstance, setEvolutionInstance, 
    evolutionApiKey, setEvolutionApiKey, 
    showEvolutionKey, setShowEvolutionKey, 
    handleSaveEvolution, isSavingEvolution,

    // Criação de Nova Instância
    newInstanceBaseUrl, setNewInstanceBaseUrl, 
    evolutionGlobalKey, setEvolutionGlobalKey, 
    showGlobalKey, setShowGlobalKey, 
    newInstanceName, setNewInstanceName, 
    newInstancePhone, setNewInstancePhone, 
    newInstanceToken, generateRandomInstanceToken, 
    handleCreateInstance, isCreatingInstance,

    // Gerenciamento e Listagem
    fetchedInstances, isFetchingInstances, handleFetchInstances, handleCopyToken,
    
    // QR Code
    connectInstanceName, setConnectInstanceName, 
    connectApiKey, setConnectApiKey, 
    isGeneratingQr, qrCodeBase64, handleGetQrCode,

    // Métodos Avançados (Evolution API)
    isProcessingAction, 
    handleSetPresence, 
    handleGetConnectionStatus, 
    handleLogoutInstance, 
    handleDeleteInstance, 
    showToast,

    // Webhook
    webhookUrl, setWebhookUrl,
    webhookEnabled, setWebhookEnabled,
    webhookBase64, setWebhookBase64,
    webhookByEvents, setWebhookByEvents,
    selectedEvents, setSelectedEvents,
    isProcessingWebhook,
    handleSetWebhook, handleFindWebhook,
    // Configurações adicionais da instância (Evolution API)
    rejectCall, setRejectCall,
    msgCall, setMsgCall,
    groupsIgnore, setGroupsIgnore,
    alwaysOnline, setAlwaysOnline,
    readMessages, setReadMessages,
    readStatus, setReadStatus,
    syncFullHistory, setSyncFullHistory,
    isProcessingSettings,
    handleSetSettings, handleFindSettings,
  } = ctx as any;

  useEffect(() => {
    const orgId = currentOrganization?.id;

    // Fallback default
    if (!orgId) {
      setInstanceLimit(2);
      return;
    }

    // Prefer value if already present on context
    const contextLimit = (currentOrganization as any)?.instance_limit;
    if (typeof contextLimit === 'number' && Number.isFinite(contextLimit)) {
      setInstanceLimit(contextLimit || 2);
      return;
    }

    let isCancelled = false;

    const loadLimit = async () => {
      setIsLoadingInstanceLimit(true);
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('instance_limit')
          .eq('id', orgId)
          .single();

        if (error) throw error;
        const limitValue = (data as any)?.instance_limit;
        const normalized = typeof limitValue === 'number' && Number.isFinite(limitValue) ? limitValue : null;
        if (!isCancelled) setInstanceLimit(normalized ?? 2);
      } catch {
        if (!isCancelled) setInstanceLimit(2);
      } finally {
        if (!isCancelled) setIsLoadingInstanceLimit(false);
      }
    };

    loadLimit();
    return () => {
      isCancelled = true;
    };
  }, [currentOrganization?.id]);

  const instancesCount = useMemo(() => {
    return Array.isArray(fetchedInstances) ? fetchedInstances.length : 0;
  }, [fetchedInstances]);

  const isInstanceLimitReached = useMemo(() => {
    return instancesCount >= (instanceLimit ?? 2);
  }, [instancesCount, instanceLimit]);

  return (
    <div className="space-y-6 pb-10">
      
      {/* 1. CONECTAR INSTÂNCIA EXISTENTE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-500" /> Conectar Instância Evolution Existente
            </h2>
            <Link to="/settings" className="px-4 py-1.5 bg-primary text-white rounded-md text-sm font-bold hover:bg-[#004a3c] transition-all">Voltar</Link>
        </div>
        <div className="p-8 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL da API Evolution</label>
                    <input type="text" value={evolutionUrl} onChange={(e) => setEvolutionUrl(e.target.value)} placeholder="https://api.seudominio.com" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Instância</label>
                    <input type="text" value={evolutionInstance} onChange={(e) => setEvolutionInstance(e.target.value)} placeholder="Ex: Principal" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-ray-600 dark:text-gray-400 mb-1">Token da Instância (Access Token)</label>
                    <div className="relative">
                        <input type={showEvolutionKey ? "text" : "password"} value={evolutionApiKey} onChange={(e) => setEvolutionApiKey(e.target.value)} placeholder="Token específico..." className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pr-12 focus:ring-2 focus:ring-primary/20 outline-none" />
                        <button onClick={() => setShowEvolutionKey(!showEvolutionKey)} className="absolute right-3 top-2.5 text-xs font-bold text-gray-400 uppercase">{showEvolutionKey ? 'Ocultar' : 'Mostrar'}</button>
                    </div>
                </div>
             </div>
             <div className="flex items-center justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                 <button onClick={handleSaveEvolution} disabled={isSavingEvolution} className="px-6 py-2 bg-primary text-white rounded-lg font-bold flex items-center gap-2 hover:bg-[#004a3c] transition-all shadow-md active:scale-95">
                    {isSavingEvolution ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Salvar Conexão Operacional
                 </button>
             </div>
        </div>
      </div>

      {/* 2. CRIAR NOVA INSTÂNCIA */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors border-t-4 border-t-primary mt-6">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" /> Criar Nova Instância no Servidor
            </h2>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL Base do Servidor</label>
              <input type="text" value={newInstanceBaseUrl} onChange={(e) => setNewInstanceBaseUrl(e.target.value)} placeholder="https://api.seudominio.com" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-primary mb-1">Global API Key (Chave Administrativa)</label>
              <div className="relative">
                <input type={showGlobalKey ? "text" : "password"} value={evolutionGlobalKey} onChange={(e) => setEvolutionGlobalKey(e.target.value)} placeholder="Master Key do seu servidor Evolution..." className="w-full border border-primary/30 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pr-12 focus:ring-2 focus:ring-primary/20 outline-none" />
                <button onClick={() => setShowGlobalKey(!showGlobalKey)} className="absolute right-3 top-2.5 text-xs font-bold text-gray-400 uppercase">{showGlobalKey ? 'Ocultar' : 'Mostrar'}</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Nova Instância</label>
              <input type="text" value={newInstanceName} onChange={(e) => setNewInstanceName(e.target.value)} placeholder="Ex: Vendas_Setor_01" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone (Opcional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input type="text" value={newInstancePhone} onChange={(e) => setNewInstancePhone(e.target.value)} placeholder="5511999999999" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 pl-10 bg-white dark:bg-gray-700" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Token de Acesso (Gerado automaticamente)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                  <input type="text" value={newInstanceToken} readOnly className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 pl-10 bg-gray-50 dark:bg-gray-900/30 text-gray-500 font-mono text-xs cursor-not-allowed" />
                </div>
                <button onClick={generateRandomInstanceToken} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 transition-colors" title="Gerar novo token"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
                <button onClick={() => handleCopyToken(newInstanceToken)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition-colors"><Copy className="w-4 h-4 text-gray-500" /></button>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
            {isInstanceLimitReached && (
              <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                <AlertCircle className="w-4 h-4" />
                <span>
                  Limite de instâncias do seu plano atingido ({instancesCount}/{instanceLimit}). Faça upgrade para adicionar mais.
                </span>
              </div>
            )}
            <button
              onClick={handleCreateInstance}
              disabled={isCreatingInstance || isLoadingInstanceLimit || isInstanceLimitReached || !newInstanceName || !evolutionGlobalKey}
              className="px-8 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-[#004a3c] transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
              title={isInstanceLimitReached ? 'Limite de instâncias atingido' : undefined}
            >
              {isCreatingInstance ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Criar Instância
            </button>
          </div>
        </div>
      </div>

      {/* 3. GERENCIAR INSTÂNCIAS - VISUAL VERDE [#004a3c] */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors border-t-4 border-t-[#004a3c] mt-6">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
          <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <List className="w-5 h-5 text-[#004a3c]" /> Gerenciar Instâncias do Servidor
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Status em tempo real, presença e manutenção de instâncias.</p>
          </div>
          <button 
              onClick={handleFetchInstances} 
              disabled={isFetchingInstances || !evolutionGlobalKey}
              className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-[#004a3c] transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
          >
              {isFetchingInstances ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isFetchingInstances ? 'Buscando...' : 'Buscar Instâncias'}
          </button>
        </div>

        <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Evolution API URL</label>
                    <input type="text" value={newInstanceBaseUrl} onChange={(e) => setNewInstanceBaseUrl(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="https://api..." />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Global API Key</label>
                    <input type="password" value={evolutionGlobalKey} onChange={(e) => setEvolutionGlobalKey(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="Sua Global Key..." />
                </div>
            </div>

            {fetchedInstances.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Instância</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Token</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações Avançadas</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {fetchedInstances.map((inst: any) => (
                                <tr key={inst.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-gray-900 dark:text-gray-100">
                                            {inst.profilePicUrl ? (
                                                <img className="h-8 w-8 rounded-full mr-3 border border-gray-200" src={inst.profilePicUrl} alt="" />
                                            ) : (
                                              <div className="h-8 w-8 rounded-full mr-3 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">{inst.name.substring(0,2).toUpperCase()}</div>
                                            )}
                                            <span className="text-sm font-bold">{inst.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 inline-flex text-[10px] font-black uppercase rounded-full ${inst.connectionStatus === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                            {inst.connectionStatus === 'open' ? 'Conectado' : 'Desconectado'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400 font-mono truncate max-w-[100px]">{inst.token}</span>
                                            <button onClick={() => handleCopyToken(inst.token)} className="text-gray-400 hover:text-primary"><Copy className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                          <button onClick={() => handleGetConnectionStatus(inst.name, inst.token)} className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-primary hover:text-white transition-all" title="Verificar Status"><Wifi className="w-4 h-4" /></button>
                                          
                                          <button onClick={() => {
                                              const val = prompt("Definir presença: 'available' (Online) ou 'unavailable' (Offline)");
                                              if (val === 'available' || val === 'unavailable') handleSetPresence(inst.name, val, inst.token);
                                          }} className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-primary hover:text-white transition-all" title="Alterar Presença"><Search className="w-4 h-4" /></button>
                                          
                                          <button onClick={() => confirm(`Desconectar WhatsApp de "${inst.name}"?`) && handleLogoutInstance(inst.name, inst.token)} className="p-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 rounded hover:bg-yellow-500 hover:text-white transition-all" title="Logout Instance"><LogOut className="w-4 h-4" /></button>
                                          
                                          <button onClick={() => confirm(`APAGAR PERMANENTEMENTE a instância "${inst.name}"?`) && handleDeleteInstance(inst.name)} className="p-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 rounded hover:bg-red-600 hover:text-white transition-all" title="Deletar do Servidor"><Trash2 className="w-4 h-4" /></button>

                                          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                                          
                                          <button onClick={() => {
                                              setEvolutionUrl(newInstanceBaseUrl.replace(/\/$/, ''));
                                              setEvolutionInstance(inst.name);
                                              setEvolutionApiKey(inst.token);
                                              handleFindWebhook(inst.name, inst.token); // Sincroniza os campos de Webhook automaticamente
                                              showToast && showToast(`Dados de "${inst.name}" carregados!`, 'success');
                                          }} className="px-3 py-1 bg-primary text-white rounded text-xs font-bold hover:bg-[#004a3c] transition-all">USAR</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-400">
                    <List className="w-12 h-12 mb-3 opacity-10" />
                    <p className="text-sm font-medium">Nenhuma instância listada. Clique em "Buscar".</p>
                </div>
            )}
        </div>
      </div>

      {/* 4. GERAR QR CODE - VISUAL VERDE [#004a3c] */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors border-t-4 border-t-[#004a3c] mt-6">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#004a3c]" /> Gerar QR Code de Conexão
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gere o código para parear seu celular com a instância Evolution (Baileys).</p>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Instância</label>
                <input type="text" value={connectInstanceName} onChange={(e) => setConnectInstanceName(e.target.value)} placeholder="Nome da instância criada..." className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Token da Instância</label>
                <input type="password" value={connectApiKey} onChange={(e) => setConnectApiKey(e.target.value)} placeholder="Token da instância..." className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700" />
              </div>
              <button onClick={handleGetQrCode} disabled={isGeneratingQr || !connectInstanceName || !connectApiKey} className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-[#004a3c] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                {isGeneratingQr ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />} 
                {isGeneratingQr ? 'Gerando...' : 'Gerar QR Code Agora'}
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-900/30 min-h-[320px]">
              {qrCodeBase64 ? (
                <div className="text-center animate-in zoom-in duration-300">
                  <div className="bg-white p-4 rounded-xl shadow-xl mb-4 border border-gray-100">
                    <img src={qrCodeBase64} alt="QR Code" className="w-56 h-56 mx-auto" />
                  </div>
                  <p className="text-sm font-black text-[#004a3c] uppercase tracking-wider">Escaneie com seu WhatsApp</p>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase">O código expira em breve.</p>
                </div>
              ) : (
                <div className="text-center text-gray-300 flex flex-col items-center">
                  <QrCode className="w-16 h-16 mb-4 opacity-10" />
                  <p className="text-sm">Aguardando dados para geração...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. CONFIGURAÇÃO DE WEBHOOK */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-500" /> Configuração de Webhook para: {evolutionInstance || 'Nenhuma instância selecionada'}
          </h2>
        </div>
        <div className="p-8 space-y-6">
          {(!evolutionInstance || !evolutionApiKey) ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p>Selecione uma instância e seu token para configurar o webhook.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL do Webhook</label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://seuwebhook.com/webhook"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                
                {/* Toggles de Configurações Rápidas */}
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={webhookEnabled}
                      onChange={(e) => setWebhookEnabled(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 focus:ring-primary/20"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Habilitar Webhook</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={webhookBase64}
                      onChange={(e) => setWebhookBase64(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 focus:ring-primary/20"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enviar em Base64</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={webhookByEvents}
                      onChange={(e) => setWebhookByEvents(e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 focus:ring-primary/20"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Webhook por Eventos</span>
                  </label>
                </div>

                {/* Grade de Eventos */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Eventos</label>
                  <div className="flex flex-col gap-2 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                    {[
                      "APPLICATION_STARTUP", "QRCODE_UPDATED", "MESSAGES_SET",
                      "MESSAGES_UPSERT", "MESSAGES_UPDATE", "MESSAGES_DELETE",
                      "SEND_MESSAGE", "CONTACTS_SET", "CONTACTS_UPSERT",
                      "CONTACTS_UPDATE", "PRESENCE_UPDATE", "CHATS_SET",
                      "CHATS_UPSERT", "CHATS_UPDATE", "CHATS_DELETE",
                      "GROUPS_UPSERT", "GROUP_UPDATE", "GROUP_PARTICIPANTS_UPDATE",
                      "CONNECTION_UPDATE", "LABELS_EDIT", "LABELS_ASSOCIATION",
                      "CALL", "TYPEBOT_START", "TYPEBOT_CHANGE_STATUS"
                    ].map((event) => (
                      <label key={event} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{event}</span>
                        <div className="relative inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedEvents.includes(event)}
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              if (isChecked) {
                                setSelectedEvents([...selectedEvents, event]);
                              } else {
                                setSelectedEvents(selectedEvents.filter((ev) => ev !== event));
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer-focus:outline-none dark:bg-gray-700 peer-checked:bg-[#004a3c] peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => handleFindWebhook(evolutionInstance, evolutionApiKey)}
                  disabled={isProcessingWebhook || !evolutionInstance || !evolutionApiKey}
                  className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all shadow-md active:scale-95"
                >
                  {isProcessingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Consultar Atual
                </button>
                <button
                  onClick={() => handleSetWebhook(evolutionInstance, evolutionApiKey)}
                  disabled={isProcessingWebhook || !evolutionInstance || !evolutionApiKey}
                  className="px-6 py-2 bg-primary text-white rounded-lg font-bold flex items-center gap-2 hover:bg-[#004a3c] transition-all shadow-md active:scale-95"
                >
                  {isProcessingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Salvar Webhook
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 6. CONFIGURAÇÕES DA INSTÂNCIA */}
      {(evolutionInstance && evolutionApiKey) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors mt-6">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" /> Configurações da Instância
            </h2>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Rejeitar Ligações</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={rejectCall} onChange={e => setRejectCall(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#004a3c]"></div>
                </div>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ignorar Grupos</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={groupsIgnore} onChange={e => setGroupsIgnore(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#004a3c]"></div>
                </div>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Always Online</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={alwaysOnline} onChange={e => setAlwaysOnline(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#004a3c]"></div>
                </div>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Marcar Mensagens como Lidas</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={readMessages} onChange={e => setReadMessages(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#004a3c]"></div>
                </div>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Marcar Status como Lido</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={readStatus} onChange={e => setReadStatus(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#004a3c]"></div>
                </div>
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sincronizar Histórico Completo</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={syncFullHistory} onChange={e => setSyncFullHistory(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#004a3c]"></div>
                </div>
              </label>
            </div>

            {rejectCall && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensagem ao Rejeitar Ligação</label>
                <input type="text" value={msgCall} onChange={e => setMsgCall(e.target.value)} placeholder="Ex: Não aceitamos ligações neste número." className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>
            )}

            <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => handleFindSettings(evolutionInstance, evolutionApiKey)}
                disabled={isProcessingSettings || !evolutionInstance || !evolutionApiKey}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all shadow-md active:scale-95"
              >
                {isProcessingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Consultar Configurações
              </button>
              <button
                onClick={() => handleSetSettings(evolutionInstance, evolutionApiKey)}
                disabled={isProcessingSettings || !evolutionInstance || !evolutionApiKey}
                className="px-6 py-2 bg-primary text-white rounded-lg font-bold flex items-center gap-2 hover:bg-[#004a3c] transition-all shadow-md active:scale-95"
              >
                {isProcessingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsEvolution;