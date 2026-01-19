import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { SettingsContext } from './Settings';
import { Clock, Save, RefreshCw, Palette } from 'lucide-react';
import { PRIMARY_COLOR_OPTIONS, useTheme } from '../context/ThemeContext';

const GENERAL_GEAR_URL = 'https://ohgcufkcrpehkvxavmhw.supabase.co/storage/v1/object/public/logo/gear1.svg';

const SettingsGeneral: React.FC = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) return null;

    const { primaryColor, setPrimaryColor } = useTheme();

  const { timeZones, selectedZone, setSelectedZone, currentTime, handleSaveRegional, isSavingRegional } = ctx as any;

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <img src={GENERAL_GEAR_URL} alt="Geral" className="w-6 h-6" /> Configurações Regionais
            </h2>
            <Link to="/settings" className="px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-primary-dark">Voltar</Link>
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
                    <button onClick={handleSaveRegional} disabled={isSavingRegional} className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-70 self-start">
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

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors mt-6">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Palette className="w-5 h-5 text-primary dark:text-secondary" /> Aparência
                    </h2>
                </div>
                <div className="p-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cor do layout</label>
                            <select
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value as any)}
                                className="w-full pl-4 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-100"
                            >
                                {Object.entries(PRIMARY_COLOR_OPTIONS).map(([key, def]) => (
                                    <option key={key} value={key}>
                                        {def.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Aplica no menu lateral e em elementos com cor primária.</p>
                        </div>

                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-900/30">
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Prévia</div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary shadow-sm" />
                                <div className="w-10 h-10 rounded-lg bg-secondary shadow-sm" />
                                <button className="ml-auto px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-colors">
                                    Botão
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    </>
  );
};

export default SettingsGeneral;
