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
        opening_start_time: '',
        opening_end_time: '',
        closing_start_time: '',
        closing_end_time: ''
    });

    // ... (Schedule State remains same)

    // ... (Date Navigation remains same)

    // ... (loadUsers remains same)

    // --- User Management ---

    const openCreateUser = () => {
        setEditingUser(null);
        setUserForm({
            username: '',
            password: '',
            role: 'worker',
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

    // ... (handleDeleteUser remains same)

    // ... (Schedule Management remains same)

    // ... (calculateHours remains same)

    // ... (getUserTotalHours remains same)

    // ... (changeWeek remains same)

    // ... (weekDates remains same)

    return (
        <div className="space-y-8">
            {/* ... (Header & Actions remains same) */}

            {/* ... (Global Visual Schedule remains same) */}

            {/* ... (User List remains same) */}

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
                                {/* ... (Username, Password, Role inputs remain same) */}
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
