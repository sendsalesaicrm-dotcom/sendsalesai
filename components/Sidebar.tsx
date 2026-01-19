import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MessageSquareText, Megaphone, Users, Bot, Settings, LogOut, Moon, UserCog } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../pages/Settings';

const Sidebar: React.FC = () => {
  const [dateTime, setDateTime] = useState({ time: '', date: '' });
  const { logout, userRole } = useAuth();
  const { isDarkMode, toggleTheme, primaryColor } = useTheme();
  const { clearAllDrafts } = useSettings();

  // RBAC: Agents can only see Dashboard, Chat and Leads
  const isAgent = userRole === 'agent';

  const allNavItems = [
    { icon: LayoutDashboard, label: 'Painel', path: '/', allowed: true },
    { icon: MessageSquareText, label: 'Chat ao Vivo', path: '/chat', allowed: true },
    // { icon: Megaphone, label: 'Campanhas', path: '/campaigns', allowed: !isAgent }, // V1: oculto
    { icon: Users, label: 'Leads', path: '/leads', allowed: true },
    // { icon: Bot, label: 'Agentes IA', path: '/ai-agents', allowed: !isAgent }, // V1: oculto
    { icon: UserCog, label: 'Equipe', path: '/team', allowed: !isAgent },
  ];

  const navItems = allNavItems.filter(item => item.allowed);

  useEffect(() => {
    const updateTime = () => {
      // Get timezone from localStorage or fallback to browser default
      const timeZone = localStorage.getItem('sendsales_timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date();

      try {
        // Format Time (HH:mm:ss)
        const timeStr = formatInTimeZone(now, timeZone, 'HH:mm:ss');
        
        // Format Date (Segunda-feira, 25 de Outubro de 2024)
        const dateStr = new Intl.DateTimeFormat('pt-BR', {
          timeZone,
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(now);

        setDateTime({
          time: timeStr,
          date: dateStr
        });
      } catch (e) {
        setDateTime({ time: '--:--:--', date: '---' });
      }
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="w-64 bg-primary text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-50 transition-colors duration-300">
      <div className="p-6 border-b border-primary-dark/40">
        {/* Logo Section */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 flex items-center justify-center">
             <img 
               src="https://ohgcufkcrpehkvxavmhw.supabase.co/storage/v1/object/public/logo/logo%20(1).png" 
               alt="SendSales Logo" 
               className="w-full h-full object-contain"
             />
          </div>
          <h1 className="text-xl font-bold tracking-tight">SendSales.ai</h1>
        </div>

        {/* Date & Time Widget */}
        <div className={`${primaryColor === 'black' ? 'bg-primary-dark' : 'bg-primary-dark/40'} rounded-lg p-4 border border-white/20 flex flex-col items-center text-center`}
        >
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-2xl font-mono font-bold text-white tracking-widest leading-none">
              {dateTime.time}
            </span>
            <span className="text-[10px] text-gray-400 font-mono animate-pulse">●</span>
          </div>
          <p className="text-xs text-gray-300 capitalize font-medium border-t border-white/10 pt-2 w-full">
            {dateTime.date}
          </p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-primary-dark text-secondary font-medium shadow-md border-l-4 border-secondary'
                  : 'hover:bg-primary-dark/50 text-gray-300 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-primary-dark/40 space-y-1">
        
        {/* Dark Mode Toggle */}
        <div 
          onClick={toggleTheme}
          className="flex items-center justify-between px-4 py-3 rounded-lg text-gray-300 hover:text-white hover:bg-primary-dark/50 transition-colors cursor-pointer group mb-1"
        >
          <div className="flex items-center gap-3">
             <Moon className="w-5 h-5" />
             <span>Modo Escuro</span>
          </div>
          <div className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isDarkMode ? 'bg-secondary' : 'bg-gray-600/50'}`}>
              <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300 shadow-sm ${isDarkMode ? 'left-6' : 'left-1'}`} />
          </div>
        </div>

        {!isAgent && (
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-primary-dark/50 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
            <span>Configurações</span>
          </NavLink>
        )}
        
        <button 
          onClick={() => {
            logout();
            clearAllDrafts();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-300 hover:text-red-100 hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;