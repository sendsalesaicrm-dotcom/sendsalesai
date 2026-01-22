import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Lead } from '../types';
import { STATUS_MAP, STATUS_COLORS } from '../constants';
import { Search, Filter, MoreVertical, Download, Loader2, Inbox, Plus, Trash2, Eye, LayoutGrid, List, Calendar, Copy, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { fetchProfilePictureUrl, toWhatsAppRemoteJid } from '../services/evolutionProfileService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import NewLeadModal from '../components/NewLeadModal';
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  DropAnimation,
  defaultDropAnimation,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const formatKanbanEntryDate = (iso?: string) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).formatToParts(date);

  const day = parts.find((p) => p.type === 'day')?.value;
  const monthRaw = parts.find((p) => p.type === 'month')?.value;
  const year = parts.find((p) => p.type === 'year')?.value;

  if (!day || !monthRaw || !year) return null;
  const month = monthRaw.replace('.', '').toLowerCase();
  return `${month} ${day}, ${year}`;
};

// Kanban Lead Card Component
const LeadCard: React.FC<{
  lead: Lead;
  onOpenNotes?: (lead: Lead) => void;
  activeMenuId?: string | null;
  setActiveMenuId?: (id: string | null) => void;
  menuRef?: React.RefObject<HTMLDivElement>;
  onViewDetails?: (lead: Lead) => void;
  onDeleteLead?: (leadId: string) => void;
}> = ({ lead, onOpenNotes, activeMenuId, setActiveMenuId, menuRef, onViewDetails, onDeleteLead }) => {
  const DEFAULT_AVATAR_URL = 'https://ohgcufkcrpehkvxavmhw.supabase.co/storage/v1/object/public/logo/avatar.png';
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms ease',
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' : 'var(--tw-shadow)',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 touch-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={lead.avatar_url || DEFAULT_AVATAR_URL}
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== DEFAULT_AVATAR_URL) img.src = DEFAULT_AVATAR_URL;
            }}
            alt={lead.name}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
          <div className="min-w-0">
            <div className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{lead.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{lead.phone}</div>
            <div className="mt-2 flex flex-col items-start gap-2">
              {(() => {
                const label = formatKanbanEntryDate(lead.status_changed_at || lead.created_at);
                if (!label) return null;
                return (
                  <div className="inline-flex items-center gap-2 px-2 py-1 text-[10px] font-semibold rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200">
                    <Calendar className="w-3 h-3" />
                    <span>{label}</span>
                  </div>
                );
              })()}

              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenNotes?.(lead);
                }}
                className="inline-flex items-center px-2 py-1 text-[10px] font-semibold rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                Anotações
              </button>
            </div>
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuId?.(activeMenuId === lead.id ? null : lead.id);
            }}
            className={`p-2 rounded-full transition-colors ${activeMenuId === lead.id ? 'bg-gray-100 dark:bg-gray-700 text-primary' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600'}`}
            aria-label="Ações do lead"
          >
            <MoreVertical size={18} />
          </button>

          {activeMenuId === lead.id && (
            <div
              ref={menuRef}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                type="button"
                onClick={() => {
                  onViewDetails?.(lead);
                  setActiveMenuId?.(null);
                }}
                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Eye size={16} className="text-gray-400" />
                Ver Detalhes
              </button>
              <div className="h-px bg-gray-100 dark:bg-gray-700 mx-2 my-1" />
              <button
                type="button"
                onClick={() => onDeleteLead?.(lead.id)}
                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium"
              >
                <Trash2 size={16} />
                Excluir Lead
              </button>
            </div>
          )}
        </div>
      </div>
      {lead.tags && lead.tags.length > 0 && (
        <div className="mt-3 flex gap-1 flex-wrap">
          {lead.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded border border-gray-200 dark:border-gray-600">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

type KanbanColumnProps = { id: string; title: string; leads: Lead[]; colorClass: string };

// Kanban Column Component
const KanbanColumn: React.FC<
  KanbanColumnProps & {
    onOpenNotes: (lead: Lead) => void;
    activeMenuId: string | null;
    setActiveMenuId: (id: string | null) => void;
    menuRef: React.RefObject<HTMLDivElement>;
    onViewDetails: (lead: Lead) => void;
    onDeleteLead: (leadId: string) => void;
  }
> = ({ id, title, leads, colorClass, onOpenNotes, activeMenuId, setActiveMenuId, menuRef, onViewDetails, onDeleteLead }) => {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-72 flex flex-col h-full min-h-0 bg-gray-50/50 dark:bg-gray-900/20 rounded-xl border border-gray-200 dark:border-gray-800"
    >
      <div className="p-3 font-bold text-sm flex justify-between items-center border-b border-gray-200 dark:border-gray-700 rounded-t-xl bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colorClass.split(' ')[0]}`} />
          <span className="text-gray-700 dark:text-gray-200">{title}</span>
        </div>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{leads.length}</span>
      </div>

      <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
        <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-0">
          {leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onOpenNotes={onOpenNotes}
              activeMenuId={activeMenuId}
              setActiveMenuId={setActiveMenuId}
              menuRef={menuRef}
              onViewDetails={onViewDetails}
              onDeleteLead={onDeleteLead}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};


const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [notesModalLead, setNotesModalLead] = useState<Lead | null>(null);
  const [detailsModalLead, setDetailsModalLead] = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const { currentOrganization } = useAuth();
  const { showToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  const [evolutionConfig, setEvolutionConfig] = useState<{ url: string; apiKey: string; instance: string } | null>(null);
  const avatarFetchInFlightRef = useRef<Set<string>>(new Set());
  const avatarFetchedRef = useRef<Set<string>>(new Set());

  const formatLeadDateTime = (iso?: string | null) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  };

  const leadsByStatus = useMemo(() => {
    const grouped = Object.fromEntries(
      Object.keys(STATUS_MAP).map(status => [status, [] as Lead[]])
    ) as Record<string, Lead[]>;

    leads.forEach(lead => {
      if (grouped[lead.status]) {
        grouped[lead.status].push(lead);
      }
    });
    return grouped;
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    // Optimistic update
    const originalLeads = [...leads];
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;

      showToast('Status do lead atualizado!', 'success');
    } catch (error: any) {
      // Revert on error
      setLeads(originalLeads);
      console.error('Erro ao atualizar status:', error.message);
      showToast('Erro ao atualizar o status do lead.', 'error');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = leads.find(l => l.id === active.id);
    if (lead) {
      setActiveLead(lead);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    let newStatus: string | null = null;

    if (Object.prototype.hasOwnProperty.call(STATUS_MAP, overId)) {
      newStatus = overId;
    } else {
      const overLead = leads.find(l => l.id === overId);
      if (overLead) {
        newStatus = overLead.status;
      }
    }

    const oldStatus = (active.data.current as any)?.lead?.status as string | undefined;

    if (newStatus && newStatus !== oldStatus) {
      setLeads(prev => prev.map(l => (l.id === leadId ? { ...l, status: newStatus! } : l)));

      try {
        const { error } = await supabase
          .from('leads')
          .update({ status: newStatus })
          .eq('id', leadId);

        if (error) throw error;
        showToast('Lead movido com sucesso!', 'success');
      } catch (err) {
        showToast('Erro ao mover lead.', 'error');
        fetchLeads();
      }
    }
  };

  const dropAnimation: DropAnimation = {
    ...defaultDropAnimation,
  };

  const fetchLeads = useCallback(async () => {
    if (!currentOrganization) return;
    
    setIsLoading(true);
    try {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .eq('organization_id', currentOrganization.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        setLeads(data || []);
    } catch (e) {
        console.error('Error fetching leads:', e);
    } finally {
        setIsLoading(false);
    }
  }, [currentOrganization]);

  // Load Evolution config (for profile pictures)
  useEffect(() => {
    if (!currentOrganization?.id) {
      setEvolutionConfig(null);
      return;
    }

    let isCancelled = false;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('evolution_url, evolution_api_key, evolution_instance')
          .eq('id', currentOrganization.id)
          .single();

        if (error) throw error;

        const url = String((data as any)?.evolution_url || '').trim();
        const apiKey = String((data as any)?.evolution_api_key || '').trim();
        const instance = String((data as any)?.evolution_instance || '').trim();

        if (!isCancelled && url && apiKey && instance) {
          setEvolutionConfig({ url, apiKey, instance });
        } else if (!isCancelled) {
          setEvolutionConfig(null);
        }
      } catch {
        if (!isCancelled) setEvolutionConfig(null);
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [currentOrganization?.id]);

  // Background-fetch missing avatars from Evolution
  useEffect(() => {
    if (!currentOrganization) return;
    if (!evolutionConfig?.url || !evolutionConfig?.apiKey || !evolutionConfig?.instance) return;
    if (!leads.length) return;

    const candidates = leads
      .filter((l) => l && l.id)
      .filter((l) => {
        if (!l.phone) return false;
        if (l.avatar_url && String(l.avatar_url).trim()) return false;
        if (avatarFetchedRef.current.has(l.id)) return false;
        if (avatarFetchInFlightRef.current.has(l.id)) return false;
        return true;
      })
      .slice(0, 30);

    if (!candidates.length) return;

    for (const lead of candidates) {
      const remoteJid = toWhatsAppRemoteJid(lead.phone);
      if (!remoteJid) continue;

      avatarFetchInFlightRef.current.add(lead.id);
      fetchProfilePictureUrl({
        baseUrl: evolutionConfig.url,
        apiKey: evolutionConfig.apiKey,
        instance: evolutionConfig.instance,
        remoteJid,
      })
        .then(async (url) => {
          avatarFetchedRef.current.add(lead.id);
          if (!url) return;

          setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, avatar_url: url } : l)));
          setActiveLead((prev) => (prev?.id === lead.id ? { ...prev, avatar_url: url } : prev));
          setDetailsModalLead((prev) => (prev?.id === lead.id ? { ...prev, avatar_url: url } : prev));
          setNotesModalLead((prev) => (prev?.id === lead.id ? { ...prev, avatar_url: url } : prev));

          await supabase
            .from('leads')
            .update({ avatar_url: url })
            .eq('id', lead.id)
            .eq('organization_id', currentOrganization.id);
        })
        .catch(() => {
          avatarFetchedRef.current.add(lead.id);
        })
        .finally(() => {
          avatarFetchInFlightRef.current.delete(lead.id);
        });
    }
  }, [currentOrganization, evolutionConfig, leads]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Realtime sync: reflect lead status changes from other screens (e.g. LiveChat)
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
            setLeads((prev) => prev.filter((l) => l.id !== deletedId));
            return;
          }

          const row = payload.new as Lead;
          if (!row?.id) return;

          setLeads((prev) => {
            const exists = prev.some((l) => l.id === row.id);
            const next = exists ? prev.map((l) => (l.id === row.id ? { ...l, ...row } : l)) : [row, ...prev];
            return next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrganization]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteLead = async (id: string) => {
    // Note: confirm() removed to avoid sandbox environment errors
    try {
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Update local state without refreshing
        setLeads(prev => prev.filter(lead => lead.id !== id));
        showToast('Lead excluído com sucesso!', 'success');
        setActiveMenuId(null);

    } catch (error: any) {
        console.error('Erro ao excluir lead:', error.message);
        showToast('Erro ao excluir lead.', 'error');
    }
  };

  const handleExportCsv = async () => {
    if (!leads || leads.length === 0) {
      showToast('Nenhum lead para exportar.', 'info');
      return;
    }
    setIsExporting(true);
    try {
      const headers = ['Nome', 'Telefone', 'Status', 'Tags', 'Última Ativ.', 'Email'];
      const escape = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = Array.isArray(v) ? v.join(';') : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      };

      const rows = leads.map(l => [
        escape(l.name),
        escape(l.phone),
        escape(l.status),
        escape(l.tags || []),
        escape(l.last_active || ''),
        escape((l as any).email || '')
      ].join(','));

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const pad = (n:number) => String(n).padStart(2,'0');
      a.download = `leads_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(`Exportados ${leads.length} leads.`, 'success');
    } catch (err: any) {
      console.error('Erro ao exportar CSV:', err);
      showToast('Erro ao exportar CSV.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Modal */}
      <NewLeadModal 
        isOpen={isNewLeadModalOpen} 
        onClose={() => setIsNewLeadModalOpen(false)} 
        onSuccess={fetchLeads} 
      />

      {notesModalLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={() => setNotesModalLead(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Anotações</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{notesModalLead.name} • {notesModalLead.phone}</div>
              </div>
              <button
                type="button"
                onClick={() => setNotesModalLead(null)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Fechar
              </button>
            </div>
            <div className="p-4">
              <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-3 min-h-[120px]">
                {notesModalLead.notes || 'Sem anotações disponíveis.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {detailsModalLead && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={() => setDetailsModalLead(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Detalhes do Lead</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Informações básicas e status</div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalLead(null)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-4">
                <img
                  src={detailsModalLead.avatar_url || 'https://ohgcufkcrpehkvxavmhw.supabase.co/storage/v1/object/public/logo/avatar.png'}
                  onError={(e) => {
                    const img = e.currentTarget;
                    const fallback = 'https://ohgcufkcrpehkvxavmhw.supabase.co/storage/v1/object/public/logo/avatar.png';
                    if (img.src !== fallback) img.src = fallback;
                  }}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                />

                <div className="min-w-0 flex-1">
                  <div className="text-lg font-extrabold text-gray-900 dark:text-gray-100 truncate">{detailsModalLead.name}</div>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{detailsModalLead.phone}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(detailsModalLead.phone);
                          showToast('Telefone copiado!', 'success');
                        } catch {
                          showToast('Não foi possível copiar.', 'error');
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copiar
                    </button>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className={`ss-keep-colored inline-flex px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[detailsModalLead.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                    {STATUS_MAP[detailsModalLead.status] || detailsModalLead.status}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 p-3">
                  <div className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400">Última atividade</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatLeadDateTime(detailsModalLead.last_active)}</div>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 p-3">
                  <div className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400">Criado em</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{formatLeadDateTime(detailsModalLead.created_at)}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Tags</div>
                {detailsModalLead.tags && detailsModalLead.tags.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {detailsModalLead.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs rounded border border-gray-200 dark:border-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-gray-400">Sem tags</div>
                )}
              </div>

              <div className="mt-4">
                <div className="text-[11px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">Anotações</div>
                <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-xl p-3 min-h-[90px]">
                  {detailsModalLead.notes || 'Sem anotações disponíveis.'}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDetailsModalLead(null);
                    setNotesModalLead(detailsModalLead);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Ver anotações
                </button>
                <button
                  type="button"
                  onClick={() => setDetailsModalLead(null)}
                  className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-primary dark:text-secondary">Leads</h1>
           <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie seus contatos e acompanhe o status deles.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${view === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm text-primary dark:text-secondary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <List className="w-4 h-4 inline-block mr-1" />
              Lista
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${view === 'kanban' ? 'bg-white dark:bg-gray-800 shadow-sm text-primary dark:text-secondary' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <LayoutGrid className="w-4 h-4 inline-block mr-1" />
              Kanban
            </button>
          </div>
          <button 
            onClick={() => setIsNewLeadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-colors shadow-sm"
          >
              <Plus className="w-4 h-4" /> Novo Lead
          </button>
          <button
            onClick={handleExportCsv}
            disabled={isExporting || leads.length === 0}
            className={`flex items-center gap-2 px-4 py-2 ${isExporting ? 'bg-primary text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200'} border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Exportar CSV
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50 dark:bg-gray-800/50">
             <div className="relative w-full max-w-md">
             <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
             <input 
               type="text" 
               placeholder="Buscar por nome, telefone ou tag..." 
               className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-primary focus:border-primary text-gray-700 dark:text-gray-200 placeholder-gray-400"
             />
           </div>
           <div className="flex gap-2">
             <button className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600">
               <Filter className="w-4 h-4" /> Filtrar
             </button>
           </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tags</th>
                <th className="px-6 py-4">Última Ativ.</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                  <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex justify-center items-center gap-2 text-gray-500 dark:text-gray-400">
                              <Loader2 className="w-5 h-5 animate-spin" /> Carregando leads...
                          </div>
                      </td>
                  </tr>
              ) : leads.length === 0 ? (
                  <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex flex-col justify-center items-center gap-2 text-gray-400 dark:text-gray-500">
                              <Inbox className="w-10 h-10 opacity-30" />
                              <p>Nenhum lead encontrado.</p>
                          </div>
                      </td>
                  </tr>
              ) : (
                  leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                        <img
                          src={lead.avatar_url || 'https://ohgcufkcrpehkvxavmhw.supabase.co/storage/v1/object/public/logo/avatar.png'}
                          onError={(e) => {
                            const img = e.currentTarget;
                            const fallback = 'https://ohgcufkcrpehkvxavmhw.supabase.co/storage/v1/object/public/logo/avatar.png';
                            if (img.src !== fallback) img.src = fallback;
                          }}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{lead.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{lead.phone}</div>
                        </div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`ss-keep-colored inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                        {STATUS_MAP[lead.status] || lead.status}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                        {lead.tags?.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded border border-gray-200 dark:border-gray-600">
                            {tag}
                            </span>
                        ))}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {lead.last_active || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex justify-end items-center">
                            <div className="relative">
                              <button 
                                onClick={() => setActiveMenuId(activeMenuId === lead.id ? null : lead.id)}
                                className={`p-2 rounded-full transition-colors ${activeMenuId === lead.id ? 'bg-gray-100 dark:bg-gray-700 text-primary' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600'}`}
                              >
                                <MoreVertical size={18} />
                              </button>

                              {activeMenuId === lead.id && (
                                <div 
                                  ref={menuRef}
                                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <button 
                                    onClick={() => {
                                      setDetailsModalLead(lead);
                                      setActiveMenuId(null);
                                    }}
                                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                                  >
                                    <Eye size={16} className="text-gray-400" />
                                    Ver Detalhes
                                  </button>
                                  <div className="h-px bg-gray-100 dark:bg-gray-700 mx-2 my-1" />
                                  <button 
                                    onClick={() => handleDeleteLead(lead.id)}
                                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium"
                                  >
                                    <Trash2 size={16} />
                                    Excluir Lead
                                  </button>
                                </div>
                               )}
                             </div>
                        </div>
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
           <span>Mostrando {leads.length} registros</span>
           <div className="flex gap-2">
             <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50" disabled>Anterior</button>
             <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700" disabled={leads.length === 0}>Próximo</button>
           </div>
        </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="h-[calc(100vh-260px)] min-h-[420px] overflow-hidden">
            <div className="flex gap-4 overflow-x-auto h-full pb-4">
              {(Object.entries(leadsByStatus) as [string, Lead[]][]).map(([status, statusLeads]) => (
                <KanbanColumn
                  key={status}
                  id={status}
                  title={STATUS_MAP[status]}
                  leads={statusLeads}
                  colorClass={STATUS_COLORS[status]}
                  onOpenNotes={(lead) => setNotesModalLead(lead)}
                  activeMenuId={activeMenuId}
                  setActiveMenuId={setActiveMenuId}
                  menuRef={menuRef}
                  onViewDetails={(lead) => {
                    setDetailsModalLead(lead);
                    setActiveMenuId(null);
                  }}
                  onDeleteLead={(leadId) => handleDeleteLead(leadId)}
                />
              ))}
            </div>
          </div>
          <DragOverlay dropAnimation={dropAnimation}>
            {activeLead ? (
              <LeadCard
                lead={activeLead}
                onOpenNotes={(lead) => setNotesModalLead(lead)}
                activeMenuId={activeMenuId}
                setActiveMenuId={setActiveMenuId}
                menuRef={menuRef}
                onViewDetails={(lead) => {
                  setDetailsModalLead(lead);
                  setActiveMenuId(null);
                }}
                onDeleteLead={(leadId) => handleDeleteLead(leadId)}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
};

export default Leads;
