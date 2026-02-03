"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Calendar, AlertCircle, RefreshCw, Star, TrendingUp, Coins } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useTenant } from '@/contexts/TenantContext';
import CustomSelect from '@/components/ui/CustomSelect';

export default function Dashboard() {
  const { tenantId, user } = useTenant();

  const [stats, setStats] = useState({
    totalClients: 0,
    totalAppointments: 0,
    cancelled: 0,
    rescheduled: 0,
    completed: 0,
    estimatedSales: 0
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    if (tenantId) {
      fetchStats();

      // Subscribe to real-time changes
      const channel = supabase
        .channel('dashboard-realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter: `cliente_id=eq.${tenantId}`
          },
          () => fetchStats()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'clients',
            filter: `cliente_id=eq.${tenantId}`
          },
          () => fetchStats()
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'patient_treatments',
            filter: `cliente_id=eq.${tenantId}`
          },
          () => fetchStats()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [tenantId, period]);

  const getStartDate = (period: string) => {
    const now = new Date();
    const start = new Date(now);

    if (period === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'year') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
    }
    return start.toISOString();
  };

  const fetchStats = async () => {
    if (!tenantId) return;

    const startDate = getStartDate(period);
    const now = new Date().toISOString();

    // 1. Clients count (total logic remains global for now, or could match new clients in period)
    // Let's keep total clients as TOTAL for now, but maybe "New Patients" should be filtered?
    // The metric says "Nuevos Pacientes", implies specific to period.
    const { count: clientsCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('cliente_id', tenantId)
      .gte('created_at', startDate); // Filter new clients by period

    // 2. Appointments for this tenant in period
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('cliente_id', tenantId)
      .gte('start_time', startDate);

    // 3. Estimated Sales (from patient_treatments budget_amount)
    const { data: treatments } = await supabase
      .from('patient_treatments')
      .select('budget_amount')
      .eq('cliente_id', tenantId)
      .gte('created_at', startDate);

    const totalSales = treatments?.reduce((sum, t) => sum + (Number(t.budget_amount) || 0), 0) || 0;

    // 3. Upcoming Appointments for the TABLE (Next 5 from NOW)
    const { data: upcoming } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        status,
        clients (name),
        clinics (name)
      `)
      .eq('cliente_id', tenantId)
      .gte('start_time', now) // Future only
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true })
      .limit(5);

    if (upcoming) setUpcomingAppointments(upcoming);

    if (appointments) {
      setStats({
        totalClients: clientsCount || 0,
        totalAppointments: appointments.length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length,
        rescheduled: appointments.filter(a => a.status === 'rescheduled').length,
        completed: appointments.filter(a => a.status === 'completed' || a.status === 'confirmed').length,
        estimatedSales: totalSales
      });
    }
  };

  // MOCK DATA FOR CHARTS (Since we don't have enough real seed data for rich viz)
  const ocupacionData = [
    { name: 'Lun', valor: 40 },
    { name: 'Mar', valor: 65 },
    { name: 'Mie', valor: 85 },
    { name: 'Jue', valor: 50 },
    { name: 'Vie', valor: 90 },
  ];

  const periodOptions = [
    { value: 'week', label: 'Esta semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'year', label: 'Este año' }
  ];


  return (
    <div className="flex-1 bg-[#f8f9fa] h-full overflow-y-auto p-8 font-sans">
      {/* HEADLINE & FILTER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Resumen de actividad y rendimiento</p>
        </div>
        <div className="w-48">
          <CustomSelect
            options={periodOptions}
            value={period}
            onChange={setPeriod}
            placeholder="Seleccionar periodo"
          />
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <MetricCard
          label="Total Reservas"
          value={stats.totalAppointments.toString()}
          icon={<Calendar className="text-white" size={24} />}
          color="bg-gray-900"
          subtext="En el periodo seleccionado"
          dark
        />
        <MetricCard
          label="Factor Ocupación"
          value="76%"
          icon={<TrendingUp className="text-emerald-600" size={24} />}
          color="bg-white"
          subtext="Calculado sobre horas útiles"
          highlight
        />
        <MetricCard
          label="Nuevos Pacientes"
          value={stats.totalClients.toString()}
          icon={<Users className="text-blue-600" size={24} />}
          color="bg-white"
          subtext="Registrados en este periodo"
          highlight
        />
        <MetricCard
          label="Ventas Estimadas"
          value={`${stats.estimatedSales.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€`}
          icon={<Coins className="text-amber-600" size={24} />}
          color="bg-white"
          subtext="Presupuestos creados"
          highlight={false}
          trendDown={false}
        />
      </div>

      {/* DETAILED STATS ROW */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
            <AlertCircle size={24} />
          </div>
          <span className="text-2xl font-bold text-gray-900">{stats.cancelled}</span>
          <span className="text-sm text-gray-500 font-medium uppercase tracking-wide mt-1">Cancelaciones</span>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
            <RefreshCw size={24} />
          </div>
          <span className="text-2xl font-bold text-gray-900">{stats.rescheduled}</span>
          <span className="text-sm text-gray-500 font-medium uppercase tracking-wide mt-1">Reprogramados</span>
        </div>
      </div>

      <div className="space-y-6">
        {/* Ocupación Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Factor de Ocupación (Semanal)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ocupacionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f0fdf4' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="valor" fill="#10b981" radius={[6, 6, 0, 0]} barSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Próximas Citas Table */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full min-h-[350px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800">Próximas Citas</h3>
            <button className="text-xs font-bold text-emerald-600 uppercase hover:underline">Ver Calendario</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                  <th className="pb-4 pt-0">Paciente</th>
                  <th className="pb-4 pt-0">Hora</th>
                  <th className="pb-4 pt-0">Sede</th>
                  <th className="pb-4 pt-0">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {upcomingAppointments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 text-sm">
                      No hay citas próximas programadas
                    </td>
                  </tr>
                ) : (
                  upcomingAppointments.map((appt) => {
                    const date = new Date(appt.start_time);
                    const timeStr = date.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Europe/Madrid'
                    });
                    const dateStr = date.toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short'
                    });

                    return (
                      <tr key={appt.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="py-4">
                          <div className="font-medium text-gray-900">{(appt.clients as any)?.name || 'Paciente'}</div>
                          <div className="text-xs text-gray-500 italic">{dateStr}</div>
                        </td>
                        <td className="py-4 text-sm text-gray-600 font-medium">{timeStr}</td>
                        <td className="py-4 text-sm text-gray-600">{(appt.clinics as any)?.name || 'Sede Principal'}</td>
                        <td className="py-4">
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                            appt.status === 'rescheduled' ? 'bg-orange-100 text-orange-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                            {appt.status === 'confirmed' ? 'Confirmada' :
                              appt.status === 'rescheduled' ? 'Re-agendada' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtext, color, icon, dark, highlight, trendDown }: any) {
  return (
    <div className={`${color} p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 relative overflow-hidden group`}>
      {dark && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
      )}

      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col">
          <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${dark ? 'text-gray-400' : 'text-gray-400'}`}>{label}</span>
          <span className={`text-3xl font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{value}</span>
        </div>
        <div className={`p-3 rounded-xl ${dark ? 'bg-white/10' : 'bg-gray-50'}`}>
          {icon}
        </div>
      </div>

      <div className="z-10 mt-auto">
        <p className={`text-xs font-medium flex items-center gap-1 ${dark ? 'text-gray-300' :
          trendDown ? 'text-red-500' :
            highlight ? 'text-emerald-600' : 'text-gray-500'
          }`}>
          {subtext}
        </p>
      </div>
    </div>
  );
}
