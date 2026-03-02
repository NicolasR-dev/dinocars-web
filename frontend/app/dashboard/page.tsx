'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Calculator, DollarSign, History, Users, ChevronRight, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import CalcularVueltas from '@/components/CalcularVueltas';
import CuadrarCaja from '@/components/CuadrarCaja';
import RecordDetailModal from '@/components/RecordDetailModal';
import UserManagement from '@/components/UserManagement';
import api from '@/lib/api';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${n.toLocaleString('es-CL')}`;
}

function statusStyle(status: string) {
  if (status === 'CUADRA') return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  if (status === 'EXCEDENTE') return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
  return 'bg-red-500/20 text-red-400 border border-red-500/30';
}

// ── nav tabs ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'vueltas', label: 'Vueltas', icon: Calculator },
  { id: 'caja', label: 'Caja', icon: DollarSign },
  { id: 'history', label: 'Historial', icon: History },
  { id: 'users', label: 'Usuarios', icon: Users },
];

// ── history record card (mobile) ──────────────────────────────────────────────

function RecordCard({ record, onClick }: { record: any; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="glass-card rounded-xl p-4 cursor-pointer hover:border-indigo-500/50 transition-all active:scale-[0.98]"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-bold text-white">{record.worker_name || 'N/A'}</p>
          <p className="text-xs text-slate-400">{record.date}</p>
        </div>
        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${statusStyle(record.status)}`}>
          {record.status}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-800/60 rounded-lg py-2">
          <p className="text-[10px] text-slate-400">Vueltas</p>
          <p className="font-bold text-white text-sm">{record.rides_today}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg py-2">
          <p className="text-[10px] text-slate-400">Total</p>
          <p className="font-bold text-emerald-400 text-sm">{fmt(record.daily_cash_generated ?? 0)}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg py-2">
          <p className="text-[10px] text-slate-400">Diferencia</p>
          <p className={`font-bold text-sm ${record.difference === 0 ? 'text-slate-400' : record.difference > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
            {record.difference > 0 ? '+' : ''}{record.difference}
          </p>
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <ChevronRight className="w-4 h-4 text-slate-500" />
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('vueltas');
  const [history, setHistory] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [calculatedRides, setCalculatedRides] = useState<number | undefined>(undefined);

  const handleCalculationComplete = (data: any) => {
    setCalculatedRides(data.rides_today);
    setActiveTab('caja');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    try {
      const decoded: any = jwtDecode(token);
      setUser({ ...decoded, username: decoded.sub });
      loadHistory(new Date().toISOString().slice(0, 7));
    } catch { router.push('/login'); }
  }, [router]);

  const loadHistory = async (month: string) => {
    try {
      const res = await api.get('/records/', { params: { month } });
      setHistory(res.data);
    } catch (e) { console.error(e); }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const month = e.target.value;
    setSelectedMonth(month);
    loadHistory(month);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const monthlyTotal = history.reduce((acc: number, curr: any) => acc + (curr.daily_cash_generated || 0), 0);

  if (!user) return null;

  const visibleTabs = user.role === 'admin' || user.role === 'manager'
    ? TABS
    : TABS.filter(t => t.id !== 'users');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">

      {/* ── Top header ── */}
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 relative flex-shrink-0">
            <Image src="/logo.png" alt="DinoCars" fill className="object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-none">DinoCars</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">{user.role} · {user.username}</p>
          </div>
        </div>

        {/* Desktop tab pills */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 rounded-xl p-1">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Cerrar sesión">
          <LogOut className="w-5 h-5 text-slate-400 hover:text-white" />
        </button>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-28 md:pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* ── Vueltas ── */}
            {activeTab === 'vueltas' && (
              <section className="glass-card p-5 sm:p-6 rounded-2xl max-w-3xl mx-auto">
                <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                  <Calculator className="text-indigo-400 w-5 h-5" />
                  Calculadora de Vueltas
                </h2>
                <CalcularVueltas onComplete={handleCalculationComplete} />
              </section>
            )}

            {/* ── Caja ── */}
            {activeTab === 'caja' && (
              <section className="glass-card p-5 sm:p-6 rounded-2xl max-w-3xl mx-auto">
                <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                  <DollarSign className="text-emerald-400 w-5 h-5" />
                  Cierre de Caja
                </h2>
                <CuadrarCaja initialRides={calculatedRides} currentUser={user} />
              </section>
            )}

            {/* ── Historial ── */}
            {activeTab === 'history' && (
              <section>
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <History className="text-cyan-400 w-5 h-5" />
                    Historial
                  </h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Monthly total badge */}
                    <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      <div>
                        <p className="text-[10px] text-emerald-400 uppercase font-bold leading-none">Total Mes</p>
                        <p className="text-base font-bold text-white leading-tight">{fmt(monthlyTotal)}</p>
                      </div>
                    </div>
                    {/* Month picker */}
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={handleMonthChange}
                      className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {history.length === 0 ? (
                  <div className="glass-card rounded-2xl p-12 text-center text-slate-500">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No hay registros para este mes.</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile: cards */}
                    <div className="flex flex-col gap-3 md:hidden">
                      {history.map((record: any) => (
                        <RecordCard
                          key={record.id}
                          record={record}
                          onClick={() => { setSelectedRecord(record); setIsModalOpen(true); }}
                        />
                      ))}
                    </div>

                    {/* Desktop: table */}
                    <div className="hidden md:block glass-card rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-slate-400 text-xs uppercase tracking-wide border-b border-slate-700 bg-slate-800/60">
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Trabajador</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3 text-center">Vueltas</th>
                            <th className="px-4 py-3 text-right">Total Día</th>
                            <th className="px-4 py-3 text-right">Diferencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((record: any) => (
                            <tr
                              key={record.id}
                              onClick={() => { setSelectedRecord(record); setIsModalOpen(true); }}
                              className="border-b border-slate-700/50 hover:bg-white/5 cursor-pointer transition-colors"
                            >
                              <td className="px-4 py-3 text-sm text-slate-300 font-mono">{record.date}</td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-white text-sm">{record.worker_name || 'N/A'}</p>
                                <p className="text-[11px] text-slate-500">por {record.submitted_by}</p>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${statusStyle(record.status)}`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-300">{record.rides_today}</td>
                              <td className="px-4 py-3 text-right font-medium text-white">{fmt(record.daily_cash_generated ?? 0)}</td>
                              <td className={`px-4 py-3 text-right font-medium ${record.difference === 0 ? 'text-slate-400' : record.difference > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {record.difference > 0 ? '+' : ''}{record.difference}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            )}

            {/* ── Usuarios ── */}
            {activeTab === 'users' && (
              <section className="glass-card p-5 sm:p-6 rounded-2xl">
                <UserManagement currentUser={user} />
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/60 safe-bottom">
        <div className="flex">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all ${active ? 'text-indigo-400' : 'text-slate-500'}`}
              >
                <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-medium">{tab.label}</span>
                {active && <div className="absolute bottom-0 w-8 h-0.5 bg-indigo-400 rounded-t-full" />}
              </button>
            );
          })}
        </div>
      </nav>

      <RecordDetailModal
        record={selectedRecord}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpdate={() => loadHistory(selectedMonth)}
        userRole={user.role}
      />
    </div>
  );
}
