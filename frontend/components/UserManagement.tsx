'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Plus, Trash2, Calendar, Clock, Save, X, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';

const DAYS_ES = {
    'Monday': 'Lunes',
    'Tuesday': 'Martes',
    'Wednesday': 'Miércoles',
    'Thursday': 'Jueves',
    'Friday': 'Viernes',
    'Saturday': 'Sábado',
    'Sunday': 'Domingo'
};

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const USER_COLORS = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'
];

export default function UserManagement({ currentUser }: { currentUser: any }) {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // User Modal State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [userForm, setUserForm] = useState({ username: '', password: '', role: 'worker' });

    // Schedule State
    const [schedules, setSchedules] = useState<any[]>([]);
    const [selectedUserForSchedule, setSelectedUserForSchedule] = useState<any>(null);
    const [newSchedule, setNewSchedule] = useState({ day_of_week: 'Monday', start_time: '09:00', end_time: '18:00' });

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
        setUserForm({ username: '', password: '', role: 'worker' });
        setIsUserModalOpen(true);
    };

    const openEditUser = (user: any) => {
        setEditingUser(user);
        setUserForm({ username: user.username, password: '', role: user.role });
        setIsUserModalOpen(true);
    };

    const handleSaveUser = async () => {
        setLoading(true);
        try {
            if (editingUser) {
                // Update
                const payload: any = { username: userForm.username, role: userForm.role };
                if (userForm.password) payload.password = userForm.password;
                await api.put(`/users/${editingUser.id}`, payload);
            } else {
                // Create
                await api.post('/users/', userForm);
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

    return (
        <div className="space-y-8">
            {/* Header & Actions */}
            <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <User className="text-indigo-400" />
                    Gestión de Usuarios y Horarios
                </h3>
                {currentUser.role === 'admin' && (
                    <button
                        onClick={openCreateUser}
                        className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Usuario
                    </button>
                )}
            </div>

            {/* Global Visual Schedule */}
            <div className="glass p-6 rounded-xl border border-slate-700">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Calendar className="text-cyan-400" />
                    Horario Semanal Global
                </h4>

                <div className="grid grid-cols-7 gap-2">
                    {DAYS_ORDER.map(day => (
                        <div key={day} className="space-y-2">
                            <div className="text-center py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                                <span className="text-sm font-bold text-slate-300">{(DAYS_ES as any)[day]}</span>
                            </div>
                            <div className="space-y-2 min-h-[100px]">
                                {schedules.filter(s => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time)).map(schedule => (
                                    <div
                                        key={schedule.id}
                                        className={`p-2 rounded-lg text-xs border border-white/10 shadow-sm ${schedule.user.color} text-white relative group`}
                                    >
                                        <div className="font-bold truncate">{schedule.user.username}</div>
                                        <div className="font-mono opacity-90">{schedule.start_time} - {schedule.end_time}</div>

                                        {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                                            <button
                                                onClick={() => handleDeleteSchedule(schedule.id)}
                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/20 hover:bg-black/40 rounded p-0.5 transition-all"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* User List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user: any) => (
                    <div key={user.id} className="glass p-4 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-colors relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${user.color}`}></div>
                        <div className="flex justify-between items-start mb-4 pl-3">
                            <div>
                                <h4 className="font-bold text-white text-lg">{user.username}</h4>
                                <span className={`text-xs px-2 py-1 rounded-full uppercase font-bold ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                        user.role === 'manager' ? 'bg-cyan-500/20 text-cyan-400' :
                                            'bg-slate-500/20 text-slate-400'
                                    }`}>
                                    {user.role === 'worker' ? 'Trabajador' : (user.role === 'manager' ? 'Encargado' : 'Admin')}
                                </span>
                            </div>
                            {currentUser.role === 'admin' && (
                                <div className="flex gap-1">
                                    <button onClick={() => openEditUser(user)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                            <button
                                onClick={() => setSelectedUserForSchedule(user)}
                                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm flex items-center justify-center gap-2 transition-colors ml-2 w-[calc(100%-0.5rem)]"
                            >
                                <Plus className="w-4 h-4" />
                                Asignar Turno
                            </button>
                        )}
                    </div>
                ))}
            </div>

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
                                    <label className="text-sm text-slate-400">Día</label>
                                    <select
                                        value={newSchedule.day_of_week}
                                        onChange={e => setNewSchedule({ ...newSchedule, day_of_week: e.target.value })}
                                        className="input-premium w-full text-white"
                                    >
                                        {DAYS_ORDER.map(day => (
                                            <option key={day} value={day}>{(DAYS_ES as any)[day]}</option>
                                        ))}
                                    </select>
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
