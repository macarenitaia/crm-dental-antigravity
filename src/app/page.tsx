"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Calendar, AlertCircle, RefreshCw, Star, TrendingUp, Coins } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useTenant } from '@/contexts/TenantContext';

export default function Dashboard() {
  const { tenantId, user } = useTenant();

  const [stats, setStats] = useState({
    totalClients: 0,
    totalAppointments: 0,
    cancelled: 0,
    rescheduled: 0,
    completed: 0
  });
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    if (tenantId) {
      fetchStats();
    }
  }, [tenantId, period]);

  const fetchStats = async () => {
    if (!tenantId) return;

    // Clients count for this tenant
    const { count: clientsCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('cliente_id', tenantId);

    // Appointments for this tenant
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('cliente_id', tenantId);

    if (appointments) {
      setStats({
        totalClients: clientsCount || 0,
        totalAppointments: appointments.length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length,
        rescheduled: appointments.filter(a => a.status === 'rescheduled').length,
        completed: appointments.filter(a => a.status === 'completed' || a.status === 'confirmed').length,
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


  return (
    <div className="flex-1 bg-[#f8f9fa] h-full overflow-y-auto p-8 font-sans">
      {/* HEADLINE & FILTER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Resumen de actividad y rendimiento</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
        >
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
          <option value="year">Este año</option>
        </select>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <MetricCard
          label="Total Reservas"
          value={stats.totalAppointments.toString()}
          icon={<Calendar className="text-white" size={24} />}
          color="bg-gray-900"
          subtext="Ver detalles"
          dark
        />
        <MetricCard
          label="Factor Ocupación"
          value="76%"
          icon={<TrendingUp className="text-emerald-600" size={24} />}
          color="bg-white"
          subtext="↑ 12% vs periodo anterior"
          highlight
        />
        <MetricCard
          label="Nuevos Pacientes"
          value={stats.totalClients.toString()}
          icon={<Users className="text-blue-600" size={24} />}
          color="bg-white"
          subtext="↑ 5% vs periodo anterior"
          highlight
        />
        <MetricCard
          label="Ventas Estimadas"
          value="12.5k€"
          icon={<Coins className="text-amber-600" size={24} />}
          color="bg-white"
          subtext="↓ 2% vs periodo anterior"
          highlight={false}
          trendDown
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
                <tr className="group">
                  <td className="py-4">
                    <div className="font-medium text-gray-900">Sincronizando...</div>
                    <div className="text-xs text-gray-500 italic">Cargando datos en tiempo real</div>
                  </td>
                  <td className="py-4 text-sm text-gray-600">--:--</td>
                  <td className="py-4 text-sm text-gray-600">--</td>
                  <td className="py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase rounded-full">Espera</span>
                  </td>
                </tr>
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
