
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Lead } from '../types';
import { STATUS_MAP, STATUS_COLORS } from '../constants';
import { Search, Filter, MoreVertical, Download, Loader2, Inbox, Plus, Trash2, Eye } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import NewLeadModal from '../components/NewLeadModal';

const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const { currentOrganization } = useAuth();
  const { showToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Modal */}
      <NewLeadModal 
        isOpen={isNewLeadModalOpen} 
        onClose={() => setIsNewLeadModalOpen(false)} 
        onSuccess={fetchLeads} 
      />

      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-primary dark:text-secondary">Leads</h1>
           <p className="text-gray-500 dark:text-gray-400 mt-1">Gerencie seus contatos e acompanhe o status deles.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsNewLeadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-[#004a3c] transition-colors shadow-sm"
          >
              <Plus className="w-4 h-4" /> Novo Lead
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

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
                        <img src={lead.avatar_url || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 rounded-full object-cover" />
                        <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">{lead.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{lead.phone}</div>
                        </div>
                        </div>
                    </td>
                    <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
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
                                      showToast('Funcionalidade Ver Detalhes em breve!', 'info');
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
    </div>
  );
};

export default Leads;
