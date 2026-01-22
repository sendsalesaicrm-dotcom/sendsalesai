import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

const ForgotPassword: React.FC = () => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const redirectUrl = window.location.origin + '/reset-password';

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      showToast('Link de recuperação enviado! Verifique seu e-mail.', 'success');
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || 'Erro ao enviar link de recuperação.', 'error');
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
            <h2 className="text-2xl font-bold text-gray-900 text-center">Recuperar senha</h2>
            <p className="text-sm text-gray-500 mt-1 text-center">Informe seu e-mail para receber o link de recuperação.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSend}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                E-mail
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-gray-300 rounded-lg focus:ring-[#005C4B] focus:border-[#005C4B] p-2.5 border transition-colors bg-gray-50 focus:bg-white"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#005C4B] hover:bg-[#004a3c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#005C4B] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    Enviar Link de Recuperação <Send className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Lembrou a senha?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/login"
                className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Voltar para Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
