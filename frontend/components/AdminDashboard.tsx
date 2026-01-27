'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';
import { DollarSign, Activity, TrendingUp, Calendar, Trophy } from 'lucide-react';

interface DailyStats {
    date: string;
    total_income: number;
    total_rides: number;
}

interface DashboardStats {
    total_revenue: number;
    total_rides: number;
    records_count: number;
    average_daily_income: number;
    daily_stats: DailyStats[];
    sales_by_weekday: { day: string, amount: number }[];
    top_workers: { name: string, total_rides: number, total_generated: number }[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'];

export default function AdminDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/admin/dashboard-stats');
            setStats(res.data);
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center text-slate-400 py-10">Cargando estadísticas...</div>;
    }

    if (!stats) {
        return <div className="text-center text-red-400 py-10">Error al cargar datos.</div>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Ingresos Totales"
                    value={`$${stats.total_revenue.toLocaleString('es-CL')}`}
                    icon={<DollarSign className="text-emerald-400" />}
                    subtext="Ingresos históricos acumulados"
                />
                <StatCard
                    title="Total Vueltas"
                    value={stats.total_rides.toLocaleString()}
                    icon={<Activity className="text-blue-400" />}
                    subtext="Tickets vendidos históricamente"
                />
                <StatCard
                    title="Promedio Diario"
                    value={`$${Math.round(stats.average_daily_income).toLocaleString('es-CL')}`}
                    icon={<TrendingUp className="text-amber-400" />}
                    subtext="Ingreso promedio por día"
                />
                <StatCard
                    title="Días Registrados"
                    value={stats.records_count.toString()}
                    icon={<Calendar className="text-purple-400" />}
                    subtext="Total de cierres de caja"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Income Chart */}
                <div className="card-glass p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Tendencia de Ingresos (Últimos 30 días)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.daily_stats}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickFormatter={(val) => `$${val / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    formatter={(value: any) => [`$${value.toLocaleString('es-CL')}`, 'Ingreso']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total_income"
                                    stroke="#10b981"
                                    fillOpacity={1}
                                    fill="url(#colorIncome)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Rides Chart */}
                <div className="card-glass p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Vueltas Diarias (Últimos 30 días)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.daily_stats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                />
                                <YAxis stroke="#94a3b8" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="total_rides"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ fill: '#3b82f6', r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Advanced Stats Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
                {/* Sales by Weekday */}
                <div className="card-glass p-6">
                    <h3 className="text-xl font-bold text-white mb-6">Ventas por Día de la Semana</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.sales_by_weekday}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis
                                    dataKey="day"
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickFormatter={(val) => {
                                        const map: any = { 'Monday': 'Lun', 'Tuesday': 'Mar', 'Wednesday': 'Mié', 'Thursday': 'Jue', 'Friday': 'Vie', 'Saturday': 'Sáb', 'Sunday': 'Dom' };
                                        return map[val] || val;
                                    }}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={12}
                                    tickFormatter={(val) => `$${val / 1000}k`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#334155', opacity: 0.2 }}
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                                    formatter={(value: any) => [`$${value.toLocaleString('es-CL')}`, 'Venta Total']}
                                />
                                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                    {stats.sales_by_weekday.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Worker Ranking */}
                <div className="card-glass p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white">Ranking de Trabajadores</h3>
                        <Trophy className="text-yellow-400" />
                    </div>

                    <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                        {stats.top_workers.length === 0 ? (
                            <div className="text-center text-slate-500 py-10">No hay datos suficientes</div>
                        ) : (
                            stats.top_workers.map((worker, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-500 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`
                                            w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                            ${idx === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                                                idx === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/50' :
                                                    idx === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/50' :
                                                        'bg-slate-800 text-slate-500'}
                                        `}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white">{worker.name}</p>
                                            <p className="text-xs text-slate-400">{worker.total_rides} vueltas vendidas</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-emerald-400">${worker.total_generated.toLocaleString('es-CL')}</p>
                                        <p className="text-xs text-slate-500">Generado</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, subtext }: { title: string, value: string, icon: any, subtext: string }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="card-glass p-6 space-y-4"
        >
            <div className="flex items-center justify-between">
                <p className="text-slate-400 font-medium">{title}</p>
                <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                    {icon}
                </div>
            </div>
            <div>
                <h2 className="text-3xl font-bold text-white">{value}</h2>
                <p className="text-xs text-slate-500 mt-1">{subtext}</p>
            </div>
        </motion.div>
    );
}
