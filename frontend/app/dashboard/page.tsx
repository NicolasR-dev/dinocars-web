'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { motion } from 'framer-motion';
import { LogOut, LayoutDashboard, Calculator, DollarSign, History, Calendar, Users } from 'lucide-react';
import Image from 'next/image';
import CalcularVueltas from '@/components/CalcularVueltas';
import CuadrarCaja from '@/components/CuadrarCaja';
import RecordDetailModal from '@/components/RecordDetailModal';
import UserManagement from '@/components/UserManagement';
import api from '@/lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('vueltas');
  const [history, setHistory] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [calculatedRides, setCalculatedRides] = useState<number | undefined>(undefined);

  const handleCalculationComplete = (data: any) => {
    setCalculatedRides(data.rides_today);
    setActiveTab('caja');
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const decoded: any = jwtDecode(token);
      setUser({ ...decoded, username: decoded.sub });
      // Load history for everyone, but filtered by month initially
      loadHistory(new Date().toISOString().slice(0, 7));
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  const loadHistory = async (month: string) => {
    try {
      const res = await api.get('/records/', { params: { month } });
      setHistory(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const month = e.target.value;
    setSelectedMonth(month);
    loadHistory(month);
  };

  const handleRecordClick = (record: any) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const monthlyTotal = history.reduce((acc: number, curr: any) => acc + (curr.daily_cash_generated || 0), 0);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-20">
      {/* Header */}
      <header className="glass sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 relative">
            <Image src="/logo.png" alt="DinoCars Logo" fill className="object-contain" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">DinoCars</h1>
            <p className="text-xs text-slate-400 uppercase tracking-wider">{user.role}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <LogOut className="w-5 h-5 text-slate-400 hover:text-white" />
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6 mt-6">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('vueltas')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'vueltas'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'glass text-slate-400 hover:text-white'
              }`}
          >
            <Calculator className="w-5 h-5" />
            Calcular Vueltas
          </button>
          <button
            onClick={() => setActiveTab('caja')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'caja'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'glass text-slate-400 hover:text-white'
              }`}
          >
            <DollarSign className="w-5 h-5" />
            Cuadrar Caja
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'glass text-slate-400 hover:text-white'
              }`}
          >
            <History className="w-5 h-5" />
            Historial
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all whitespace-nowrap ${activeTab === 'users'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
              : 'glass text-slate-400 hover:text-white'
              }`}
          >
            <Users className="w-5 h-5" />
            Usuarios
          </button>
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-6 rounded-2xl min-h-[400px]"
        >
          {activeTab === 'vueltas' && (
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Calculator className="text-indigo-400" />
                Calculadora de Vueltas
              </h2>
              <CalcularVueltas onComplete={handleCalculationComplete} />
            </div>
          )}

          {activeTab === 'caja' && (
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <DollarSign className="text-emerald-400" />
                Cierre de Caja
              </h2>
              <CuadrarCaja initialRides={calculatedRides} currentUser={user} />
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <History className="text-cyan-400" />
                  Historial Mensual
                </h2>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 flex-1 md:flex-none">
                    <p className="text-xs text-emerald-400 uppercase font-bold">Total Mes</p>
                    <p className="text-lg font-bold text-white">${monthlyTotal.toLocaleString()}</p>
                  </div>
                  <div className="relative flex-1 md:flex-none">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={handleMonthChange}
                      className="bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 w-full"
                    />
                  </div>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p>No hay registros para este mes.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Trabajador</th>
                        <th className="p-3">Estado</th>
                        <th className="p-3 text-center">Vueltas</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-right">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((record: any) => (
                        <tr
                          key={record.id}
                          onClick={() => handleRecordClick(record)}
                          className="border-b border-slate-700/50 hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <td className="p-3">{record.date}</td>
                          <td className="p-3">
                            <div className="flex flex-col">
                              <span className="font-medium text-white">{record.worker_name || 'N/A'}</span>
                              <span className="text-xs text-slate-500">por {record.submitted_by}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${record.status === 'CUADRA' ? 'bg-emerald-500/20 text-emerald-400' : (record.status === 'EXCEDENTE' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400')
                              }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-300">
                            {record.rides_today}
                          </td>
                          <td className="p-3 text-right">${record.daily_cash_generated?.toLocaleString()}</td>
                          <td className={`p-3 text-right ${record.difference === 0 ? 'text-slate-400' : (record.difference > 0 ? 'text-yellow-400' : 'text-red-400')}`}>
                            {record.difference}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <UserManagement currentUser={user} />
          )}
        </motion.div>
      </main>

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
