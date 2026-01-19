import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Save, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure we have a recovery session in place.
    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) {
          showToast('Link inválido ou expirado. Solicite um novo link de recuperação.', 'error');
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, [showToast]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      showToast('A senha deve ter pelo menos 6 caracteres.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('As senhas não coincidem.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      showToast('Senha atualizada com sucesso! Faça login novamente.', 'success');
      navigate('/login');
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || 'Erro ao atualizar senha.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{
        background: 'linear-gradient(135deg, #5560ff 0%, #32ccff 50%, #00ffa3 100%)',
      }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-4 shadow-2xl shadow-black/10 sm:rounded-xl sm:px-10 border border-white/50 relative">
          <div className="flex flex-col items-center mb-8">
            <img
              src="https://ohgcufkcrpehkvxavmhw.supabase.co/storage/v1/object/public/logo/x.png"
              alt="SendSales.ai"
              className="w-16 h-16 mb-4 object-contain"
            />
            <h2 className="text-2xl font-bold text-gray-900 text-center">Definir nova senha</h2>
            <p className="text-sm text-gray-500 mt-1 text-center">Digite e confirme sua nova senha.</p>
          </div>

          {!isReady ? (
            <div className="flex justify-center items-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleReset}>
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  Nova senha
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full pl-10 sm:text-sm border-gray-300 rounded-lg focus:ring-primary focus:border-primary p-2.5 border transition-colors bg-gray-50 focus:bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar senha
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 sm:text-sm border-gray-300 rounded-lg focus:ring-primary focus:border-primary p-2.5 border transition-colors bg-gray-50 focus:bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      Salvar Nova Senha <Save className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Precisa de outro link?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/forgot-password"
                className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Solicitar novo link
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
