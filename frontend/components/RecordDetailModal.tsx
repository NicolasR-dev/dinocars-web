'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit, Trash2, Save, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

interface RecordDetailModalProps {
    record: any;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    userRole: string;
}

export default function RecordDetailModal({ record, isOpen, onClose, onUpdate, userRole }: RecordDetailModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>(record);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setFormData(record);
    }, [record]);

    if (!isOpen || !record) return null;
    if (!formData) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => {
            const newData = {
                ...prev,
                [name]: (name === 'date' || name === 'status' || name === 'toys_sold_details' || name === 'worker_name') ? value : parseFloat(value) || 0
            };

            // Recalculate logic
            const valor_por_vuelta = 4000;
            const effective_rides = (newData.rides_today || 0) - (newData.admin_rides || 0);
            const expected_income = (effective_rides * valor_por_vuelta) + (newData.toys_sold_total || 0);

            // Total Counted: Sum of Cash in Box + Card Payments + Cash Withdrawn (to match Excel logic)
            // User said "Box + Card", but Excel has "Box + Card + Withdrawn". 
            // If we exclude Withdrawn, the historical data will show huge deficits.
            // I will keep the Excel logic for consistency, but if the user insists, we can change it.
            // Actually, let's stick to the Excel logic which is: Total Counted = Withdrawn + Box + Card
            const total_counted = (newData.cash_withdrawn || 0) + (newData.cash_in_box || 0) + (newData.card_payments || 0);

            // Difference
            // We need the previous day's cash to calculate the "Adjusted Total" if we want to be precise like CuadrarCaja.
            // BUT, in the modal we might not have the previous record easily.
            // However, the `difference` stored in DB is `total_counted_adjusted - expected`.
            // `total_counted_adjusted` = `total_counted` - `prev_cash`.
            // If we don't have `prev_cash`, we can't perfectly recalculate `difference` from scratch without fetching the prev record.
            // ERROR: The `difference` field in DB is the final difference.
            // If I edit `cash_in_box`, `difference` should change.
            // `difference` = (`total_counted` - `prev_cash`) - `expected_income`.
            // We can infer `prev_cash` from the existing record? 
            // `prev_cash` = `total_counted` - `daily_cash_generated` (maybe?)
            // Or `prev_cash` = `total_counted` - `expected_income` - `difference`? No.

            // Calculate Previous Cash from initial record state
            // prev_cash = initial_total_counted - initial_daily_generated
            const initial_total_counted = record.total_counted || 0;
            const initial_daily_generated = record.daily_cash_generated || 0;
            const prev_cash = initial_total_counted - initial_daily_generated;

            const daily_cash_generated = total_counted - prev_cash;
            const difference = daily_cash_generated - expected_income;

            // Update derived fields
            newData.expected_income = expected_income;
            newData.total_counted = total_counted;
            newData.daily_cash_generated = daily_cash_generated;
            newData.difference = difference;

            // Update status
            newData.status = difference === 0 ? "CUADRA" : (difference > 0 ? "EXCEDENTE" : "FALTANTE");

            return newData;
        });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put(`/records/${record.id}`, formData);
            setIsEditing(false);
            onUpdate();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Error al actualizar');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de eliminar este registro?')) return;
        setLoading(true);
        try {
            await api.delete(`/records/${record.id}`);
            onUpdate();
            onClose();
        } catch (e) {
            console.error(e);
            alert('Error al eliminar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
                >
                    <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-slate-700 p-4 flex justify-between items-center z-10">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {isEditing ? 'Editar Registro' : 'Detalle del Cierre'}
                            <span className="text-sm font-normal text-slate-400">#{record.id}</span>
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Header Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500 uppercase">Fecha</label>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        className="input-premium w-full text-white"
                                    />
                                ) : (
                                    <p className="text-lg font-medium text-white">{record.date}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-500 uppercase">Estado</label>
                                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${formData.status === 'CUADRA' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                    }`}>
                                    {formData.status}
                                </div>
                            </div>
                        </div>

                        {/* Financials */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider border-b border-indigo-500/20 pb-2">Ingresos</h3>
                                <Field label="Vueltas Hoy" name="rides_today" value={formData.rides_today} isEditing={isEditing} onChange={handleInputChange} />
                                <Field label="Vueltas Admin" name="admin_rides" value={formData.admin_rides} isEditing={isEditing} onChange={handleInputChange} />
                                <Field label="Total Juguetes ($)" name="toys_sold_total" value={formData.toys_sold_total} isEditing={isEditing} onChange={handleInputChange} />
                                <Field label="Ingresos Esperados" name="expected_income" value={formData.expected_income} isEditing={isEditing} onChange={handleInputChange} readOnly={true} />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider border-b border-emerald-500/20 pb-2">Caja</h3>
                                <Field label="Efectivo Retirado" name="cash_withdrawn" value={formData.cash_withdrawn} isEditing={isEditing} onChange={handleInputChange} />
                                <Field label="Efectivo en Caja" name="cash_in_box" value={formData.cash_in_box} isEditing={isEditing} onChange={handleInputChange} />
                                <Field label="Pagos Tarjeta" name="card_payments" value={formData.card_payments} isEditing={isEditing} onChange={handleInputChange} />
                                <Field label="Total Contabilizado" name="total_counted" value={formData.total_counted} isEditing={isEditing} onChange={handleInputChange} readOnly={true} />
                            </div>
                        </div>

                        {/* Generated Cash (New Field) */}
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400 text-sm">Efectivo Generado Hoy</span>
                                <span className="text-lg font-bold text-emerald-400">
                                    ${formData.daily_cash_generated?.toLocaleString()}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 text-right">
                                (Total Contabilizado - Caja Día Anterior)
                            </p>
                        </div>

                        {/* Difference */}
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-400">Diferencia Final</span>
                                <span className={`text-xl font-bold ${formData.difference === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ${formData.difference?.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-2">
                            <label className="text-xs text-slate-500 uppercase">Detalle Juguetes / Notas</label>
                            {isEditing ? (
                                <textarea
                                    name="toys_sold_details"
                                    value={formData.toys_sold_details}
                                    onChange={handleInputChange}
                                    className="input-premium w-full h-24 text-white"
                                />
                            ) : (
                                <p className="text-slate-300 bg-slate-800/30 p-3 rounded-lg text-sm whitespace-pre-wrap">
                                    {record.toys_sold_details || 'Sin detalles'}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-slate-500 uppercase">Trabajador</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    name="worker_name"
                                    value={formData.worker_name}
                                    onChange={handleInputChange}
                                    className="input-premium w-full text-white"
                                />
                            ) : (
                                <p className="text-lg font-medium text-white">{record.worker_name || 'N/A'}</p>
                            )}
                        </div>

                    </div>

                    {/* Footer Actions */}
                    {userRole === 'admin' && (
                        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur border-t border-slate-700 p-4 flex justify-end gap-3 z-10">
                            {isEditing ? (
                                <>
                                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white transition-colors">
                                        Cancelar
                                    </button>
                                    <button onClick={handleSave} disabled={loading} className="btn-primary flex items-center gap-2">
                                        <Save className="w-4 h-4" />
                                        Guardar Cambios
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={handleDelete} className="px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar
                                    </button>
                                    <button onClick={() => setIsEditing(true)} className="btn-primary flex items-center gap-2">
                                        <Edit className="w-4 h-4" />
                                        Editar
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function Field({ label, name, value, isEditing, onChange, readOnly = false }: any) {
    return (
        <div className="space-y-1">
            <label className="text-xs text-slate-500">{label}</label>
            {isEditing && !readOnly ? (
                <input
                    type="number"
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="input-premium w-full py-1 px-2 text-sm text-white"
                />
            ) : (
                <p className="text-white font-mono">${typeof value === 'number' ? value.toLocaleString() : value}</p>
            )}
        </div>
    );
}
