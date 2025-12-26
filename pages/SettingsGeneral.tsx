import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { SettingsContext } from './Settings';
import { Globe, Clock, Save, RefreshCw } from 'lucide-react';

const SettingsGeneral: React.FC = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) return null;

  const { timeZones, selectedZone, setSelectedZone, currentTime, handleSaveRegional, isSavingRegional } = ctx as any;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary dark:text-secondary" /> Configurações Regionais
            </h2>
            <Link to="/settings" className="px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-[#004a3c]">Voltar</Link>
        </div>
        <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fuso Horário</label>
                        <select 
                            value={selectedZone}
                            onChange={(e) => setSelectedZone(e.target.value)}
                            className="w-full pl-4 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100"
                        >
                            {timeZones.map((tz: string) => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                        </select>
                    </div>
                    <button onClick={handleSaveRegional} disabled={isSavingRegional} className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-[#004a3c] transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-70 self-start">
                        {isSavingRegional ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Preferências
                    </button>
                </div>
                <div className="bg-[#F8FAFC] dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl p-8 flex flex-col justify-center items-center text-center">
                    <div className="w-14 h-14 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm mb-4 border border-gray-100 dark:border-gray-700">
                        <Clock className="w-6 h-6 text-primary dark:text-secondary" />
                    </div>
                    <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 tabular-nums">{currentTime || '--/--/---- --:--:--'}</div>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Configurações de Notificação (Em Breve)</h2>
        <div className="space-y-4">
           <div className="flex items-center justify-between">
               <span className="text-gray-700 dark:text-gray-300">Notificações por E-mail</span>
               <div className="w-10 h-6 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
           </div>
           <div className="flex items-center justify-between">
               <span className="text-gray-700 dark:text-gray-300">Alertas críticos no WhatsApp</span>
               <div className="w-10 h-6 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
           </div>
        </div>
      </div>
    </>
  );
};

export default SettingsGeneral;
