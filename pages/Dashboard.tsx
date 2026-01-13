import React, { useState, useEffect } from 'react';
import { Users, Send, TrendingUp, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DashboardMetrics, AttendanceData } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

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
  const [leadStatusData, setLeadStatusData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [leadLimit, setLeadLimit] = useState<number>(500);
  const [isLoading, setIsLoading] = useState(true);

  const { user, currentOrganization, userRole } = useAuth();

  useEffect(() => {
    const fetchData = async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) setIsLoading(true);
      try {
        if (!user || !currentOrganization || !userRole) {
          setMetrics({ activeLeads: 0, messagesSentToday: 0, conversionRate: 0 });
          setChartData([]); // Empty initially
          setLeadStatusData([]);
          return;
        }

        const organizationId = currentOrganization.id;
        const userId = user.id;
        const isAgent = userRole === 'agent';

        // Plan limit (fallback to 500)
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('lead_limit')
          .eq('id', organizationId)
          .single();

        if (orgError) throw orgError;
        const fetchedLeadLimit = (orgData as any)?.lead_limit;
        setLeadLimit(typeof fetchedLeadLimit === 'number' ? fetchedLeadLimit : fetchedLeadLimit == null ? 500 : Number(fetchedLeadLimit) || 500);

        const buildLeadsCountQuery = () => {
          let query = supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organizationId);

          if (isAgent) {
            query = query.eq('assigned_to_id', userId);
          }
          return query;
        };

        const now = new Date();
        const startOfTodayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWindowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        const startOfTomorrowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        const conversationsQuery = (() => {
          let query = supabase
            .from('conversations')
            .select('lead_id, created_at, sender_type, is_ai_generated, leads!inner(organization_id, assigned_to_id)')
            .eq('leads.organization_id', organizationId)
            .gte('created_at', startOfWindowLocal.toISOString())
            .lt('created_at', startOfTomorrowLocal.toISOString())
            .in('sender_type', ['user', 'contact']);

          if (isAgent) {
            query = query.eq('leads.assigned_to_id', userId);
          }

          return query;
        })();

        const [totalLeadsRes, wonLeadsRes, lostLeadsRes, activeLeadsRes, conversationsRes] = await Promise.all([
          buildLeadsCountQuery(),
          buildLeadsCountQuery().in('status', ['won', 'customer']),
          buildLeadsCountQuery().eq('status', 'lost'),
          buildLeadsCountQuery().not('status', 'in', '("lost","archived")'),
          conversationsQuery,
        ]);

        let leadsStatusQuery = supabase
          .from('leads')
          .select('status')
          .eq('organization_id', organizationId);
        if (isAgent) {
          leadsStatusQuery = leadsStatusQuery.eq('assigned_to_id', userId);
        }
        const leadsStatusRes = await leadsStatusQuery;

        if (totalLeadsRes.error) throw totalLeadsRes.error;
        if (wonLeadsRes.error) throw wonLeadsRes.error;
        if (lostLeadsRes.error) throw lostLeadsRes.error;
        if (activeLeadsRes.error) throw activeLeadsRes.error;
        if (conversationsRes.error) throw conversationsRes.error;
        if (leadsStatusRes.error) throw leadsStatusRes.error;

        const totalLeads = totalLeadsRes.count ?? 0;
        const wonLeads = wonLeadsRes.count ?? 0;
        const lostLeads = lostLeadsRes.count ?? 0;
        const activeLeads = activeLeadsRes.count ?? 0;
        const closedLeads = wonLeads + lostLeads;
        const conversionRate = closedLeads > 0 ? Number(((wonLeads / closedLeads) * 100).toFixed(1)) : 0;

        const conversations = (conversationsRes.data ?? []) as Array<{
          lead_id: string;
          created_at: string;
          sender_type: 'user' | 'contact';
          is_ai_generated: boolean | null;
        }>;

        const toLocalDateKey = (d: Date) => {
          const yyyy = String(d.getFullYear());
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${yyyy}-${mm}-${dd}`;
        };

        const days: Date[] = [];
        for (let i = 6; i >= 0; i -= 1) {
          days.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i));
        }

        const buckets = new Map<string, { human: number; ai: number }>();
        for (const day of days) {
          buckets.set(toLocalDateKey(day), { human: 0, ai: 0 });
        }

        for (const row of conversations) {
          const date = new Date(row.created_at);
          const key = toLocalDateKey(date);
          const bucket = buckets.get(key);
          if (!bucket) continue;

          if (row.sender_type === 'contact') {
            bucket.ai += 1;
          } else if (row.sender_type === 'user' && row.is_ai_generated === false) {
            bucket.human += 1;
          }
        }

        const todayKey = toLocalDateKey(startOfTodayLocal);
        const messagesSentToday = buckets.get(todayKey)?.human ?? 0;

        const chartDataNext: AttendanceData[] = days.map((day) => {
          const key = toLocalDateKey(day);
          const bucket = buckets.get(key) ?? { human: 0, ai: 0 };
          return {
            name: day
              .toLocaleDateString('pt-BR', { weekday: 'short' })
              .replace('.', '')
              .toUpperCase(),
            human: bucket.human,
            ai: bucket.ai,
          };
        });

        const statusLabel = (status: string) => {
          switch (status) {
            case 'new':
              return 'Novos';
            case 'contacted':
              return 'Contatados';
            case 'qualified':
              return 'Qualificados';
            case 'won':
            case 'customer':
              return 'Clientes';
            case 'lost':
              return 'Perdidos';
            case 'archived':
              return 'Arquivados';
            default:
              return status;
          }
        };

        const statusColor = (status: string) => {
          switch (status) {
            case 'contacted':
              return '#3B82F6';
            case 'new':
              return '#EF4444';
            case 'qualified':
              return '#F59E0B';
            case 'won':
            case 'customer':
              return '#22C55E';
            case 'lost':
              return '#F97316';
            case 'archived':
              return '#6B7280';
            default:
              return '#A3A3A3';
          }
        };

        const statusCounts = new Map<string, number>();
        for (const row of (leadsStatusRes.data ?? []) as Array<{ status: string | null }>) {
          const s = row.status ?? 'unknown';
          statusCounts.set(s, (statusCounts.get(s) ?? 0) + 1);
        }

        const desiredOrder = ['contacted', 'new', 'qualified', 'won', 'customer', 'lost', 'archived', 'unknown'];
        const statusDataNext = Array.from(statusCounts.entries())
          .sort((a, b) => desiredOrder.indexOf(a[0]) - desiredOrder.indexOf(b[0]))
          .map(([status, value]) => ({ name: `${statusLabel(status)}:${value}`, value, color: statusColor(status) }))
          .filter((d) => d.value > 0);

        setMetrics({
          activeLeads,
          messagesSentToday,
          conversionRate,
        });

        setChartData(chartDataNext);
        setLeadStatusData(statusDataNext);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        if (!opts?.silent) setIsLoading(false);
      }
    };

    fetchData();

    if (!user || !currentOrganization || !userRole) return;

    const organizationId = currentOrganization.id;

    const channel = supabase
      .channel(`public:leads:dashboard:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          // Silent refresh to avoid UI flicker; updates conversion + status donut.
          fetchData({ silent: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentOrganization, userRole]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary dark:text-secondary">Painel de Controle</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Bem-vindo de volta, Admin. Aqui está seu resumo diário.</p>

          <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            {(() => {
              const used = metrics?.activeLeads ?? 0;
              const limit = Number.isFinite(leadLimit) && leadLimit > 0 ? leadLimit : 500;
              const pct = Math.min(100, Math.max(0, (used / limit) * 100));

              const barColor = pct < 80 ? 'bg-green-500' : pct < 90 ? 'bg-yellow-500' : 'bg-red-500';
              const trackColor = 'bg-gray-200 dark:bg-gray-700';

              return (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Uso do Plano</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Uso de Leads: <span className="font-semibold">{used}</span> de <span className="font-semibold">{limit}</span>
                    </div>
                  </div>
                  <div className={`mt-3 h-2 w-full rounded-full overflow-hidden ${trackColor}`}>
                    <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </>
              );
            })()}
          </div>
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
          title="Taxa de Conversão" 
          value={`${metrics?.conversionRate.toLocaleString('pt-BR') || 0}%`} 
          icon={TrendingUp} 
          color="bg-accent text-accent"
          isLoading={isLoading} 
        />
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary dark:text-secondary" />
            Volume de Atendimento: Enviadas vs. Recebidas
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
                <Bar dataKey="human" name="Enviadas (Agente)" fill="#005C4B" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="ai" name="Recebidas (Cliente)" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-400 dark:text-gray-500 text-sm">Nenhum dado de atendimento disponível.</div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary dark:text-secondary" />
            Status dos Leads
          </h2>
        </div>
        <div className="h-80 w-full flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span>Carregando gráfico...</span>
            </div>
          ) : leadStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Legend iconType="circle" />
                <Pie
                  data={leadStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={2}
                >
                  {leadStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-400 dark:text-gray-500 text-sm">Nenhum dado de leads disponível.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;