'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Plus, Trash2, Calendar, Clock, Save, X, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
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

export default function UserManagement({ currentUser }: { currentUser: any }) {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // User Modal State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [userForm, setUserForm] = useState({
        username: '',
        password: '',
        role: 'worker',
        default_start_time: '',
        default_end_time: '',
        opening_start_time: '',
        opening_end_time: '',
        closing_start_time: '',
        closing_end_time: ''
    });

    // Schedule State
    const [schedules, setSchedules] = useState<any[]>([]);
    const [selectedUserForSchedule, setSelectedUserForSchedule] = useState<any>(null);
    const [newSchedule, setNewSchedule] = useState({ date: '', start_time: '09:00', end_time: '18:00' });
    const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');

    // Date Navigation
    const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));

    function getMonday(d: Date) {
        d = new Date(d);
        var day = d.getDay(),
            diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
        return new Date(d.setDate(diff));
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

    // --- User Management ---

    const openCreateUser = () => {
        setEditingUser(null);
        setUserForm({
            username: '',
            password: '',
            role: 'worker',
            default_start_time: '',
            default_end_time: '',
            opening_start_time: '',
            opening_end_time: '',
            closing_start_time: '',
            closing_end_time: ''
        });
        setIsUserModalOpen(true);
    };

    const openEditUser = (user: any) => {
        setEditingUser(user);
        setUserForm({
            username: user.username,
            password: '',
            role: user.role,
            default_start_time: user.default_start_time || '',
            default_end_time: user.default_end_time || '',
            opening_start_time: user.opening_start_time || '',
            opening_end_time: user.opening_end_time || '',
            closing_start_time: user.closing_start_time || '',
            closing_end_time: user.closing_end_time || ''
        });
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async () => {
        setLoading(true);
        try {
            const payload: any = {
                username: userForm.username,
                role: userForm.role,
                default_start_time: userForm.default_start_time || null,
                default_end_time: userForm.default_end_time || null,
                opening_start_time: userForm.opening_start_time || null,
                opening_end_time: userForm.opening_end_time || null,
                closing_start_time: userForm.closing_start_time || null,
                closing_end_time: userForm.closing_end_time || null
            };

            if (editingUser) {
                // Update
                if (userForm.password) payload.password = userForm.password;
                await api.put(`/users/${editingUser.id}`, payload);
            } else {
                // Create
                payload.password = userForm.password;
                await api.post('/users/', payload);
            }
            setIsUserModalOpen(false);
            loadUsers();
        } catch (e) {
            alert('Error al guardar usuario');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('¿Eliminar usuario?')) return;
        try {
            await api.delete(`/users/${id}`);
            loadUsers();
        } catch (e) {
            alert('Error al eliminar');
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

    const getUserTotalHours = (userSchedules: any[]) => {
        // Filter schedules for the current week
        const weekStart = new Date(currentWeekStart);
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // Normalize to YYYY-MM-DD strings for comparison
        const startStr = weekStart.toISOString().split('T')[0];
        const endStr = weekEnd.toISOString().split('T')[0];

        const weeklySchedules = userSchedules.filter((s: any) => {
            // s.date is already YYYY-MM-DD
            return s.date >= startStr && s.date <= endStr;
        });

        return weeklySchedules.reduce((acc: number, curr: any) => acc + calculateHours(curr.start_time, curr.end_time), 0);
    };

    const changeWeek = (offset: number) => {
        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() + (offset * 7));
        setCurrentWeekStart(newStart);
    };

    // Generate dates for the current week
    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + i);
        return d;
    });

    return (
        <div className="space-y-8">
            {/* Header & Actions */}
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <User className="text-indigo-400" />
                    Gestión de Usuarios y Horarios
                </h3>
                {currentUser.role === 'admin' && (
                    <div className="flex gap-2">

                        <button
                            onClick={openCreateUser}
                            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Usuario
                        </button>
                    </div>
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
                                        const dateStr = date.toISOString().split('T')[0];
                                        const userSchedule = schedules.find(s => s.user.id === user.id && s.date === dateStr);

                                        return (
                                            <div
                                                key={`${user.id}-${dateStr}`}
                                                className={`h-12 rounded-lg border transition-all relative group ${userSchedule
                                                    ? `${user.color} border-white/10`
                                                    : 'bg-slate-800/20 border-slate-700/30 hover:bg-slate-800/50 cursor-pointer'}`}
                                                onClick={() => {
                                                    if (!userSchedule && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
                                                        console.log('Selected User:', user); // DEBUG
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
                                                    <div className="h-full flex flex-col items-center justify-center p-1">
                                                        <span className="text-xs font-bold text-white">{userSchedule.start_time}</span>
                                                        <span className="text-xs font-bold text-white/80">{userSchedule.end_time}</span>
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

            {/* User List (Admin Only for Editing Users) */}
            {currentUser.role === 'admin' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map((user: any) => (
                        <div key={user.id} className="glass p-4 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-colors relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${user.color}`}></div>
                            <div className="flex justify-between items-center pl-3">
                                <div>
                                    <h4 className="font-bold text-white">{user.username}</h4>
                                    <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                        user.role === 'manager' ? 'bg-cyan-500/20 text-cyan-400' :
                                            'bg-slate-500/20 text-slate-400'
                                        }`}>
                                        {user.role}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEditUser(user)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* User Create/Edit Modal */}
            <AnimatePresence>
                {isUserModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl"
                        >
                            <h3 className="text-xl font-bold text-white mb-6">
                                {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400">Nombre de Usuario</label>
                                    <input
                                        type="text"
                                        value={userForm.username}
                                        onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                                        className="input-premium w-full text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400">
                                        {editingUser ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                                    </label>
                                    <input
                                        type="password"
                                        value={userForm.password}
                                        onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                        className="input-premium w-full text-white"
                                        placeholder={editingUser ? "Dejar en blanco para mantener" : ""}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-slate-400">Rol</label>
                                    <select
                                        value={userForm.role}
                                        onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                                        className="input-premium w-full text-white"
                                    >
                                        <option value="worker">Trabajador</option>
                                        <option value="manager">Encargado</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>

                                {/* Default Schedule Inputs */}
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                                    <div className="col-span-2">
                                        <label className="text-sm font-bold text-slate-300">Horario Predeterminado</label>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400">Inicio</label>
                                        <input
                                            type="time"
                                            value={userForm.default_start_time}
                                            onChange={e => setUserForm({ ...userForm, default_start_time: e.target.value })}
                                            className="input-premium w-full text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400">Fin</label>
                                        <input
                                            type="time"
                                            value={userForm.default_end_time}
                                            onChange={e => setUserForm({ ...userForm, default_end_time: e.target.value })}
                                            className="input-premium w-full text-white"
                                        />
                                    </div>
                                </div>

                                {/* Opening Schedule Inputs */}
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                                    <div className="col-span-2">
                                        <label className="text-sm font-bold text-slate-300">Turno Apertura (Predeterminado)</label>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400">Inicio</label>
                                        <input
                                            type="time"
                                            value={userForm.opening_start_time}
                                            onChange={e => setUserForm({ ...userForm, opening_start_time: e.target.value })}
                                            className="input-premium w-full text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400">Fin</label>
                                        <input
                                            type="time"
                                            value={userForm.opening_end_time}
                                            onChange={e => setUserForm({ ...userForm, opening_end_time: e.target.value })}
                                            className="input-premium w-full text-white"
                                        />
                                    </div>
                                </div>

                                {/* Closing Schedule Inputs */}
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                                    <div className="col-span-2">
                                        <label className="text-sm font-bold text-slate-300">Turno Cierre (Predeterminado)</label>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400">Inicio</label>
                                        <input
                                            type="time"
                                            value={userForm.closing_start_time}
                                            onChange={e => setUserForm({ ...userForm, closing_start_time: e.target.value })}
                                            className="input-premium w-full text-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs text-slate-400">Fin</label>
                                        <input
                                            type="time"
                                            value={userForm.closing_end_time}
                                            onChange={e => setUserForm({ ...userForm, closing_end_time: e.target.value })}
                                            className="input-premium w-full text-white"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
                                    <button onClick={handleSaveUser} disabled={loading} className="btn-primary px-6 py-2">Guardar</button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
        </div>
    );
}
