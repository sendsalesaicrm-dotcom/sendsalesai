import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Users } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

const JoinTeam: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return showToast('Token inválido', 'error');
    
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            invitation_token: token // This is handled by a Supabase Trigger
          },
        },
      });

      if (error) throw error;

      showToast('Bem-vindo ao time! Redirecionando...', 'success');
      setTimeout(() => navigate('/'), 2000);

    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Erro ao entrar na equipe.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                  <Users className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Convite Inválido</h2>
              <p className="text-gray-500 text-sm">O link de convite é inválido ou expirou. Peça ao administrador para gerar um novo.</p>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img 
            src="https://ohgcufkcrpehkvxavmhw.supabase.co/storage/v1/object/public/logo/x.png" 
            alt="SendSales.ai" 
            className="w-16 h-16 mx-auto mb-6 object-contain" 
        />
        <h2 className="text-3xl font-extrabold text-gray-900">
          Você foi convidado!
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Crie sua conta para acessar o workspace da equipe.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-8 shadow-xl shadow-gray-200/50 rounded-xl border border-gray-100">
          <form className="space-y-6" onSubmit={handleJoin}>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Seu Nome Completo</label>
              <input 
                type="text" 
                required 
                value={fullName} 
                onChange={e => setFullName(e.target.value)} 
                placeholder="Ex: João Silva"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Seu E-mail Corporativo</label>
              <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="joao@empresa.com"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Crie uma Senha</label>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
              />
            </div>
            <button 
                type="submit" 
                disabled={isLoading} 
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark font-bold shadow-md transition-all transform active:scale-95 disabled:opacity-70 disabled:scale-100"
            >
              {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Entrar na Equipe <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
          
          <div className="mt-6 text-center text-xs text-gray-400">
              Ao criar a conta, você será automaticamente adicionado à organização.
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinTeam;