import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { SettingsContext } from './Settings';
import { MessageSquare, Loader2, Wifi, Save, Eye, EyeOff } from 'lucide-react';

const SettingsMeta: React.FC = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) return null;

  const { wabaId, setWabaId, phoneId, setPhoneId, accessToken, setAccessToken, showAccessToken, setShowAccessToken, handleTestConnection, isTestingConnection, connectionStatus, handleSaveWhatsApp, isLoadingConfig } = ctx as any;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-secondary" /> Conexão WhatsApp API (Meta Oficial)
          </h2>
          <div className="flex items-center gap-4">
            {connectionStatus === 'success' && <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">Conectado</span>}
            <Link to="/settings" className="px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-[#004a3c]">Voltar</Link>
          </div>
      </div>
      <div className={`p-8 space-y-6 ${isLoadingConfig ? 'opacity-50 pointer-events-none' : ''}`}>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WABA ID</label>
                  <input type="text" value={wabaId} onChange={(e) => setWabaId(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number ID</label>
                  <input type="text" value={phoneId} onChange={(e) => setPhoneId(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
              <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Token</label>
                  <div className="relative">
                      <input type={showAccessToken ? "text" : "password"} value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 pr-12 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      <button onClick={() => setShowAccessToken(!showAccessToken)} className="absolute right-3 top-2.5 text-gray-400">{showAccessToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                  </div>
              </div>
           </div>
           <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
               <button onClick={handleTestConnection} disabled={isTestingConnection || !phoneId} className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                   {isTestingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />} Testar Conexão Oficial
               </button>
               <button onClick={handleSaveWhatsApp} disabled={isLoadingConfig} className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-[#004a3c] transition-colors shadow-md">Salvar Credenciais Meta</button>
           </div>
      </div>
    </div>
  );
};

export default SettingsMeta;
