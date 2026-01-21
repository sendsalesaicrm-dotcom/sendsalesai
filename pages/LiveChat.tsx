import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { Search, MoreVertical, Send, Paperclip, Bot, Sparkles, User, Tag, Phone, Edit2, Loader2, MessageSquareOff, Plus, ShieldCheck, RefreshCw, ChevronDown } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { Conversation, Message, Lead } from '../types';
import { suggestReply } from '../services/geminiService';
import { sendMessage } from '../services/sendMessageService';
import { STATUS_MAP } from '../constants';
import { supabase } from '../services/supabaseClient';
import NewLeadModal from '../components/NewLeadModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const MessageBubble = React.memo(function MessageBubble({ msg }: { msg: Message }) {
  const isMe = msg.sender_type === 'user';
  const isAi = msg.is_ai_generated;
  const isPending = String(msg.id || '').startsWith('temp-');

  const mediaType = (msg.media_type || '').toLowerCase();
  const mediaUrl = msg.media_url || undefined;
  const caption = msg.caption || undefined;

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg p-3 shadow-sm relative ${
          isMe
            ? isAi
              ? 'bg-accent/10 border border-accent/20 text-gray-800 dark:text-gray-100 rounded-tr-none'
              : 'bg-[#d9fdd3] dark:bg-primary text-gray-800 dark:text-gray-100 rounded-tr-none'
            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-none'
        }`}
      >
        {isAi && (
          <div className="flex items-center gap-1 text-xs text-accent font-bold mb-1">
            <Sparkles className="w-3 h-3" /> Resposta IA
          </div>
        )}
        {mediaUrl && (mediaType === 'image' || mediaType === 'photo') && (
          <div className="mb-2">
            <a href={mediaUrl} target="_blank" rel="noreferrer" className="block">
              <img
                src={mediaUrl}
                alt={caption || msg.file_name || 'Imagem'}
                className="max-h-64 w-auto rounded-md object-contain border border-black/5 dark:border-white/10"
                loading="lazy"
              />
            </a>
          </div>
        )}

        {mediaUrl && mediaType === 'video' && (
          <div className="mb-2">
            <video
              src={mediaUrl}
              controls
              className="max-h-64 w-full rounded-md border border-black/5 dark:border-white/10"
            />
          </div>
        )}

        {mediaUrl && (mediaType === 'document' || mediaType === 'file') && (
          <div className="mb-2">
            <a
              href={mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
            >
              <span className="text-sm font-semibold">{msg.file_name || 'Documento'}</span>
              <span className="text-xs text-gray-500 dark:text-gray-300">{msg.mime_type || ''}</span>
            </a>
          </div>
        )}

        <p className="text-sm leading-relaxed whitespace-pre-wrap">{caption || msg.content}</p>
        <div className="text-[10px] text-gray-400 dark:text-gray-300 text-right mt-1 flex items-center justify-end gap-1">
          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
});

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
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [attachUrl, setAttachUrl] = useState('');
  const [attachCaption, setAttachCaption] = useState('');
  const [attachFileName, setAttachFileName] = useState('');
  const [attachMimeType, setAttachMimeType] = useState('image/png');
  const [attachMediaType, setAttachMediaType] = useState<'image' | 'video' | 'document'>('image');

  const guessMimeTypeFromUrl = useCallback((url: string, fallback: string) => {
    const u = (url || '').split('?')[0].split('#')[0].toLowerCase();
    if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
    if (u.endsWith('.png')) return 'image/png';
    if (u.endsWith('.webp')) return 'image/webp';
    if (u.endsWith('.gif')) return 'image/gif';
    if (u.endsWith('.mp4')) return 'video/mp4';
    if (u.endsWith('.mov')) return 'video/quicktime';
    if (u.endsWith('.pdf')) return 'application/pdf';
    if (u.endsWith('.mp3')) return 'audio/mpeg';
    if (u.endsWith('.ogg')) return 'audio/ogg';
    return fallback;
  }, []);

  const guessFileNameFromUrl = useCallback((url: string) => {
    try {
      const noQuery = (url || '').split('?')[0].split('#')[0];
      const last = noQuery.substring(noQuery.lastIndexOf('/') + 1);
      return last || '';
    } catch {
      return '';
    }
  }, []);

  const defaultMimeForType = useCallback((t: 'image' | 'video' | 'document') => {
    if (t === 'video') return 'video/mp4';
    if (t === 'document') return 'application/pdf';
    return 'image/png';
  }, []);

  useEffect(() => {
    if (!isAttachModalOpen) return;

    const fallback = defaultMimeForType(attachMediaType);
    const guessed = guessMimeTypeFromUrl(attachUrl, fallback);

    // Only override if the field is empty or still at the previous default.
    if (!attachMimeType || attachMimeType === 'image/png' || attachMimeType === 'video/mp4' || attachMimeType === 'application/pdf') {
      setAttachMimeType(guessed);
    }

    if (!attachFileName) {
      const fn = guessFileNameFromUrl(attachUrl);
      if (fn) setAttachFileName(fn);
    }
  }, [
    attachUrl,
    attachMediaType,
    attachMimeType,
    attachFileName,
    isAttachModalOpen,
    defaultMimeForType,
    guessMimeTypeFromUrl,
    guessFileNameFromUrl,
  ]);

  const [evolutionUrl, setEvolutionUrl] = useState<string>('');
  const [evolutionApiKey, setEvolutionApiKey] = useState<string>('');
  const [evolutionInstance, setEvolutionInstance] = useState<string>('');
  const [isLoadingEvolutionConfig, setIsLoadingEvolutionConfig] = useState<boolean>(false);
  const [isSyncingMessages, setIsSyncingMessages] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = messagesEndRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior, block: 'end' });
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const thresholdPx = 160;
    const distanceToBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
    const nearBottom = distanceToBottom <= thresholdPx;
    isNearBottomRef.current = nearBottom;
    setShowScrollToBottom(!nearBottom);
  }, []);

  const ensureAbsoluteUrl = (url: string) => {
    let cleaned = (url || '').trim().replace(/^\/+/, '');
    if (cleaned.startsWith('https:/') && !cleaned.startsWith('https://')) {
      cleaned = cleaned.replace('https:/', 'https://');
    }
    cleaned = cleaned.replace('http://', 'https://');
    if (!cleaned.startsWith('http')) cleaned = 'https://' + cleaned;
    return cleaned.replace(/\/+$/, '');
  };

  const extractEvolutionMessageText = (raw: any): string => {
    return (
      raw?.content ||
      raw?.text ||
      raw?.message?.conversation ||
      raw?.message?.extendedTextMessage?.text ||
      raw?.message?.imageMessage?.caption ||
      raw?.message?.videoMessage?.caption ||
      raw?.body?.text ||
      ''
    );
  };

  const getEvolutionMessageTimestampIso = (raw: any): string => {
    const ts =
      raw?.createdAt ||
      raw?.created_at ||
      raw?.timestamp ||
      raw?.messageTimestamp ||
      raw?.message?.messageTimestamp ||
      raw?.message?.timestamp;

    if (typeof ts === 'string') {
      const d = new Date(ts);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }

    if (typeof ts === 'number' && Number.isFinite(ts)) {
      const ms = ts > 10_000_000_000 ? ts : ts * 1000;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }

    return new Date().toISOString();
  };

  const getEvolutionMessageRemoteId = (raw: any): string | null => {
    return raw?.id || raw?.messageId || raw?.key?.id || raw?.key?.idMessage || null;
  };

  // Load Evolution config from organization
  useEffect(() => {
    if (!currentOrganization?.id) {
      setEvolutionUrl('');
      setEvolutionApiKey('');
      setEvolutionInstance('');
      return;
    }

    let isCancelled = false;
    const load = async () => {
      setIsLoadingEvolutionConfig(true);
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('evolution_url, evolution_api_key, evolution_instance')
          .eq('id', currentOrganization.id)
          .single();

        if (error) throw error;

        if (!isCancelled) {
          setEvolutionUrl(((data as any)?.evolution_url || '').trim());
          setEvolutionApiKey(((data as any)?.evolution_api_key || '').trim());
          setEvolutionInstance(((data as any)?.evolution_instance || '').trim());
        }
      } catch (err) {
        if (!isCancelled) {
          setEvolutionUrl('');
          setEvolutionApiKey('');
          setEvolutionInstance('');
        }
      } finally {
        if (!isCancelled) setIsLoadingEvolutionConfig(false);
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [currentOrganization?.id]);

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
          last_message: 'Clique para ver o histórico',
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
                // Prevent duplicates by ID
                if (prev.some(m => m.id === newMsg.id)) return prev;

                // Reconcile optimistic message: replace/remove temp message when real one arrives.
                let next = prev;
                const isUserMsg = newMsg.sender_type === 'user';
                if (isUserMsg) {
                  const newTs = new Date(newMsg.created_at).getTime();
                  const candidate = prev.find((m) =>
                    String(m.id).startsWith('temp-') &&
                    m.sender_type === 'user' &&
                    m.content === newMsg.content &&
                    Math.abs(newTs - new Date(m.created_at).getTime()) < 2 * 60 * 1000
                  );
                  if (candidate) next = prev.filter((m) => m.id !== candidate.id);
                }

                // Insert while preserving order (cheap check)
                if (next.length === 0) return [newMsg];
                const last = next[next.length - 1];
                const lastTs = new Date(last.created_at).getTime();
                const newTs = new Date(newMsg.created_at).getTime();
                if (Number.isFinite(lastTs) && Number.isFinite(newTs) && newTs < lastTs) {
                  return [...next, newMsg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                }
                return [...next, newMsg];
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
        setIsEditingNotes(false);
        setNotesDraft('');
        return;
    }

    // When switching chats, default to "follow" the bottom.
    isNearBottomRef.current = true;
    setShowScrollToBottom(false);

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

  // Smart autoscroll: follow bottom only when user is near bottom, or when sending a message.
  useLayoutEffect(() => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    const force = last.sender_type === 'user' || String(last.id || '').startsWith('temp-');
    if (!force && !isNearBottomRef.current) return;

    // "smooth" for user-sent messages; "auto" for bulk loads/inbound.
    scrollToBottom(force ? 'smooth' : 'auto');
  }, [messages, scrollToBottom]);

  // Keep notes draft in sync with the selected lead (but don't clobber while editing)
  useEffect(() => {
    if (!activeLead) return;
    if (isEditingNotes) return;
    setNotesDraft(activeLead.notes || '');
  }, [activeLead?.id, activeLead?.notes, isEditingNotes]);

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
    requestAnimationFrame(() => {
      isNearBottomRef.current = true;
      setShowScrollToBottom(false);
      scrollToBottom('smooth');
    });

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
        // Keep optimistic message until realtime arrives; the realtime handler reconciles it.

    } catch (err: any) {
        console.error("Error sending message:", err);
        showToast(`Erro no envio: ${err.message}`, "error");
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
        setIsSending(false);
    }
  };

  const handleSendMedia = async () => {
    if (!activeChatId) return;
    if (!currentOrganization) {
      showToast('Erro: Organização não identificada.', 'error');
      return;
    }
    if (!activeLead?.phone) {
      showToast('Erro: Lead sem telefone.', 'error');
      return;
    }
    if (!attachUrl.trim()) {
      showToast('Informe uma URL de mídia.', 'info');
      return;
    }

    setIsSending(true);

    const tempId = 'temp-' + Date.now();
    const optimistic: Message = {
      id: tempId,
      lead_id: activeChatId,
      sender_type: 'user',
      is_ai_generated: false,
      content: attachCaption || `[${attachMediaType}]`,
      created_at: new Date().toISOString(),
      media_type: attachMediaType,
      media_url: attachUrl,
      mime_type: attachMimeType,
      file_name: attachFileName || null,
      caption: attachCaption || null,
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      await sendMessage({
        type: 'media',
        organizationId: currentOrganization.id,
        phone: activeLead.phone,
        media: attachUrl.trim(),
        mediatype: attachMediaType,
        mimetype: attachMimeType,
        caption: attachCaption || undefined,
        fileName: attachFileName || undefined,
      });

      // Keep optimistic until realtime arrives; remove after short delay fallback
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }, 6000);
    } catch (err: any) {
      console.error('Error sending media:', err);
      showToast(`Erro no envio: ${err.message}`, 'error');
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
      setIsAttachModalOpen(false);
      setAttachUrl('');
      setAttachCaption('');
      setAttachFileName('');
      setAttachMimeType('image/png');
      setAttachMediaType('image');
    }
  };

  const handleSaveLeadNotes = async () => {
    if (!currentOrganization) {
      showToast('Erro: Organização não identificada.', 'error');
      return;
    }
    if (!activeLead) return;

    const leadId = activeLead.id;
    const nextNotes = notesDraft;
    const prevLead = activeLead;

    setIsSavingNotes(true);

    // Optimistic update
    setActiveLead((prev) => (prev?.id === leadId ? { ...prev, notes: nextNotes } : prev));
    setConversations((prev) =>
      prev.map((c) => (c.id === leadId ? { ...c, lead: { ...(c.lead as any), notes: nextNotes } } : c))
    );

    try {
      const { error } = await supabase
        .from('leads')
        .update({ notes: nextNotes })
        .eq('id', leadId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      showToast('Notas salvas!', 'success');
      setIsEditingNotes(false);
    } catch (err) {
      setActiveLead(prevLead);
      setConversations((prev) =>
        prev.map((c) => (c.id === leadId ? { ...c, lead: { ...(c.lead as any), notes: prevLead.notes } } : c))
      );
      showToast('Erro ao salvar notas.', 'error');
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleAiSuggestion = async () => {
    if (!activeChatId || !activeLead) return;
    setIsGeneratingSuggestion(true);
    const suggestion = await suggestReply(messages, `Nome: ${activeLead.name}, Notas: ${activeLead.notes}`);
    setInputMessage(suggestion);
    setIsGeneratingSuggestion(false);
  };

  const syncMessages = useCallback(async () => {
    if (!activeChatId || !activeLead?.phone) {
      showToast('Selecione um lead com telefone para sincronizar.', 'info');
      return;
    }

    if (!evolutionUrl || !evolutionApiKey || !evolutionInstance) {
      showToast('Configure Evolution URL, API Key e Instância em Configurações.', 'error');
      return;
    }

    setIsSyncingMessages(true);

    try {
      const base = ensureAbsoluteUrl(evolutionUrl);
      const instance = encodeURIComponent(evolutionInstance);

      const phoneDigits = String(activeLead.phone).replace(/\D+/g, '');
      const remoteJid = phoneDigits ? `${phoneDigits}@s.whatsapp.net` : '';

      const url = new URL(`${base}/chat/findMessages/${instance}`);
      // Different Evolution versions use different param names; we send a couple defensively.
      if (phoneDigits) url.searchParams.set('number', phoneDigits);
      if (remoteJid) url.searchParams.set('remoteJid', remoteJid);
      url.searchParams.set('limit', '100');

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: evolutionApiKey,
        },
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = (data as any)?.message || (data as any)?.error || 'Falha ao sincronizar mensagens.';
        throw new Error(message);
      }

      const rawList: any[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.messages)
          ? (data as any).messages
          : Array.isArray((data as any)?.data)
            ? (data as any).data
            : [];

      if (rawList.length === 0) {
        showToast('Nenhuma mensagem nova encontrada.', 'info');
        return;
      }

      let addedCount = 0;

      setMessages((prev) => {
        const existingSignatures = new Set(
          prev.map((m) => `${m.sender_type}|${m.content}|${m.created_at}`)
        );

        const toAdd: Message[] = [];

        for (const raw of rawList) {
          const content = extractEvolutionMessageText(raw);
          if (!content) continue;

          const createdAt = getEvolutionMessageTimestampIso(raw);
          const fromMe = Boolean(raw?.fromMe ?? raw?.key?.fromMe ?? raw?.message?.key?.fromMe);
          const senderType: Message['sender_type'] = fromMe ? 'user' : 'contact';
          const signature = `${senderType}|${content}|${createdAt}`;
          if (existingSignatures.has(signature)) continue;

          const remoteId = getEvolutionMessageRemoteId(raw);
          const id = remoteId ? `evo-${remoteId}` : `evo-${createdAt}-${Math.random().toString(16).slice(2)}`;

          toAdd.push({
            id,
            lead_id: activeChatId,
            sender_type: senderType,
            is_ai_generated: false,
            content,
            created_at: createdAt,
          });
          existingSignatures.add(signature);
        }

        addedCount = toAdd.length;
        if (addedCount === 0) return prev;

        const merged = [...prev, ...toAdd].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return merged;
      });

      if (addedCount > 0) {
        showToast(`Sincronizado: ${addedCount} novas mensagens.`, 'success');
      } else {
        showToast('Nenhuma mensagem nova encontrada.', 'info');
      }
    } catch (err: any) {
      console.error('syncMessages error', err);
      showToast(err?.message || 'Erro ao sincronizar mensagens.', 'error');
    } finally {
      setIsSyncingMessages(false);
    }
  }, [activeChatId, activeLead?.phone, evolutionUrl, evolutionApiKey, evolutionInstance, showToast]);

  const renderedMessageItems = useMemo(() => {
    const items: Array<
      | { type: 'day'; key: string; label: string }
      | { type: 'message'; key: string; msg: Message }
    > = [];

    let lastDate: Date | null = null;
    for (const msg of messages) {
      const d = new Date(msg.created_at);
      if (!lastDate || !isSameDay(d, lastDate)) {
        const dayKey = Number.isNaN(d.getTime()) ? `day-unknown-${items.length}` : `day-${d.toISOString().slice(0, 10)}`;
        const label = Number.isNaN(d.getTime()) ? '—' : format(d, 'dd/MM/yyyy');
        items.push({ type: 'day', key: dayKey, label });
        lastDate = d;
      }
      items.push({ type: 'message', key: msg.id, msg });
    }
    return items;
  }, [messages]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      
      {/* Modal */}
      <NewLeadModal 
        isOpen={isNewLeadModalOpen} 
        onClose={() => setIsNewLeadModalOpen(false)} 
        onSuccess={fetchConversations} 
      />

      {/* LEFT COLUMN: Chat List */}
      <div className={`w-full lg:w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col ${activeChatId ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Conversas</h2>
            <button
              type="button"
              onClick={() => setIsNewLeadModalOpen(true)}
              className="p-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
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
                    className={`p-4 border-b border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isSelected ? 'bg-secondary/10 dark:bg-primary/20 border-l-4 border-l-primary' : ''}`}
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
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{conv.last_message || 'Clique para ver o histórico'}</p>
                      </div>
                    </div>
                  </div>
                );
             })
          )}
        </div>
      </div>

      {/* CENTER COLUMN: Chat Interface */}
      <div className={`flex-1 ${activeChatId ? 'flex' : 'hidden lg:flex'} flex-col bg-[#efeae2] dark:bg-[#0b141a] relative transition-colors`}>
        {activeChatId ? (
          <>
            {isAttachModalOpen && (
              <div className="absolute inset-0 z-20 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Enviar mídia</h3>
                    <button
                      type="button"
                      onClick={() => setIsAttachModalOpen(false)}
                      className="px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-200"
                    >
                      Fechar
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-300">Tipo</label>
                      <select
                        value={attachMediaType}
                        onChange={(e) => setAttachMediaType(e.target.value as any)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                      >
                        <option value="image">Imagem</option>
                        <option value="video">Vídeo</option>
                        <option value="document">Documento</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-300">URL da mídia</label>
                      <input
                        value={attachUrl}
                        onChange={(e) => setAttachUrl(e.target.value)}
                        placeholder="https://..."
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                      />
                      <p className="mt-1 text-xs text-gray-400">(Evolution aceita URL ou base64; aqui estamos usando URL.)</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-300">MIME type</label>
                        <input
                          value={attachMimeType}
                          onChange={(e) => setAttachMimeType(e.target.value)}
                          placeholder="image/png"
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-300">Nome do arquivo</label>
                        <input
                          value={attachFileName}
                          onChange={(e) => setAttachFileName(e.target.value)}
                          placeholder="Imagem.png"
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-300">Caption (opcional)</label>
                      <input
                        value={attachCaption}
                        onChange={(e) => setAttachCaption(e.target.value)}
                        placeholder="Teste de caption"
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAttachModalOpen(false)}
                        className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSendMedia}
                        disabled={isSending}
                        className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
                      >
                        {isSending ? 'Enviando...' : 'Enviar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Chat Header */}
            <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 shadow-sm z-10">
                <button
                  type="button"
                  onClick={() => setActiveChatId(null)}
                  className="lg:hidden -ml-2 mr-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Voltar para lista"
                >
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Voltar</span>
                </button>
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
                <button
                  type="button"
                  onClick={syncMessages}
                  disabled={isLoadingEvolutionConfig || isSyncingMessages || !activeLead?.phone}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Sincronizar mensagens (manual)"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingMessages ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-semibold">Sincronizar</span>
                </button>
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
            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="flex-1 overflow-y-auto p-6 space-y-4 relative"
              style={{ backgroundImage: 'radial-gradient(rgba(0,0,0,0.1) 1px, transparent 0)', backgroundSize: '20px 20px' }}
            >
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
                  renderedMessageItems.map((item) => {
                    if (item.type === 'day') {
                      return (
                        <div key={item.key} className="flex justify-center">
                          <div className="px-3 py-1 rounded-full text-xs font-medium text-gray-600 dark:text-gray-200 bg-white/70 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 shadow-sm">
                            {item.label}
                          </div>
                        </div>
                      );
                    }
                    return <MessageBubble key={item.key} msg={item.msg} />;
                  })
                )}

                {showScrollToBottom && (
                  <div className="sticky bottom-4 flex justify-end pointer-events-none">
                    <button
                      type="button"
                      onClick={() => {
                        isNearBottomRef.current = true;
                        setShowScrollToBottom(false);
                        scrollToBottom('smooth');
                      }}
                      className="pointer-events-auto inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 shadow-lg text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                      title="Ir para o final"
                    >
                      <ChevronDown className="w-4 h-4" />
                      <span className="text-sm font-semibold">Novas mensagens</span>
                    </button>
                  </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2 items-end">
                <button
                  type="button"
                  onClick={() => setIsAttachModalOpen(true)}
                  className="p-3 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="Enviar mídia (URL)"
                >
                    <Paperclip className="w-5 h-5" />
                </button>
                
                <div className="flex-1 bg-white dark:bg-gray-700 rounded-2xl border border-gray-300 dark:border-gray-600 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all flex flex-col">
                    <textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => {
                      setInputMessage(e.target.value);
                      requestAnimationFrame(() => {
                        const el = textareaRef.current;
                        if (!el) return;
                        el.style.height = 'auto';
                        const next = Math.min(el.scrollHeight, 128);
                        el.style.height = `${next}px`;
                      });
                    }}
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
                  className="p-3 bg-primary text-white rounded-full hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
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
      <div className="hidden lg:flex w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-col overflow-y-auto">
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
                  {isEditingNotes ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingNotes(false);
                          setNotesDraft(activeLead.notes || '');
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-yellow-200 dark:hover:text-yellow-100"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveLeadNotes}
                        disabled={isSavingNotes}
                        className="text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingNotes ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setNotesDraft(activeLead.notes || '');
                        setIsEditingNotes(true);
                      }}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Editar
                    </button>
                  )}
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/30 text-sm text-gray-700 dark:text-yellow-100 leading-relaxed min-h-[100px]">
                  {isEditingNotes ? (
                    <textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      className="w-full bg-transparent border-none resize-none focus:ring-0 focus:outline-none text-sm text-gray-700 dark:text-yellow-100 leading-relaxed min-h-[100px]"
                      rows={4}
                      placeholder="Escreva notas sobre este lead..."
                    />
                  ) : (
                    <span>{activeLead.notes || 'Sem notas disponíveis.'}</span>
                  )}
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
                <div className="mt-4 rounded-xl bg-blue-50/50 dark:bg-gray-100/10 border border-blue-100/60 dark:border-gray-700/60 p-3">
                  <div className="flex items-start gap-2 text-blue-700 dark:text-gray-200">
                    <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-xs leading-relaxed">Política de Dados: Histórico de 60 dias e mídias por 24h.</p>
                  </div>
                </div>
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