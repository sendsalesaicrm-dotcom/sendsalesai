import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, Loader2, User, Phone, Tag } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const NewLeadModal: React.FC<NewLeadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();
  const { currentOrganization } = useAuth();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('new');
  const [isLoading, setIsLoading] = useState(false);

  const [isCheckingLeadLimit, setIsCheckingLeadLimit] = useState(false);
  const [leadLimit, setLeadLimit] = useState<number | null>(null);
  const [currentLeadCount, setCurrentLeadCount] = useState<number>(0);

  const isLeadLimitReached = useMemo(() => {
    if (leadLimit === null || leadLimit === undefined) return false;
    if (!Number.isFinite(leadLimit)) return false;
    return currentLeadCount >= leadLimit;
  }, [currentLeadCount, leadLimit]);

  const refreshLeadLimit = async () => {
    if (!currentOrganization?.id) return;
    setIsCheckingLeadLimit(true);
    try {
      const orgId = currentOrganization.id;

      const [{ data: org, error: orgErr }, { count, error: leadsErr }] = await Promise.all([
        supabase.from('organizations').select('lead_limit').eq('id', orgId).single(),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      ]);

      if (orgErr) throw orgErr;
      if (leadsErr) throw leadsErr;

      const limit = (org as any)?.lead_limit;
      setLeadLimit(typeof limit === 'number' ? limit : limit == null ? null : Number(limit));
      setCurrentLeadCount(count ?? 0);
    } catch (error: any) {
      console.error('Error checking lead limit:', error);
      // Fail open: if we can't verify the plan limit, don't block lead creation.
      setLeadLimit(null);
    } finally {
      setIsCheckingLeadLimit(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!currentOrganization?.id) return;
    refreshLeadLimit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentOrganization?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentOrganization) {
      showToast('Erro: Organização não identificada.', 'error');
      return;
    }

    if (!name.trim() || !phone.trim()) {
      showToast('Nome e telefone são obrigatórios.', 'error');
      return;
    }

    // Re-check on submit to avoid stale UI.
    await refreshLeadLimit();
    if (isLeadLimitReached) {
      showToast('Limite de leads do seu plano atingido. Faça upgrade para continuar.', 'error');
      return;
    }

    setIsLoading(true);

    // LIMPEZA ANTES DE SALVAR:
    const cleanPhone = phone.replace(/\D/g, '');

    try {
      // Prevent duplicates (client-side) even if DB constraint isn't applied yet
      const { data: existing, error: existingError } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', currentOrganization.id)
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing?.id) {
        showToast('Este número de telefone já está cadastrado.', 'error');
        return;
      }
    } catch (error: any) {
      console.error('Error checking existing lead:', error);
      showToast('Erro ao validar telefone.', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('leads').insert({
        organization_id: currentOrganization.id,
        name: name,
        phone: cleanPhone, // Salva sempre limpo
        status: status,
        tags: ['manual'], // Tag padrão para identificar origem
        notes: 'Lead criado manualmente.'
      });

      if (error) throw error;

      showToast('Lead criado com sucesso!', 'success');
      
      // Limpar formulário
      setName('');
      setPhone('');
      setStatus('new');
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating lead:', error);
      const code = error?.code;
      if (code === '23505') {
        showToast('Este número de telefone já está cadastrado.', 'error');
      } else {
        showToast('Erro ao criar lead: ' + error.message, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Novo Lead Manual</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {isLeadLimitReached && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-200">
              Limite de leads do seu plano atingido. Faça upgrade para continuar.
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Lead *</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Maria Silva"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone (WhatsApp) *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: +5511999999999"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Inclua o código do país (ex: +55).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status Inicial</label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 appearance-none"
              >
                <option value="new">Novo</option>
                <option value="contacted">Contatado</option>
                <option value="qualified">Qualificado</option>
                <option value="customer">Cliente</option>
                <option value="lost">Perdido</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isLoading || isCheckingLeadLimit || isLeadLimitReached}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {isLoading || isCheckingLeadLimit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Lead
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default NewLeadModal;
