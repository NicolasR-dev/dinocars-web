'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { DollarSign, Activity, TrendingUp, Calendar } from 'lucide-react';

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
}

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
