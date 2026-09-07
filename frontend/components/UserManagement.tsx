'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Plus, Trash2, Edit, BarChart3 } from 'lucide-react';
import api from '@/lib/api';
import AdminDashboard from './AdminDashboard';

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

    const [activeTab, setActiveTab] = useState<'users' | 'dashboard'>('users');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const res = await api.get('/users/');
            setUsers(res.data);
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

    return (
        <div className="space-y-8">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <User className="text-indigo-400" />
                    Gestión de Usuarios
                </h3>
                {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
                    <button
                        onClick={openCreateUser}
                        className="btn-primary flex items-center justify-center gap-2 px-4 py-2 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Usuario
                    </button>
                )}
            </div>

            {/* Admin Tabs */}
            {currentUser.role === 'admin' && (
                <div className="flex gap-4 border-b border-slate-700 mb-6">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'users' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Usuarios
                        {activeTab === 'users' && (
                            <motion.div layoutId="tab-underline-users" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Dashboard & Estadísticas
                        </div>
                        {activeTab === 'dashboard' && (
                            <motion.div layoutId="tab-underline-users" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />
                        )}
                    </button>
                </div>
            )}

            {activeTab === 'dashboard' ? (
                <AdminDashboard />
            ) : (
                (currentUser.role === 'admin' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {users.map((user: any) => (
                            <div key={user.id} className="glass p-4 rounded-xl border border-slate-700 hover:border-indigo-500/50 transition-colors relative overflow-hidden">
                                <div className="flex justify-between items-center">
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
                ))
            )}

            {/* User Create/Edit Modal */}
            <AnimatePresence>
                {isUserModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
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
        </div>
    );
}
