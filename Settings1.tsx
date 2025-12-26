import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Globe, 
  Clock, 
  MapPin, 
  MessageSquare, 
  Eye, 
  EyeOff, 
  Copy, 
  RefreshCw, 
  CheckCircle, 
  Wifi, 
  Loader2, 
  AlertCircle, 
  Check, 
  Server, 
  Key,    
  Shield,
  Phone,
  Search, // Adicionado para a busca
  List    // Adicionado para a tabela
} from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { getWhatsAppConfig, saveWhatsAppConfig } from '../services/whatsappConfigService';
import { supabase } from '../services/supabaseClient';

const Settings: React.FC = () => {
  const { showToast } = useToast();
  const { currentOrganization, isLoading: isAuthLoading } = useAuth();
  
  // Regional Settings State
  const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selectedZone, setSelectedZone] = useState<string>(() => {
    return localStorage.getItem('sendsales_timezone') || defaultTimeZone;
  });
  const [currentTime, setCurrentTime] = useState<string>('');
  
  // WhatsApp Settings State (Meta API Oficial)
  const [wabaId, setWabaId] = useState('');
  const [phoneId, setPhoneId] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showAccessToken, setShowAccessToken] = useState(false);
  
  // Evolution API State (Conexão Operacional de Instância Única)
  const [evolutionUrl, setEvolutionUrl] = useState('');
  const [evolutionApiKey, setEvolutionApiKey] = useState(''); 
  const [evolutionInstance, setEvolutionInstance] = useState('');
  const [showEvolutionKey, setShowEvolutionKey] = useState(false);
  const [isSavingEvolution, setIsSavingEvolution] = useState(false);

  // --- ESTADOS: Criação e Busca de Instâncias Evolution ---
  const [evolutionGlobalKey, setEvolutionGlobalKey] = useState(''); 
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstancePhone, setNewInstancePhone] = useState('');
  const [newInstanceBaseUrl, setNewInstanceBaseUrl] = useState(''); 
  const [newInstanceToken, setNewInstanceToken] = useState('');
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [showGlobalKey, setShowGlobalKey] = useState(false);

  // --- ESTADOS: Busca de Instâncias ---
  const [fetchedInstances, setFetchedInstances] = useState<any[]>([]);
  const [isFetchingInstances, setIsFetchingInstances] = useState(false);

  // UI States
  const [isSavingRegional, setIsSavingRegional] = useState(false);
  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const timeZones = (Intl as any).supportedValuesOf 
    ? (Intl as any).supportedValuesOf('timeZone') 
    : [defaultTimeZone];

  // Load Configs on Mount
  useEffect(() => {
    if (!currentOrganization) return;

    const loadConfig = async () => {
        setIsLoadingConfig(true);
        const config = await getWhatsAppConfig(currentOrganization.id);
        if (config) {
            setWabaId(config.waba_id || '');
            setPhoneId(config.phone_number_id || '');
            setVerifyToken(config.verify_token || '');
            setAccessToken(config.access_token || '');
            
            if ((config as any).evolution_url) {
                setEvolutionUrl((config as any).evolution_url);
                setNewInstanceBaseUrl((config as any).evolution_url);
            }
            if ((config as any).evolution_api_key) setEvolutionApiKey((config as any).evolution_api_key);
            if ((config as any).evolution_instance) setEvolutionInstance((config as any).evolution_instance);

            if (config.phone_number_id && config.access_token) {
               setConnectionStatus('idle'); 
            }
        }
        setIsLoadingConfig(false);
    };
    loadConfig();
    generateRandomInstanceToken();
  }, [currentOrganization]);

  // Clock Ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      try {
        const formatted = formatInTimeZone(now, selectedZone, 'dd/MM/yyyy HH:mm:ss');
        setCurrentTime(formatted);
      } catch (error) {
        setCurrentTime('Erro ao calcular horário');
      }
    };
    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, [selectedZone]);

  // --- LÓGICA DE CRIAÇÃO ---
  const generateRandomInstanceToken = () => {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const token = Array.from(array, (byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join('');
    setNewInstanceToken(token);
  };

  const handleCreateInstance = async () => {
    if (!newInstanceName || !newInstanceBaseUrl || !evolutionGlobalKey) {
        showToast('URL Base, Nome e Global Key são obrigatórios.', 'error');
        return;
    }
    setIsCreatingInstance(true);
    try {
        const baseUrl = newInstanceBaseUrl.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/instance/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': evolutionGlobalKey
            },
            body: JSON.stringify({
                instanceName: newInstanceName,
                token: newInstanceToken,
                number: newInstancePhone || undefined,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS"
            })
        });
        const data = await response.json();
        if (response.ok) {
            showToast(`Instância "${newInstanceName}" criada!`, 'success');
            setNewInstanceName('');
            setNewInstancePhone('');
            generateRandomInstanceToken();
            // Atualiza a lista automaticamente após criar
            handleFetchInstances();
        } else {
            throw new Error(data.message || 'Erro ao criar instância.');
        }
    } catch (err: any) {
        showToast(err.message || 'Erro de conexão.', 'error');
    } finally {
        setIsCreatingInstance(false);
    }
  };

  // --- LÓGICA DE BUSCA DE INSTÂNCIAS ---
  const handleFetchInstances = async () => {
    if (!newInstanceBaseUrl || !evolutionGlobalKey) {
        showToast('Informe a URL Base e a Global API Key para buscar.', 'error');
        return;
    }

    setIsFetchingInstances(true);
    setFetchedInstances([]); // Limpa a tabela antes de buscar

    try {
        const baseUrl = newInstanceBaseUrl.replace(/\/$/, '');
        const response = await fetch(`${baseUrl}/instance/fetchInstances`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'apikey': evolutionGlobalKey
            }
        });

        const data = await response.json();

        if (response.ok && Array.isArray(data)) {
            setFetchedInstances(data);
            showToast(`${data.length} instâncias encontradas no servidor.`, 'success');
        } else {
            throw new Error(data.message || 'Falha ao buscar instâncias.');
        }
    } catch (err: any) {
        console.error('Erro na busca:', err);
        showToast(err.message || 'Erro ao comunicar com o servidor Evolution.', 'error');
    } finally {
        setIsFetchingInstances(false);
    }
  };

  // --- AÇÕES GERAIS ---
  const handleSaveRegional = () => {
    setIsSavingRegional(true);
    localStorage.setItem('sendsales_timezone', selectedZone);
    setTimeout(() => {
        setIsSavingRegional(false);
        showToast('Preferências regionais salvas!', 'success');
    }, 600);
  };

  const handleSaveWhatsApp = async () => {
    if (!currentOrganization) return;
    setIsSavingWhatsApp(true);
    const result = await saveWhatsAppConfig({
        organization_id: currentOrganization.id,
        waba_id: wabaId,
        phone_number_id: phoneId,
        verify_token: verifyToken,
        access_token: accessToken
    });
    setIsSavingWhatsApp(false);
    if (result.success) showToast('WhatsApp Meta salvo!', 'success');
  };

  const handleSaveEvolution = async () => {
    if (!currentOrganization) return;
    setIsSavingEvolution(true);
    try {
        const { error } = await supabase
            .from('organizations') 
            .update({
                evolution_url: evolutionUrl,
                evolution_api_key: evolutionApiKey,
                evolution_instance: evolutionInstance,
                updated_at: new Date()
            })
            .eq('id', currentOrganization.id);
        if (error) throw error;
        showToast('Conexão operacional salva!', 'success');
    } catch (error) {
        showToast('Erro ao salvar conexão Evolution.', 'error');
    } finally {
        setIsSavingEvolution(false);
    }
  };

  const handleCopyToken = (text: string) => {
      if (text) {
          navigator.clipboard.writeText(text);
          showToast('Copiado para a área de transferência!', 'info');
      }
  };

  const handleGenerateToken = () => {
      setVerifyToken('ver_' + Math.random().toString(36).substring(2, 15));
  };

  const handleTestConnection = async () => {
      if (!phoneId || !accessToken) return;
      setIsTestingConnection(true);
      try {
          const { data } = await supabase.functions.invoke('test-whatsapp-connection', {
              body: { phone_number_id: phoneId, access_token: accessToken }
          });
          if (data?.success) {
              setConnectionStatus('success');
              showToast('Conexão oficial estabelecida!', 'success');
          } else {
              setConnectionStatus('error');
          }
      } catch (err) {
          setConnectionStatus('error');
      } finally {
          setIsTestingConnection(false);
      }
  };

  if (isAuthLoading) return (
    <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary dark:text-secondary">Configurações</h1>
          {currentOrganization && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Organização: <span className="font-semibold">{currentOrganization.name}</span>
              </p>
          )}
        </div>
      </div>

      {/* 1. REGIONAL SETTINGS CARD */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary dark:text-secondary" /> Configurações Regionais
            </h2>
        </div>
        <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fuso Horário</label>
                        <select 
                            value={selectedZone}
                            onChange={(e) => setSelectedZone(e.target.value)}
                            className="w-full pl-4 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100"
                        >
                            {timeZones.map((tz: string) => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                        </select>
                    </div>
                    <button onClick={handleSaveRegional} disabled={isSavingRegional} className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-[#004a3c] transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-70 self-start">
                        {isSavingRegional ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Preferências
                    </button>
                </div>
                <div className="bg-[#F8FAFC] dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-8 flex flex-col justify-center items-center text-center">
                    <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm mb-4 border border-gray-100 dark:border-gray-700">
                        <Clock className="w-6 h-6 text-primary dark:text-secondary" />
                    </div>
                    <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 tabular-nums">{currentTime || '--/--/---- --:--:--'}</div>
                </div>
            </div>
        </div>
      </div>

      {/* 2. WHATSAPP META CARD */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-secondary" /> Conexão WhatsApp API (Meta Oficial)
            </h2>
            {connectionStatus === 'success' && <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Conectado</span>}
        </div>
        <div className={`p-8 space-y-6 ${isLoadingConfig ? 'opacity-50 pointer-events-none' : ''}`}>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WABA ID</label>
                    <input type="text" value={wabaId} onChange={(e) => setWabaId(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number ID</label>
                    <input type="text" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Token</label>
                    <div className="relative">
                        <input type={showAccessToken ? "text" : "password"} value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 pr-12 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                        <button onClick={() => setShowAccessToken(!showAccessToken)} className="absolute right-3 top-2.5 text-gray-400">{showAccessToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                    </div>
                </div>
             </div>
             <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                 <button onClick={handleTestConnection} disabled={isTestingConnection || !phoneId} className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                     {isTestingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />} Testar Conexão Oficial
                 </button>
                 <button onClick={handleSaveWhatsApp} disabled={isSavingWhatsApp} className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-[#004a3c] transition-colors shadow-md">Salvar Credenciais Meta</button>
             </div>
        </div>
      </div>

      {/* 3. CONECTAR INSTÂNCIA EXISTENTE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-500" /> Conectar Instância Evolution Existente
            </h2>
        </div>
        <div className="p-8 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL da API Evolution</label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                        <input type="text" value={evolutionUrl} onChange={(e) => setEvolutionUrl(e.target.value)} placeholder="https://api.seudominio.com" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Instância</label>
                    <input type="text" value={evolutionInstance} onChange={(e) => setEvolutionInstance(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Token da Instância (Access Token)</label>
                    <div className="relative">
                        <input type={showEvolutionKey ? "text" : "password"} value={evolutionApiKey} onChange={(e) => setEvolutionApiKey(e.target.value)} placeholder="Token específico..." className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pr-12" />
                        <button onClick={() => setShowEvolutionKey(!showEvolutionKey)} className="absolute right-3 top-2.5 text-gray-400">{showEvolutionKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                    </div>
                </div>
             </div>
             <div className="flex items-center justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                 <button onClick={handleSaveEvolution} disabled={isSavingEvolution} className="px-6 py-2 bg-primary text-white rounded-lg font-bold flex items-center gap-2 hover:bg-[#004a3c] transition-colors shadow-md">
                    {isSavingEvolution ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Conexão Operacional
                 </button>
             </div>
        </div>
      </div>

      {/* 4. CRIAR NOVA INSTÂNCIA */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors border-t-4 border-t-primary">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" /> Criar Nova Instância (Requer Chave Geral)
            </h2>
        </div>
        <div className="p-8 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL Base do Servidor</label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                        <input type="text" value={newInstanceBaseUrl} onChange={(e) => setNewInstanceBaseUrl(e.target.value)} placeholder="https://api.seudominio.com" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    </div>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-primary mb-1">Global API Key (Chave Administrativa)</label>
                    <div className="relative">
                        <Shield className="absolute left-3 top-2.5 text-primary/50 w-5 h-5" />
                        <input type={showGlobalKey ? "text" : "password"} value={evolutionGlobalKey} onChange={(e) => setEvolutionGlobalKey(e.target.value)} placeholder="Chave administrativa..." className="w-full border border-primary/30 rounded-lg p-2.5 pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pr-12" />
                        <button onClick={() => setShowGlobalKey(!showGlobalKey)} className="absolute right-3 top-2.5 text-gray-400">{showGlobalKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Nova Instância</label>
                    <input type="text" value={newInstanceName} onChange={(e) => setNewInstanceName(e.target.value)} placeholder="Ex: Suporte_Vendas" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone (Opcional)</label>
                    <div className="relative">
                        <Phone className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                        <input type="text" value={newInstancePhone} onChange={(e) => setNewInstancePhone(e.target.value)} placeholder="Ex: 5511999999999" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 pl-10 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    </div>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Token Automático</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Key className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                            <input type="text" value={newInstanceToken} readOnly className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 pl-10 bg-gray-50 dark:bg-gray-900/30 text-gray-600 font-mono cursor-not-allowed" />
                        </div>
                        <button onClick={generateRandomInstanceToken} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"><RefreshCw className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
                        <button onClick={() => handleCopyToken(newInstanceToken)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition-colors"><Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
                    </div>
                </div>
             </div>
             <div className="flex items-center justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                 <button onClick={handleCreateInstance} disabled={isCreatingInstance || !newInstanceName || !evolutionGlobalKey} className="px-8 py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-[#004a3c] transition-colors shadow-md flex items-center gap-2 disabled:opacity-50">
                    {isCreatingInstance ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Criar Instância na Evolution
                 </button>
             </div>
        </div>
      </div>

      {/* --- NOVO MÓDULO: LISTAR INSTÂNCIAS DO SERVIDOR --- */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors border-t-4 border-t-blue-500">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
            <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <List className="w-5 h-5 text-blue-500" /> Listar Instâncias do Servidor
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Busque todas as instâncias ativas no seu servidor Evolution.</p>
            </div>
            <button 
                onClick={handleFetchInstances} 
                disabled={isFetchingInstances || !evolutionGlobalKey}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
            >
                {isFetchingInstances ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isFetchingInstances ? 'Buscando...' : 'Buscar Instâncias'}
            </button>
        </div>

        <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Evolution API URL</label>
                    <input 
                        type="text" 
                        value={newInstanceBaseUrl} 
                        onChange={(e) => setNewInstanceBaseUrl(e.target.value)} 
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700" 
                        placeholder="https://api..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Global API Key</label>
                    <input 
                        type="password" 
                        value={evolutionGlobalKey} 
                        onChange={(e) => setEvolutionGlobalKey(e.target.value)} 
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700"
                        placeholder="Sua Global Key..."
                    />
                </div>
            </div>

            {fetchedInstances.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Instância</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Telefone</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Token</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {fetchedInstances.map((inst) => (
                                <tr key={inst.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {inst.profilePicUrl && (
                                                <img className="h-8 w-8 rounded-full mr-3 border border-gray-200 dark:border-gray-600" src={inst.profilePicUrl} alt="" />
                                            )}
                                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{inst.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${inst.connectionStatus === 'open' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                                            {inst.connectionStatus === 'open' ? 'Conectado' : 'Desconectado'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                                        {inst.ownerJid?.split('@')[0] || inst.number || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400 font-mono truncate max-w-[120px]" title={inst.token}>{inst.token}</span>
                                            <button onClick={() => handleCopyToken(inst.token)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"><Copy className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button 
                                            onClick={() => {
                                                setEvolutionUrl(newInstanceBaseUrl.replace(/\/$/, ''));
                                                setEvolutionInstance(inst.name);
                                                setEvolutionApiKey(inst.token);
                                                showToast(`Dados de "${inst.name}" carregados no módulo de conexão!`, 'info');
                                            }}
                                            className="text-primary hover:text-[#004a3c] dark:text-secondary flex items-center gap-1 ml-auto"
                                        >
                                            <Check className="w-4 h-4" /> Conectar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-gray-400">
                    <List className="w-12 h-12 mb-3 opacity-20" />
                    <p>Nenhuma instância listada. Clique em "Buscar" para carregar os dados.</p>
                </div>
            )}
        </div>
      </div>
      
      {/* 5. PLACEHOLDER: FUTURAS CONFIGURAÇÕES */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 opacity-50 pointer-events-none grayscale">
         <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Configurações de Notificação (Em Breve)</h2>
         <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Notificações por E-mail</span>
                <div className="w-10 h-6 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Alertas críticos no WhatsApp</span>
                <div className="w-10 h-6 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Settings;