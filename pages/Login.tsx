import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../context/ToastContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        showToast('Login realizado com sucesso!', 'success');
        navigate('/'); // Redireciona para o Dashboard
      }
    } catch (error: any) {
      console.error(error);
      let msg = 'Erro ao fazer login.';
      if (error.message.includes('Invalid login credentials')) {
        msg = 'E-mail ou senha incorretos.';
      }
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{
        background: 'linear-gradient(135deg, #5560ff 0%, #32ccff 50%, #00ffa3 100%)'
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
            <h2 className="text-2xl font-bold text-gray-900 text-center">
              Bem-vindo de volta
            </h2>
           
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            
            {/* Email */}
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
                  className="block w-full pl-10 sm:text-sm border-gray-300 rounded-lg focus:ring-primary focus:border-primary p-2.5 border transition-colors bg-gray-50 focus:bg-white"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-lg focus:ring-primary focus:border-primary p-2.5 border transition-colors bg-gray-50 focus:bg-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="-mt-2 flex justify-end">
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                Esqueceu sua senha?
              </Link>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-[#004a3c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Entrando...
                  </>
                ) : (
                  <>
                    Entrar na Plataforma <LogIn className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Link para Cadastro */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Ainda não tem conta?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/register"
                className="w-full inline-flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Criar Nova Conta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;