import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MoreVertical, Send, Paperclip, Bot, Sparkles, User, Tag, Phone, Edit2, Loader2, MessageSquareOff, Plus } from 'lucide-react';
import { Conversation, Message, Lead } from '../types';
import { suggestReply } from '../services/geminiService';
import { sendMessage } from '../services/sendMessageService';
import { STATUS_MAP } from '../constants';
import { supabase } from '../services/supabaseClient';
import NewLeadModal from '../components/NewLeadModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const LiveChat: React.FC = () => {
  const DEFAULT_AVATAR_URL = 'https://ohgcufkcrpehkvxavmhw.supabase.co/storage/v1/object/public/logo/avatar.png';
  const { currentOrganization } = useAuth();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  
  const [inputMessage, setInputMessage] = useState('');
  const [isAiActive, setIsAiActive] = useState(false);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Conversations (Leads)
  const fetchConversations = useCallback(async () => {
    if (!currentOrganization) return;
    setIsLoadingConversations(true);
    try {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('last_active', { ascending: false }); // Sort by last active

      if (error) throw error;

      if (leads) {
        const mappedConversations: Conversation[] = leads.map(lead => ({
          id: lead.id,
          lead_id: lead.id,
          last_message: lead.notes || 'Clique para ver o histórico',
          last_message_at: lead.last_active || lead.created_at || new Date().toISOString(),
          unread_count: 0,
          status: 'open',
          lead: lead
        }));
        setConversations(mappedConversations);
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentOrganization]);

  useEffect(() => {
    fetchConversations();
    
    // Realtime Subscription for new messages
    const channel = supabase
    .channel('public:conversations')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, (payload) => {
        const newMsg = payload.new as Message;
        // If message belongs to active chat, append it
        if (activeChatId && newMsg.lead_id === activeChatId) { 
            setMessages(prev => {
                // Prevent duplicate optimistic updates by checking ID or content matching recently sent
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
        }
        // Update sidebar "last message"
        setConversations(prev => 
            prev.map(c => 
              c.id === newMsg.lead_id // In our schema, Conversation ID maps to Lead ID contextually
                ? { ...c, last_message: newMsg.content, last_message_at: newMsg.created_at } 
                : c
            ).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
        );
    })
    .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [fetchConversations, activeChatId]);

  // Realtime sync: keep lead status/details in sync with other screens (e.g. Leads Kanban)
  useEffect(() => {
    if (!currentOrganization) return;

    const channel = supabase
      .channel(`public:leads:org:${currentOrganization.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `organization_id=eq.${currentOrganization.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id as string | undefined;
            if (!deletedId) return;
            setConversations((prev) => prev.filter((c) => c.id !== deletedId));
            setActiveLead((prev) => (prev?.id === deletedId ? null : prev));
            return;
          }

          const row = payload.new as Lead;
          if (!row?.id) return;

          setConversations((prev) =>
            prev.map((c) => (c.id === row.id ? { ...c, lead: { ...(c.lead as any), ...row } } : c))
          );
          setActiveLead((prev) => (prev?.id === row.id ? { ...prev, ...row } : prev));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrganization]);

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    if (!currentOrganization) {
      showToast('Erro: Organização não identificada.', 'error');
      return;
    }

    const prevLead = activeLead;

    // optimistic UI
    setActiveLead((prev) => (prev?.id === leadId ? { ...prev, status: newStatus } : prev));
    setConversations((prev) =>
      prev.map((c) => (c.id === leadId ? { ...c, lead: { ...(c.lead as any), status: newStatus } } : c))
    );

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;
      showToast('Status do lead atualizado!', 'success');
    } catch (err) {
      // revert on error
      setActiveLead(prevLead);
      if (prevLead) {
        setConversations((prev) =>
          prev.map((c) => (c.id === prevLead.id ? { ...c, lead: { ...(c.lead as any), status: prevLead.status } } : c))
        );
      }
      showToast('Erro ao atualizar status do lead.', 'error');
    }
  };

  // 2. Fetch Messages
  useEffect(() => {
    if (!activeChatId) {
        setMessages([]);
        setActiveLead(null);
        return;
    }

    const fetchChatDetails = async () => {
      setIsLoadingMessages(true);
      try {
        const currentConv = conversations.find(c => c.id === activeChatId);
        if (currentConv && currentConv.lead) {
            setActiveLead(currentConv.lead);
        }

        const { data: remoteMessages, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('lead_id', activeChatId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (remoteMessages) {
            setMessages(remoteMessages as Message[]);
        } else {
            setMessages([]);
        }
      } catch (error) {
        console.error("Error fetching chat details:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchChatDetails();
  }, [activeChatId, conversations]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Send Message Logic
  const handleSendMessage = async (content: string) => {
    if (!activeChatId || !content.trim()) return;
    if (!currentOrganization) {
        showToast("Erro: Organização não identificada.", "error");
        return;
    }
    if (!activeLead?.phone) {
        showToast("Erro: Lead sem telefone.", "error");
        return;
    }

    setIsSending(true);

    // Optimistic Update
    const tempId = 'temp-' + Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      lead_id: activeChatId, 
      sender_type: 'user',
      is_ai_generated: false,
      content: content,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setInputMessage('');

    try {
        // CALL EDGE FUNCTION SERVICE
        // The Edge Function will:
        // 1. Send via WhatsApp (Meta/Evolution)
        // 2. Insert into 'conversations' table in DB
        await sendMessage({
            organizationId: currentOrganization.id,
            phone: activeLead.phone,
            message: content
        });

        // We do NOT remove the temp message immediately.
        // We rely on the Realtime subscription to bring the 'real' message back.
        // However, to avoid visual duplication if Realtime is slow, we might filter it out 
        // when the real one arrives, or just remove it now assuming success/speed.
        // For this implementation, we'll remove the optimistic one to let Realtime fill it in.
        setMessages(prev => prev.filter(m => m.id !== tempId));

    } catch (err: any) {
        console.error("Error sending message:", err);
        showToast(`Erro no envio: ${err.message}`, "error");
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
        setIsSending(false);
    }
  };

  const handleAiSuggestion = async () => {
    if (!activeChatId || !activeLead) return;
    setIsGeneratingSuggestion(true);
    const suggestion = await suggestReply(messages, `Nome: ${activeLead.name}, Notas: ${activeLead.notes}`);
    setInputMessage(suggestion);
    setIsGeneratingSuggestion(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      
      {/* Modal */}
      <NewLeadModal 
        isOpen={isNewLeadModalOpen} 
        onClose={() => setIsNewLeadModalOpen(false)} 
        onSuccess={fetchConversations} 
      />

      {/* LEFT COLUMN: Chat List */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Conversas</h2>
             <button 
                onClick={() => setIsNewLeadModalOpen(true)}
                className="p-1.5 bg-primary text-white rounded-lg hover:bg-[#004a3c] transition-colors shadow-sm"
                title="Novo Lead"
             >
                <Plus className="w-4 h-4" />
             </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar conversas..." 
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all text-gray-700 dark:text-gray-200 placeholder-gray-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="p-4 space-y-4">
               {[1, 2, 3].map(i => (
                 <div key={i} className="flex items-center gap-3 animate-pulse">
                   <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                   <div className="flex-1 space-y-2">
                     <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                     <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                   </div>
                 </div>
               ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
               <MessageSquareOff className="w-10 h-10 mb-2 opacity-30" />
               <p className="text-sm">Nenhuma conversa encontrada.</p>
            </div>
          ) : (
             conversations.map(conv => {
                const lead = conv.lead;
                if (!lead) return null;
                const isSelected = activeChatId === conv.id;
                
                return (
                  <div 
                    key={conv.id}
                    onClick={() => setActiveChatId(conv.id)}
                    className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isSelected ? 'bg-green-50 dark:bg-[#005c4b]/20 border-l-4 border-l-primary' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src={lead.avatar_url || DEFAULT_AVATAR_URL} alt={lead.name} className="w-10 h-10 rounded-full object-cover" />
                        {conv.unread_count > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                            {conv.unread_count}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className={`text-sm font-semibold truncate ${isSelected ? 'text-primary dark:text-secondary' : 'text-gray-800 dark:text-gray-200'}`}>
                            {lead.name || lead.phone}
                          </h3>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {new Date(conv.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conv.last_message}</p>
                      </div>
                    </div>
                  </div>
                );
             })
          )}
        </div>
      </div>

      {/* CENTER COLUMN: Chat Interface */}
      <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a] relative transition-colors">
        {activeChatId ? (
          <>
            {/* Chat Header */}
            <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shadow-sm z-10">
                {activeLead ? (
                    <div className="flex items-center gap-3">
                        <img src={activeLead.avatar_url || DEFAULT_AVATAR_URL} alt={activeLead.name} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100">{activeLead.name || activeLead.phone}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {STATUS_MAP[activeLead.status] || 'Lead'} • {activeLead.phone}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="h-10 w-40 bg-gray-100 dark:bg-gray-700 animate-pulse rounded" />
                )}
                
                <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600">
                    <Bot className={`w-4 h-4 ${isAiActive ? 'text-accent' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Agente IA</span>
                    <button 
                        onClick={() => setIsAiActive(!isAiActive)}
                        className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isAiActive ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-500'}`}
                    >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-300 shadow-sm ${isAiActive ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <MoreVertical className="w-5 h-5" />
                </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.1) 1px, transparent 0)', backgroundSize: '20px 20px' }}>
                {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                         <p>Nenhuma mensagem ainda.</p>
                         <p className="text-xs">Comece a conversa agora.</p>
                    </div>
                ) : (
                   messages.map((msg) => {
                    const isMe = msg.sender_type === 'user'; // Agent is User
                    const isAi = msg.is_ai_generated;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-lg p-3 shadow-sm relative ${
                            isMe ? (isAi ? 'bg-accent/10 border border-accent/20 text-gray-800 dark:text-gray-100 rounded-tr-none' : 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-800 dark:text-gray-100 rounded-tr-none') : 
                            'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none'
                            }`}>
                            {isAi && (
                                <div className="flex items-center gap-1 text-xs text-accent font-bold mb-1">
                                <Sparkles className="w-3 h-3" /> Resposta IA
                                </div>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <div className="text-[10px] text-gray-400 dark:text-gray-300 text-right mt-1 flex items-center justify-end gap-1">
                                {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            </div>
                        </div>
                    );
                   })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2 items-end">
                <button className="p-3 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <Paperclip className="w-5 h-5" />
                </button>
                
                <div className="flex-1 bg-white dark:bg-gray-700 rounded-2xl border border-gray-300 dark:border-gray-600 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all flex flex-col">
                    <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    className="w-full p-3 bg-transparent border-none resize-none focus:ring-0 max-h-32 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400"
                    rows={1}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(inputMessage);
                        }
                    }}
                    />
                    <div className="px-2 pb-2 flex justify-between items-center">
                    <button 
                        onClick={handleAiSuggestion}
                        disabled={isGeneratingSuggestion || !activeLead}
                        className="flex items-center gap-1 text-xs font-medium text-accent hover:bg-accent/10 dark:hover:bg-accent/20 px-2 py-1 rounded transition-colors disabled:opacity-50"
                    >
                        {isGeneratingSuggestion ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {isGeneratingSuggestion ? 'Pensando...' : 'Sugestão IA'}
                    </button>
                    </div>
                </div>

                <button 
                    onClick={() => handleSendMessage(inputMessage)}
                    disabled={!inputMessage.trim() || isSending}
                    className="p-3 bg-primary text-white rounded-full hover:bg-[#004a3c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
            </div>
            </div>
          </>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 space-y-4">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <MessageSquareOff className="w-8 h-8 opacity-50" />
                </div>
                <p className="font-medium">Selecione uma conversa para iniciar o atendimento</p>
            </div>
        )}
      </div>

      {/* RIGHT COLUMN: CRM Profile */}
      <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col overflow-y-auto">
        {activeLead ? (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <img src={activeLead.avatar_url || DEFAULT_AVATAR_URL} alt={activeLead.name} className="w-24 h-24 rounded-full mx-auto object-cover mb-3 border-4 border-gray-100 dark:border-gray-700" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{activeLead.name || activeLead.phone}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center justify-center gap-1 mt-1">
                <Phone className="w-3 h-3" /> {activeLead.phone}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {activeLead.tags && activeLead.tags.length > 0 ? (
                      activeLead.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-md font-medium flex items-center gap-1 border border-gray-200 dark:border-gray-600">
                        <Tag className="w-3 h-3" /> {tag}
                        </span>
                    ))
                  ) : (
                      <span className="text-xs text-gray-400 italic">Sem tags</span>
                  )}
                  <button className="px-2 py-1 border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 text-xs rounded-md hover:border-primary hover:text-primary transition-colors">
                    + Adicionar
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Notas</label>
                  <button className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Edit2 className="w-3 h-3" /> Editar
                  </button>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/30 text-sm text-gray-700 dark:text-yellow-100 leading-relaxed min-h-[100px]">
                  {activeLead.notes || "Sem notas disponíveis."}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Status</label>
                 <select 
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg p-2.5 focus:ring-primary focus:border-primary"
                    value={activeLead.status}
                    onChange={(e) => handleUpdateLeadStatus(activeLead.id, e.target.value)}
                 >
                    <option value="new">Novo Lead</option>
                    <option value="contacted">Contatado</option>
                    <option value="qualified">Qualificado</option>
                    <option value="customer">Cliente</option>
                    <option value="lost">Perdido</option>
                 </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>Perfil indisponível</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default LiveChat;