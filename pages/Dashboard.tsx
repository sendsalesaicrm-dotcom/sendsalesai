import React, { useState, useEffect } from 'react';
import { Users, Send, Bot, TrendingUp, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardMetrics, AttendanceData } from '../types';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; color: string; isLoading: boolean }> = ({ title, value, icon: Icon, color, isLoading }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`p-4 rounded-full ${color} bg-opacity-10 dark:bg-opacity-20`}>
      <Icon className={`w-8 h-8 ${color.replace('bg-', 'text-')}`} />
    </div>
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</p>
      {isLoading ? (
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-1"></div>
      ) : (
        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</h3>
      )}
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [chartData, setChartData] = useState<AttendanceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real data from Supabase
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Simulating fetch delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setMetrics({
          activeLeads: 0,
          messagesSentToday: 0,
          aiConversionRate: 0
        });
        setChartData([]); // Empty initially
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary dark:text-secondary">Painel de Controle</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Bem-vindo de volta, Admin. Aqui está seu resumo diário.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Leads Ativos" 
          value={metrics?.activeLeads || 0} 
          icon={Users} 
          color="bg-primary text-primary"
          isLoading={isLoading} 
        />
        <StatCard 
          title="Mensagens Enviadas Hoje" 
          value={metrics?.messagesSentToday.toLocaleString('pt-BR') || 0} 
          icon={Send} 
          color="bg-secondary text-secondary"
          isLoading={isLoading} 
        />
        <StatCard 
          title="Taxa de Conversão IA" 
          value={`${metrics?.aiConversionRate.toLocaleString('pt-BR') || 0}%`} 
          icon={Bot} 
          color="bg-accent text-accent"
          isLoading={isLoading} 
        />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary dark:text-secondary" />
            Volume de Atendimento: Humano vs. IA
          </h2>
        </div>
        <div className="h-80 w-full flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span>Carregando gráfico...</span>
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} />
                <Tooltip 
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="human" name="Agentes Humanos" fill="#005C4B" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="ai" name="Agentes IA" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-400 dark:text-gray-500 text-sm">Nenhum dado de atendimento disponível.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;