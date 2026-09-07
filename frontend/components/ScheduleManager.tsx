'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, Clock, X, ChevronLeft, ChevronRight, Wand2 } from 'lucide-react';
import api from '@/lib/api';
import MonthlyScheduleView from './MonthlyScheduleView';

const DAYS_ES = {
    'Monday': 'Lunes',
    'Tuesday': 'Martes',
    'Wednesday': 'Miércoles',
    'Thursday': 'Jueves',
    'Friday': 'Viernes',
    'Saturday': 'Sábado',
    'Sunday': 'Domingo'
};

const USER_COLORS = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
];

export default function ScheduleManager({ currentUser }: { currentUser: any }) {
    const [users, setUsers] = useState<any[]>([]);

    // Schedule State
    const [schedules, setSchedules] = useState<any[]>([]);
    const [selectedUserForSchedule, setSelectedUserForSchedule] = useState<any>(null);
    const [newSchedule, setNewSchedule] = useState({ date: '', start_time: '09:00', end_time: '18:00' });
    const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');

    // Bulk Schedule State
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkForm, setBulkForm] = useState({
        user_id: '',
        start_date: '',
        end_date: '',
        days_of_week: [0, 1, 2, 3, 4], // Mon-Fri default
        start_time: '10:00',
        end_time: '18:00',
        weekend_pattern: ''
    });
    const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));

    function getMonday(d: Date) {
        d = new Date(d);
        var day = d.getDay(),
            diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    // Format a Date to YYYY-MM-DD using LOCAL time (avoids UTC offset shifting the day)
    function toLocalDateStr(d: Date): string {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const res = await api.get('/users/');
            // Assign colors to users
            const usersWithColors = res.data.map((u: any, index: number) => ({
                ...u,
                color: USER_COLORS[index % USER_COLORS.length]
            }));
            setUsers(usersWithColors);

            // Flatten schedules for global view
            const allSchedules = usersWithColors.flatMap((u: any) =>
                u.schedules.map((s: any) => ({ ...s, user: u }))
            );
            setSchedules(allSchedules);
        } catch (e) {
            console.error(e);
        }
    };

    // --- Schedule Management ---

    const handleAddSchedule = async () => {
        if (!selectedUserForSchedule) return;
        try {
            await api.post(`/users/${selectedUserForSchedule.id}/schedules/`, newSchedule);
            loadUsers(); // Reload to update global schedule
            setSelectedUserForSchedule(null); // Close modal
        } catch (e) {
            alert('Error al agregar horario');
        }
    };

    const handleDeleteSchedule = async (id: number) => {
        if (!confirm('¿Eliminar este turno?')) return;
        try {
            await api.delete(`/schedules/${id}`);
            loadUsers();
        } catch (e) {
            alert('Error al eliminar horario');
        }
    };

    // Helper to calculate hours
    const calculateHours = (start: string, end: string) => {
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        const startDate = new Date(0, 0, 0, startH, startM);
        const endDate = new Date(0, 0, 0, endH, endM);
        let diff = (endDate.getTime() - startDate.getTime()) / 1000 / 60 / 60;
        if (diff < 0) diff += 24;
        return diff;
    };

    const getShiftBadge = (start: string, end: string) => {
        if (start === "10:00" && end === "20:00") return { label: "T", color: "bg-purple-500", full: "Total" };
        if (start === "10:00" && end === "17:30") return { label: "A", color: "bg-emerald-500", full: "Apertura" };
        if (start === "12:30" && end === "20:00") return { label: "C", color: "bg-orange-500", full: "Cierre" };
        return null;
    };

    const getUserTotalHours = (userSchedules: any[]) => {
        // Filter schedules for the current week using LOCAL date strings
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const startStr = toLocalDateStr(currentWeekStart);
        const endStr = toLocalDateStr(weekEnd);

        const weeklySchedules = userSchedules.filter((s: any) => {
            return s.date >= startStr && s.date <= endStr;
        });

        return weeklySchedules.reduce((acc: number, curr: any) => acc + calculateHours(curr.start_time, curr.end_time), 0);
    };

    const changeWeek = (offset: number) => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() + (offset * 7));
        newStart.setHours(0, 0, 0, 0);
        setCurrentWeekStart(newStart);
    };

    // Generate dates for the current week (each date at local midnight)
    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + i);
        d.setHours(0, 0, 0, 0);
        return d;
    });

    return (
        <div className="space-y-8">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Calendar className="text-indigo-400" />
                    Gestión de Horarios
                </h3>
                {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="btn-glass flex items-center justify-center gap-2 px-4 py-2 text-sm text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                    >
                        <Wand2 className="w-4 h-4" />
                        Autoprogramar
                    </button>
                )}
            </div>

            {/* Global Visual Schedule */}
            <div className="glass p-6 rounded-xl border border-slate-700 overflow-x-auto">
                <div className="flex justify-between items-center mb-4 min-w-[800px]">
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calendar className="text-cyan-400" />
                        Horario Global
                    </h4>
                    <div className="flex items-center gap-4">
                        {viewMode === 'weekly' && (
                            <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                                <button onClick={() => changeWeek(-1)} className="p-1 hover:bg-white/10 rounded transition-colors">
                                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                                </button>
                                <span className="text-xs font-bold text-slate-300 px-2">
                                    {currentWeekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} -
                                    {new Date(new Date(currentWeekStart).setDate(currentWeekStart.getDate() + 6)).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </span>
                                <button onClick={() => changeWeek(1)} className="p-1 hover:bg-white/10 rounded transition-colors">
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                        )}
                        <div className="flex bg-slate-800 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('weekly')}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'weekly' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                Semanal
                            </button>
                            <button
                                onClick={() => setViewMode('monthly')}
                                className={`px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                Mensual
                            </button>
                        </div>
                    </div>
                </div>

                {viewMode === 'weekly' ? (
                    <div className="min-w-[800px]">
                        {/* Grid Header */}
                        <div className="grid grid-cols-8 gap-1 mb-2">
                            <div className="p-2 text-xs font-bold text-slate-500 uppercase">Usuario</div>
                            {weekDates.map(date => {
                                const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                                const isToday = date.toDateString() === new Date().toDateString();
                                return (
                                    <div key={date.toISOString()} className={`text-center py-2 rounded-lg border ${isToday ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700'}`}>
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">{(DAYS_ES as any)[dayName].substring(0, 3)}</span>
                                        <span className="text-sm font-bold text-white">{date.getDate()}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Grid Rows */}
                        <div className="space-y-1">
                            {users.filter(user => user.role !== 'admin').map(user => (
                                <div key={user.id} className="grid grid-cols-8 gap-1 items-center">
                                    {/* User Info */}
                                    <div className="p-2 bg-slate-800/30 rounded-lg border border-slate-700/50 h-full flex flex-col justify-center">
                                        <span className="font-bold text-sm text-white truncate">{user.username}</span>
                                        <span className="text-[10px] text-slate-400">{getUserTotalHours(user.schedules || []).toFixed(1)}h</span>
                                    </div>

                                    {/* Days */}
                                    {weekDates.map(date => {
                                        const dateStr = toLocalDateStr(date);
                                        const userSchedule = schedules.find(s => s.user.id === user.id && s.date === dateStr);

                                        return (
                                            <div
                                                key={`${user.id}-${dateStr}`}
                                                className={`h-12 rounded-lg border transition-all relative group ${userSchedule
                                                    ? `${user.color} border-white/10 shadow-lg`
                                                    : 'bg-slate-800/20 border-slate-700/30 hover:bg-slate-800/50 cursor-pointer'}`}
                                                onClick={() => {
                                                    if (!userSchedule && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
                                                        setSelectedUserForSchedule(user);
                                                        setNewSchedule({
                                                            date: dateStr,
                                                            start_time: user.default_start_time || '09:00',
                                                            end_time: user.default_end_time || '18:00'
                                                        });
                                                    }
                                                }}
                                            >
                                                {userSchedule ? (
                                                    <div className="h-full flex flex-col items-center justify-center p-1 relative">
                                                        {(() => {
                                                            const badge = getShiftBadge(userSchedule.start_time, userSchedule.end_time);
                                                            if (badge) {
                                                                return (
                                                                    <div className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full ${badge.color} text-[10px] font-bold text-white flex items-center justify-center shadow-lg border border-white/20`} title={badge.full}>
                                                                        {badge.label}
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                        <span className="text-xs font-bold text-white leading-none">{userSchedule.start_time}</span>
                                                        <span className="text-xs font-bold text-white/70 leading-none">{userSchedule.end_time}</span>
                                                        {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteSchedule(userSchedule.id);
                                                                }}
                                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    (currentUser.role === 'admin' || currentUser.role === 'manager') && (
                                                        <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Plus className="w-4 h-4 text-slate-500" />
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <MonthlyScheduleView schedules={schedules} />
                )}
            </div>

            {/* Add Schedule Modal */}
            <AnimatePresence>
                {selectedUserForSchedule && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Clock className="text-cyan-400" />
                                Asignar Turno a {selectedUserForSchedule.username}
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400">Fecha</label>
                                    <input
                                        type="date"
                                        value={newSchedule.date}
                                        onChange={e => setNewSchedule({ ...newSchedule, date: e.target.value })}
                                        className="input-premium w-full text-white"
                                        disabled // Date is pre-selected from grid
                                    />
                                </div>

                                {/* Quick Shifts */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setNewSchedule({
                                            ...newSchedule,
                                            start_time: selectedUserForSchedule.opening_start_time || '10:00',
                                            end_time: selectedUserForSchedule.opening_end_time || '17:30'
                                        })}
                                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-slate-300 transition-colors"
                                    >
                                        Apertura ({selectedUserForSchedule.opening_start_time || '10:00'} - {selectedUserForSchedule.opening_end_time || '17:30'})
                                    </button>
                                    <button
                                        onClick={() => setNewSchedule({
                                            ...newSchedule,
                                            start_time: selectedUserForSchedule.closing_start_time || '12:30',
                                            end_time: selectedUserForSchedule.closing_end_time || '20:00'
                                        })}
                                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-slate-300 transition-colors"
                                    >
                                        Cierre ({selectedUserForSchedule.closing_start_time || '12:30'} - {selectedUserForSchedule.closing_end_time || '20:00'})
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm text-slate-400">Inicio</label>
                                        <input
                                            type="time"
                                            value={newSchedule.start_time}
                                            onChange={e => setNewSchedule({ ...newSchedule, start_time: e.target.value })}
                                            className="input-premium w-full text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-slate-400">Fin</label>
                                        <input
                                            type="time"
                                            value={newSchedule.end_time}
                                            onChange={e => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                                            className="input-premium w-full text-white"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6">
                                    <button onClick={() => setSelectedUserForSchedule(null)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
                                    <button onClick={handleAddSchedule} className="btn-primary px-6 py-2">Agregar Turno</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bulk Schedule Modal */}
            <AnimatePresence>
                {isBulkModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Wand2 className="text-purple-400" />
                                Autoprogramación Mágica
                            </h3>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400">Usuario</label>
                                    <select
                                        value={bulkForm.user_id}
                                        onChange={e => setBulkForm({ ...bulkForm, user_id: e.target.value })}
                                        className="input-premium w-full text-white"
                                    >
                                        <option value="">Seleccionar Trabajador...</option>
                                        {users.filter(u => u.role !== 'admin').map(u => (
                                            <option key={u.id} value={u.id}>{u.username}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm text-slate-400">Desde</label>
                                        <input
                                            type="date"
                                            value={bulkForm.start_date}
                                            onChange={e => setBulkForm({ ...bulkForm, start_date: e.target.value })}
                                            className="input-premium w-full text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-slate-400">Hasta</label>
                                        <input
                                            type="date"
                                            value={bulkForm.end_date}
                                            onChange={e => setBulkForm({ ...bulkForm, end_date: e.target.value })}
                                            className="input-premium w-full text-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400">Días de la semana</label>
                                    <div className="flex gap-1 justify-between bg-slate-800 p-2 rounded-lg">
                                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    const newDays = bulkForm.days_of_week.includes(idx)
                                                        ? bulkForm.days_of_week.filter(d => d !== idx)
                                                        : [...bulkForm.days_of_week, idx];
                                                    setBulkForm({ ...bulkForm, days_of_week: newDays });
                                                }}
                                                className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${bulkForm.days_of_week.includes(idx)
                                                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                                                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400">Patrón de Fin de Semana (Opcional)</label>
                                    <select
                                        value={bulkForm.weekend_pattern}
                                        onChange={e => setBulkForm({ ...bulkForm, weekend_pattern: e.target.value })}
                                        className="input-premium w-full text-white"
                                    >
                                        <option value="">Ninguno (Usar hora fija)</option>
                                        <option value="ACA">ACA (Vie A - Sáb C - Dom A)</option>
                                        <option value="CAC">CAC (Vie C - Sáb A - Dom C)</option>
                                        <option value="ACA_ROTATING">Rotativo (Semana 1: ACA, Semana 2: CAC...)</option>
                                        <option value="CAC_ROTATING">Rotativo (Semana 1: CAC, Semana 2: ACA...)</option>
                                    </select>
                                    <p className="text-[10px] text-slate-500">
                                        * Si seleccionas un patrón, las horas de Viernes, Sábado y Domingo se ajustarán automáticamente.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm text-slate-400">Inicio</label>
                                        <input
                                            type="time"
                                            value={bulkForm.start_time}
                                            onChange={e => setBulkForm({ ...bulkForm, start_time: e.target.value })}
                                            className="input-premium w-full text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-slate-400">Fin</label>
                                        <input
                                            type="time"
                                            value={bulkForm.end_time}
                                            onChange={e => setBulkForm({ ...bulkForm, end_time: e.target.value })}
                                            className="input-premium w-full text-white"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
                                    <button
                                        onClick={async () => {
                                            if (!bulkForm.user_id || !bulkForm.start_date || !bulkForm.end_date) {
                                                alert("Faltan datos requeridos");
                                                return;
                                            }
                                            try {
                                                await api.post('/schedules/bulk', bulkForm);
                                                alert('Horarios generados con éxito');
                                                setIsBulkModalOpen(false);
                                                loadUsers();
                                            } catch (e) {
                                                console.error(e);
                                                alert('Error al generar horarios');
                                            }
                                        }}
                                        className="btn-primary px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 border-none"
                                    >
                                        Generar Horarios
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
