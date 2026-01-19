import React, { useContext, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SettingsContext } from './Settings';
import { Loader2, Wifi, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const META_LOGO_URL = '/logo2.svg';

const SettingsMeta: React.FC = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) return null;

  const { userRole } = useAuth();
  const isOwner = useMemo(() => userRole === 'owner', [userRole]);
  const isReadOnly = !isOwner;

  const [showAppSecret, setShowAppSecret] = useState(false);

  const {
    wabaId,
    setWabaId,
    phoneId,
    setPhoneId,
    verifyToken,
    setVerifyToken,
    accessToken,
    setAccessToken,
    showAccessToken,
    setShowAccessToken,
    handleTestConnection,
    isTestingConnection,
    connectionStatus,
    handleSaveWhatsApp,
    isLoadingConfig,
  } = ctx as any;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <img src={META_LOGO_URL} alt="Meta" className="w-6 h-6" /> Conexão WhatsApp API (Meta Oficial)
          </h2>
          <div className="flex items-center gap-4">
            {connectionStatus === 'success' && <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">Conectado</span>}
            <Link to="/settings" className="px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-primary-dark">Voltar</Link>
          </div>
      </div>
      {!isOwner && (
        <div className="px-8 pt-6">
          <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 text-orange-800 px-4 py-3">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <div className="text-sm">
              <div className="font-bold">Acesso Negado</div>
              <div className="text-orange-700">Apenas o owner pode visualizar e alterar as credenciais sensíveis da Meta.</div>
            </div>
          </div>
        </div>
      )}
      <div className={`p-8 space-y-6 ${isLoadingConfig ? 'opacity-50 pointer-events-none' : ''}`}>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WABA ID</label>
                  <input disabled={isReadOnly} type="text" value={wabaId} onChange={(e) => setWabaId(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number ID</label>
                  <input disabled={isReadOnly} type="text" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed" />
              </div>
              <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">App Secret</label>
                  <div className="relative">
                      <input
                        disabled={isReadOnly}
                        type={showAppSecret ? "text" : "password"}
                        value={verifyToken}
                        onChange={(e) => setVerifyToken(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 pr-12 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAppSecret(!showAppSecret)}
                        disabled={isReadOnly}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-label={showAppSecret ? 'Ocultar App Secret' : 'Mostrar App Secret'}
                      >
                        {showAppSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                  </div>
              </div>
              <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Token</label>
                  <div className="relative">
                      <input
                        disabled={isReadOnly}
                        type={showAccessToken ? "text" : "password"}
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 pr-12 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccessToken(!showAccessToken)}
                        disabled={isReadOnly}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        aria-label={showAccessToken ? 'Ocultar Access Token' : 'Mostrar Access Token'}
                      >
                        {showAccessToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                  </div>
              </div>
           </div>
           <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
               <button onClick={handleTestConnection} disabled={isReadOnly || isTestingConnection || !phoneId} className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 disabled:opacity-60 disabled:cursor-not-allowed">
                   {isTestingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />} Testar Conexão Oficial
               </button>
               <button onClick={handleSaveWhatsApp} disabled={isReadOnly || isLoadingConfig} className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed">Salvar Credenciais Meta</button>
           </div>
      </div>
    </div>
  );
};

export default SettingsMeta;
