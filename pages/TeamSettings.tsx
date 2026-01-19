import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Copy, Check, Trash2, Shield, UserCog } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface Member {
  id: string;
  role: string;
  profile: { full_name: string; email: string; avatar_url: string };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  created_at: string;
}

const TeamSettings: React.FC = () => {
  const { showToast } = useToast();
  const { currentOrganization } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeam = async () => {
    if (!currentOrganization) return;
    
    setIsLoading(true);
    try {
      // 1. Busca Membros
      const { data: membersData } = await supabase
        .from('organization_members')
        .select(`id, role, profile:profiles(full_name, email, avatar_url)`)
        .eq('organization_id', currentOrganization.id);

      // 2. Busca Convites Pendentes
      const { data: invitesData } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .is('used_at', null);

      if (membersData) setMembers(membersData as any);
      if (invitesData) setInvitations(invitesData as any);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
      fetchTeam(); 
  }, [currentOrganization]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Debug log requested to diagnose invite issues
    console.log("Tentando convidar...", { currentOrganization, inviteEmail });

    if (!currentOrganization) {
        showToast('Erro: Organização não carregada.', 'error');
        return;
    }

    try {
      const { data, error } = await supabase.from('invitations').insert({
        organization_id: currentOrganization.id,
        email: inviteEmail,
        role: inviteRole
      }).select().single();

      if (error) throw error;

      showToast('Convite criado! Copie o link abaixo.', 'success');
      setInviteEmail('');
      fetchTeam(); // Recarrega lista
    } catch (error) {
      console.error(error);
      showToast('Erro ao criar convite.', 'error');
    }
  };

  const copyLink = (token: string) => {
    // Gera link: https://dominio.com/#/join?token=XYZ
    const link = `${window.location.origin}/#/join?token=${token}`;
    navigator.clipboard.writeText(link);
    showToast('Link copiado para a área de transferência!', 'success');
  };

  const deleteInvite = async (id: string) => {
    try {
        const { error } = await supabase.from('invitations').delete().eq('id', id);
        if (error) throw error;
        setInvitations(prev => prev.filter(i => i.id !== id));
        showToast('Convite removido.', 'success');
    } catch (error) {
        showToast('Erro ao remover convite.', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary dark:text-secondary flex items-center gap-3">
            <UserCog className="w-8 h-8" /> Gestão de Equipe
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
             Gerencie membros e permissões da organização <strong>{currentOrganization?.name}</strong>.
          </p>
        </div>
      </div>

      {/* Card de Convite */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-secondary" /> Convidar Novo Membro
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">E-mail do Usuário</label>
            <input 
              type="email" 
              required
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary focus:border-primary" 
              placeholder="colega@empresa.com"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Função</label>
            <select 
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-primary focus:border-primary"
            >
              <option value="agent">Agente (Padrão)</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button type="submit" className="w-full md:w-auto bg-primary text-white px-6 py-2.5 rounded-lg font-bold hover:bg-primary-dark transition-colors shadow-md whitespace-nowrap">
            Gerar Convite
          </button>
        </form>

        {/* Lista de Convites Ativos */}
        {invitations.length > 0 && (
          <div className="mt-8 space-y-3 animate-in slide-in-from-top-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Convites Pendentes</h3>
            {invitations.map(inv => (
              <div key={inv.id} className="flex flex-col sm:flex-row items-center justify-between bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/30 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center text-yellow-600 dark:text-yellow-400 font-bold text-xs">
                      @
                  </div>
                  <div>
                      <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{inv.email}</div>
                      <span className="text-xs bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-yellow-200 dark:border-yellow-900 text-yellow-700 dark:text-yellow-400 capitalize font-medium">
                        {inv.role === 'agent' ? 'Agente' : 'Admin'}
                      </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                    onClick={() => copyLink(inv.token)}
                    className="flex items-center gap-1 text-xs text-primary dark:text-secondary font-bold hover:underline bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                    <Copy className="w-3 h-3" /> Copiar Link
                    </button>
                    <button 
                        onClick={() => deleteInvite(inv.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors p-2"
                        title="Cancelar convite"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de Membros */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 flex justify-between items-center">
          <span>Membros Ativos</span>
          <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-full">{members.length}</span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {members.map(member => (
            <div key={member.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <div className="flex items-center gap-4">
                {member.profile?.avatar_url ? (
                     <img src={member.profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
                ) : (
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-sm">
                    {member.profile?.full_name?.charAt(0) || '?'}
                    </div>
                )}
                <div>
                  <div className="font-bold text-gray-900 dark:text-gray-100">{member.profile?.full_name || 'Usuário'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{member.profile?.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize border flex items-center gap-1 ${
                    member.role === 'owner' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' : 
                    member.role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' : 
                    'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                }`}>
                    {member.role === 'owner' && <Shield className="w-3 h-3" />}
                    {member.role === 'owner' ? 'Dono' : member.role === 'admin' ? 'Admin' : 'Agente'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeamSettings;