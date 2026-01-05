import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
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
  Search,
  List
} from 'lucide-react';
import { QrCode } from 'lucide-react';
import { Outlet } from 'react-router-dom'; // Removed Link as it's not used in the Provider
import { formatInTimeZone } from 'date-fns-tz';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { getWhatsAppConfig, saveWhatsAppConfig } from '../services/whatsappConfigService';
import { supabase } from '../services/supabaseClient';

// Define a type for the context value
interface SettingsContextType {
  timeZones: string[];
  selectedZone: string;
  setSelectedZone: (zone: string) => void;
  currentTime: string;
  handleSaveRegional: () => void;
  isSavingRegional: boolean;
  wabaId: string;
  setWabaId: (id: string) => void;
  phoneId: string;
  setPhoneId: (id: string) => void;
  accessToken: string;
  setAccessToken: (token: string) => void;
  showAccessToken: boolean;
  setShowAccessToken: (show: boolean) => void;
  handleTestConnection: () => Promise<void>;
  isTestingConnection: boolean;
  connectionStatus: 'idle' | 'success' | 'error';
  handleSaveWhatsApp: () => Promise<void>;
  isLoadingConfig: boolean;
  evolutionUrl: string;
  setEvolutionUrl: (url: string) => void;
  evolutionApiKey: string;
  setEvolutionApiKey: (key: string) => void;
  evolutionInstance: string;
  setEvolutionInstance: (instance: string) => void;
  handleSaveEvolution: () => Promise<void>;
  fetchedInstances: any[];
  isFetchingInstances: boolean;
  handleFetchInstances: () => Promise<void>;
  evolutionGlobalKey: string;
  setEvolutionGlobalKey: (key: string) => void;
  newInstanceBaseUrl: string;
  setNewInstanceBaseUrl: (url: string) => void;
  newInstanceName: string;
  setNewInstanceName: (name: string) => void;
  newInstancePhone: string;
  setNewInstancePhone: (phone: string) => void;
  newInstanceToken: string;
  generateRandomInstanceToken: () => void;
  handleCreateInstance: () => Promise<void>;
  isCreatingInstance: boolean;
  showGlobalKey: boolean;
  setShowGlobalKey: (show: boolean) => void;
  connectInstanceName: string;
  setConnectInstanceName: (name: string) => void;
  connectApiKey: string;
  setConnectApiKey: (key: string) => void;
  isGeneratingQr: boolean;
  qrCodeBase64: string | null;
  handleGetQrCode: () => Promise<void>;
  handleCopyToken: (text: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  isProcessingAction: boolean;
  handleSetPresence: (instanceName: string, presence: 'available' | 'unavailable', instanceToken?: string) => Promise<void>;
  handleGetConnectionStatus: (instanceName: string, instanceToken?: string) => Promise<string | null>;
  handleLogoutInstance: (instanceName: string, instanceToken?: string) => Promise<void>;
  handleDeleteInstance: (instanceName: string) => Promise<void>;
  webhookUrl: string;
  setWebhookUrl: (url: string) => void;
  webhookEnabled: boolean;
  setWebhookEnabled: (enabled: boolean) => void;
  webhookBase64: boolean;
  setWebhookBase64: (base64: boolean) => void;
  webhookByEvents: boolean;
  setWebhookByEvents: (byEvents: boolean) => void;
  selectedEvents: string[];
  setSelectedEvents: (events: string[]) => void;
  isProcessingWebhook: boolean;
  handleSetWebhook: (instanceName: string, token: string) => Promise<void>;
  handleFindWebhook: (instanceName: string, token: string) => Promise<void>;
  clearAllDrafts: () => void;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  const [evolutionUrl, setEvolutionUrl] = useState(() => {
    return localStorage.getItem('sendsales_evolutionUrl') || '';
  });
  const [evolutionApiKey, setEvolutionApiKey] = useState(() => {
    return localStorage.getItem('sendsales_evolutionApiKey') || '';
  });
  const [evolutionInstance, setEvolutionInstance] = useState(() => {
    return localStorage.getItem('sendsales_evolutionInstance') || '';
  });
  const [showEvolutionKey, setShowEvolutionKey] = useState(false);
  const [isSavingEvolution, setIsSavingEvolution] = useState(false);

  // --- ESTADOS: Criação e Busca de Instâncias Evolution ---
  const [evolutionGlobalKey, setEvolutionGlobalKey] = useState(() => {
    return localStorage.getItem('sendsales_evolutionGlobalKey') || '';
  });
  const [newInstanceName, setNewInstanceName] = useState(() => {
    return localStorage.getItem('sendsales_newInstanceName') || '';
  });
  const [newInstancePhone, setNewInstancePhone] = useState(() => {
    return localStorage.getItem('sendsales_newInstancePhone') || '';
  });
  const [newInstanceBaseUrl, setNewInstanceBaseUrl] = useState(() => {
    return localStorage.getItem('sendsales_newInstanceBaseUrl') || '';
  });
  const [newInstanceToken, setNewInstanceToken] = useState(() => {
    return localStorage.getItem('sendsales_newInstanceToken') || '';
  });
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [showGlobalKey, setShowGlobalKey] = useState(false);

  // --- ESTADOS: Busca de Instâncias ---
  const [fetchedInstances, setFetchedInstances] = useState<any[]>(() => {
    const stored = localStorage.getItem('sendsales_fetchedInstances');
    return stored ? JSON.parse(stored) : [];
  });
  const [isFetchingInstances, setIsFetchingInstances] = useState(false);

  // --- ESTADOS: Gerar QR Code via Instância (conexão rápida) ---
  const [connectInstanceName, setConnectInstanceName] = useState(() => {
    return localStorage.getItem('sendsales_connectInstanceName') || '';
  });
  const [connectApiKey, setConnectApiKey] = useState(() => {
    return localStorage.getItem('sendsales_connectApiKey') || '';
  });
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);

  // Webhook Settings State
  const [webhookUrl, setWebhookUrl] = useState(() => {
    return localStorage.getItem('sendsales_webhookUrl') || '';
  });
  const [webhookEnabled, setWebhookEnabled] = useState(() => {
    const stored = localStorage.getItem('sendsales_webhookEnabled');
    return stored ? JSON.parse(stored) : false;
  });
  const [webhookBase64, setWebhookBase64] = useState(() => {
    const stored = localStorage.getItem('sendsales_webhookBase64');
    return stored ? JSON.parse(stored) : true;
  });
  const [webhookByEvents, setWebhookByEvents] = useState(() => {
    const stored = localStorage.getItem('sendsales_webhookByEvents');
    return stored ? JSON.parse(stored) : false;
  });
  const [selectedEvents, setSelectedEvents] = useState<string[]>(() => {
    const stored = localStorage.getItem('sendsales_selectedEvents');
    return stored ? JSON.parse(stored) : [];
  });

  // UI States
  const [isProcessingWebhook, setIsProcessingWebhook] = useState(false);
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

  // UseEffects for localStorage persistence
  useEffect(() => {
    localStorage.setItem('sendsales_evolutionUrl', evolutionUrl);
  }, [evolutionUrl]);

  useEffect(() => {
    localStorage.setItem('sendsales_evolutionApiKey', evolutionApiKey);
  }, [evolutionApiKey]);

  useEffect(() => {
    localStorage.setItem('sendsales_evolutionInstance', evolutionInstance);
  }, [evolutionInstance]);

  useEffect(() => {
    localStorage.setItem('sendsales_evolutionGlobalKey', evolutionGlobalKey);
  }, [evolutionGlobalKey]);

  useEffect(() => {
    localStorage.setItem('sendsales_newInstanceName', newInstanceName);
  }, [newInstanceName]);

  useEffect(() => {
    localStorage.setItem('sendsales_newInstancePhone', newInstancePhone);
  }, [newInstancePhone]);

  useEffect(() => {
    localStorage.setItem('sendsales_newInstanceBaseUrl', newInstanceBaseUrl);
  }, [newInstanceBaseUrl]);

  useEffect(() => {
    localStorage.setItem('sendsales_newInstanceToken', newInstanceToken);
  }, [newInstanceToken]);

  useEffect(() => {
    localStorage.setItem('sendsales_fetchedInstances', JSON.stringify(fetchedInstances));
  }, [fetchedInstances]);

  useEffect(() => {
    localStorage.setItem('sendsales_connectInstanceName', connectInstanceName);
  }, [connectInstanceName]);

  useEffect(() => {
    localStorage.setItem('sendsales_connectApiKey', connectApiKey);
  }, [connectApiKey]);

  useEffect(() => {
    localStorage.setItem('sendsales_webhookUrl', webhookUrl);
  }, [webhookUrl]);

  useEffect(() => {
    localStorage.setItem('sendsales_webhookEnabled', JSON.stringify(webhookEnabled));
  }, [webhookEnabled]);

  useEffect(() => {
    localStorage.setItem('sendsales_webhookBase64', JSON.stringify(webhookBase64));
  }, [webhookBase64]);

  useEffect(() => {
    localStorage.setItem('sendsales_webhookByEvents', JSON.stringify(webhookByEvents));
  }, [webhookByEvents]);

  useEffect(() => {
    localStorage.setItem('sendsales_selectedEvents', JSON.stringify(selectedEvents));
  }, [selectedEvents]);

  // --- LÓGICA DE CRIAÇÃO ---
  const generateRandomInstanceToken = useCallback(() => {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const token = Array.from(array, (byte) => byte.toString(16).padStart(2, '0').toUpperCase()).join('');
    setNewInstanceToken(token);
  }, []);

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
        handleFetchInstances(); // Atualiza a lista automaticamente após criar
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
  const handleFetchInstances = useCallback(async () => {
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
  }, [newInstanceBaseUrl, evolutionGlobalKey, showToast]); // Dependencies

  const handleGetQrCode = async () => {
    if (!newInstanceBaseUrl || !connectInstanceName || !connectApiKey) {
      showToast('Preencha a URL, Nome da Instância e o Token.', 'error');
      return;
    }
    setIsGeneratingQr(true);
    setQrCodeBase64(null);
    try {
      const baseUrl = newInstanceBaseUrl.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/instance/connect/${connectInstanceName}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'apikey': connectApiKey }
      });
      const data = await response.json();
      if (response.ok && data.base64) {
        const img = typeof data.base64 === 'string' && data.base64.startsWith('data:') ? data.base64 : `data:image/png;base64,${data.base64}`;
        setQrCodeBase64(img);
        showToast('QR Code gerado com sucesso!', 'success');
      } else {
        throw new Error(data.message || 'Erro ao gerar QR Code.');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro de conexão.', 'error');
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // --- EVOLUTION: ACTIONS (presence/status/logout/delete) ---
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const normalizeBaseUrl = (url?: string) => {
    if (!url) return '';
    return url.replace(/\/+$/, '');
  };

  const handleSetPresence = async (instanceName: string, presence: 'available' | 'unavailable', instanceToken?: string) => {
    if (!instanceName) return showToast('Nome da instância inválido.', 'error');
    if (!instanceToken) return showToast('Token da instância ausente.', 'error');
    const base = normalizeBaseUrl(newInstanceBaseUrl || evolutionUrl);
    if (!base) return showToast('Informe a URL do servidor Evolution.', 'error');
    setIsProcessingAction(true);
    try {
      const res = await fetch(`${base}/instance/setPresence/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: instanceToken },
        body: JSON.stringify({ presence })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(`Presença definida: ${presence}`, 'success');
      } else {
        throw new Error(data.message || 'Erro ao definir presença.');
      }
    } catch (err: any) {
      console.error('handleSetPresence error', err);
      showToast(err.message || 'Erro ao definir presença.', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleGetConnectionStatus = async (instanceName: string, instanceToken?: string) => {
    if (!instanceName) return showToast('Nome da instância inválido.', 'error');
    const base = normalizeBaseUrl(newInstanceBaseUrl || evolutionUrl);
    if (!base) return showToast('Informe a URL do servidor Evolution.', 'error');
    setIsProcessingAction(true);
    try {
      const res = await fetch(`${base}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: instanceToken ? { apikey: instanceToken, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const state = data.connectionState || data.status || data.connectionStatus || 'unknown';
        showToast(`Status da instância ${instanceName}: ${state}`, 'success');
        return state;
      } else {
        throw new Error(data.message || 'Erro ao recuperar status de conexão.');
      }
    } catch (err: any) {
      console.error('handleGetConnectionStatus error', err);
      showToast(err.message || 'Erro ao recuperar status.', 'error');
      return null;
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleLogoutInstance = async (instanceName: string, instanceToken?: string) => {
    if (!instanceName) return showToast('Nome da instância inválido.', 'error');
    if (!instanceToken) return showToast('Token da instância ausente.', 'error');
    const base = normalizeBaseUrl(newInstanceBaseUrl || evolutionUrl);
    if (!base) return showToast('Informe a URL do servidor Evolution.', 'error');
    setIsProcessingAction(true);
    try {
      const res = await fetch(`${base}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { apikey: instanceToken, 'Content-Type': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(`Instância ${instanceName} desconectada (logout).`, 'success');
        await handleFetchInstances();
      } else {
        throw new Error(data.message || 'Erro ao desconectar instância.');
      }
    } catch (err: any) {
      console.error('handleLogoutInstance error', err);
      showToast(err.message || 'Erro ao desconectar instância.', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteInstance = async (instanceName: string) => {
    if (!instanceName) return showToast('Nome da instância inválido.', 'error');
    if (!evolutionGlobalKey) return showToast('Informe a Global API Key (chave administrativa).', 'error');
    const base = normalizeBaseUrl(newInstanceBaseUrl || evolutionUrl);
    if (!base) return showToast('Informe a URL do servidor Evolution.', 'error');
    setIsProcessingAction(true);
    try {
      const res = await fetch(`${base}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: { apikey: evolutionGlobalKey, 'Content-Type': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast(`Instância ${instanceName} removida com sucesso.`, 'success');
        await handleFetchInstances();
      } else {
        throw new Error(data.message || 'Erro ao deletar instância.');
      }
    } catch (err: any) {
      console.error('handleDeleteInstance error', err);
      showToast(err.message || 'Erro ao deletar instância.', 'error');
    } finally {
      setIsProcessingAction(false);
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

  const handleSetWebhook = async (instanceName: string, token: string) => {
    setIsProcessingWebhook(true);
    try {
      const baseUrl = evolutionUrl.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionGlobalKey, // Using evolutionGlobalKey for authentication
        },
        body: JSON.stringify({
          webhook: { // Encapsulated fields
            enabled: webhookEnabled,
            url: webhookUrl,
            webhookByEvents: webhookByEvents,
            webhookBase64: webhookBase64,
            events: selectedEvents,
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar webhook');
      }

      showToast('Webhook salvo com sucesso!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erro ao salvar webhook', 'error');
    } finally {
      setIsProcessingWebhook(false);
    }
  };

  const handleFindWebhook = async (instanceName: string, token: string) => {
    setIsProcessingWebhook(true);
    try {
      const baseUrl = evolutionUrl.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/webhook/find/${instanceName}`, {
        method: 'GET',
        headers: {
          'apikey': evolutionGlobalKey, // Using evolutionGlobalKey for authentication
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar configuração do webhook');
      }

      const data = await response.json();
      setWebhookUrl(data.url || '');
      setWebhookEnabled(data.enabled || false);
      setWebhookBase64(data.webhookBase64 || false);
      setWebhookByEvents(data.webhookByEvents || false);
      setSelectedEvents(data.events || []); // Always set to an array, even if empty

      showToast('Configuração do webhook carregada!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erro ao buscar configuração do webhook', 'error');
    } finally {
      setIsProcessingWebhook(false);
    }
  };

  const clearAllDrafts = () => {
    localStorage.removeItem('sendsales_evolutionUrl');
    localStorage.removeItem('sendsales_evolutionApiKey');
    localStorage.removeItem('sendsales_evolutionInstance');
    localStorage.removeItem('sendsales_evolutionGlobalKey');
    localStorage.removeItem('sendsales_newInstanceName');
    localStorage.removeItem('sendsales_newInstancePhone');
    localStorage.removeItem('sendsales_newInstanceBaseUrl');
    localStorage.removeItem('sendsales_newInstanceToken');
    localStorage.removeItem('sendsales_fetchedInstances');
    localStorage.removeItem('sendsales_connectInstanceName');
    localStorage.removeItem('sendsales_connectApiKey');
    localStorage.removeItem('sendsales_webhookUrl');
    localStorage.removeItem('sendsales_webhookEnabled');
    localStorage.removeItem('sendsales_webhookBase64');
    localStorage.removeItem('sendsales_webhookByEvents');
    localStorage.removeItem('sendsales_selectedEvents');

    setEvolutionUrl('');
    setEvolutionApiKey('');
    setEvolutionInstance('');
    setEvolutionGlobalKey('');
    setNewInstanceName('');
    setNewInstancePhone('');
    setNewInstanceBaseUrl('');
    setNewInstanceToken('');
    setFetchedInstances([]);
    setConnectInstanceName('');
    setConnectApiKey('');
    setWebhookUrl('');
    setWebhookEnabled(false);
    setWebhookBase64(true);
    setWebhookByEvents(false);
    setSelectedEvents([]);

    showToast('Todos os rascunhos limpos!', 'info');
  };

  const contextValue: SettingsContextType = {
    timeZones,
    selectedZone, setSelectedZone,
    currentTime, handleSaveRegional, isSavingRegional,
    wabaId, setWabaId, phoneId, setPhoneId, accessToken, setAccessToken, showAccessToken, setShowAccessToken, handleTestConnection, isTestingConnection, connectionStatus, handleSaveWhatsApp, isLoadingConfig,
    evolutionUrl, setEvolutionUrl, evolutionApiKey, setEvolutionApiKey, evolutionInstance, setEvolutionInstance, handleSaveEvolution, fetchedInstances, isFetchingInstances, handleFetchInstances,
    evolutionGlobalKey, setEvolutionGlobalKey, newInstanceBaseUrl, setNewInstanceBaseUrl, newInstanceName, setNewInstanceName, newInstancePhone, setNewInstancePhone, newInstanceToken, generateRandomInstanceToken, handleCreateInstance, isCreatingInstance, showGlobalKey, setShowGlobalKey,
    connectInstanceName, setConnectInstanceName, connectApiKey, setConnectApiKey, isGeneratingQr, qrCodeBase64, handleGetQrCode,
    handleCopyToken, showToast,
    // Evolution actions
    isProcessingAction, handleSetPresence, handleGetConnectionStatus, handleLogoutInstance, handleDeleteInstance,
    // Webhook actions
    webhookUrl,
    setWebhookUrl,
    webhookEnabled,
    setWebhookEnabled,
    webhookBase64,
    setWebhookBase64,
    webhookByEvents,
    setWebhookByEvents,
    selectedEvents,
    setSelectedEvents,
    isProcessingWebhook,
    handleSetWebhook,
    handleFindWebhook,
    clearAllDrafts,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

const Settings: React.FC = () => {
  const { isLoading: isAuthLoading } = useAuth(); // Only need isLoading from useAuth here

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
          {/* currentOrganization is not directly used here, but could be passed if needed */}
          {/* <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Organização: <span className="font-semibold">{currentOrganization?.name}</span></p> */}
        </div>
      </div>
      <div className="mt-6">
        <Outlet />
      </div>
    </div>
  );
};

export default Settings;