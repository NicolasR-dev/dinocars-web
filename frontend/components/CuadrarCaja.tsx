'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { DollarSign, Save, AlertTriangle, CheckCircle, Calendar, User } from 'lucide-react';

export default function CuadrarCaja({ initialRides, currentUser }: { initialRides?: number, currentUser?: any }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [prevData, setPrevData] = useState<any>(null);

    // Form Data
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        worker_name: '',
        vueltas_hoy: 0,
        vueltas_admin: 0,
        efectivo_retirado: 0,
        efectivo_caja: 0,
        pagos_tarjeta: 0,
        juguetes_vendidos_total: 0,
        juguetes_detalles: '',
    });

    const [calculation, setCalculation] = useState<any>(null);

    useEffect(() => {
        loadInitialData();
        if (currentUser && currentUser.username) {
            setFormData(prev => ({ ...prev, worker_name: currentUser.username }));
        }
    }, [currentUser]);

    useEffect(() => {
        if (initialRides !== undefined) {
            setFormData(prev => ({ ...prev, vueltas_hoy: initialRides }));
        }
    }, [initialRides]);

    const loadInitialData = async () => {
        try {
            const res = await api.get('/last-record');
            setPrevData(res.data);
        } catch (e) {
            console.error("Error loading initial data", e);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'juguetes_detalles' || name === 'date' || name === 'worker_name') ? value : (value === '' ? 0 : parseFloat(value))
        }));
    };

    const calculateResults = () => {
        if (!prevData) return;

        const vueltas_efectivas = formData.vueltas_hoy - formData.vueltas_admin;
        const valor_por_vuelta = 4000;
        const ingresos_esperados = (vueltas_efectivas * valor_por_vuelta) + formData.juguetes_vendidos_total;

        // Assuming effective cash from previous day is what we start with? 
        const efectivo_dia_anterior = prevData.cash_in_box || 0;

        const total_contabilizado = formData.efectivo_retirado + formData.efectivo_caja + formData.pagos_tarjeta;
        const total_contabilizado_ajustado = total_contabilizado - efectivo_dia_anterior;
        const diferencia = total_contabilizado_ajustado - ingresos_esperados;

        const estado_caja = diferencia === 0 ? "CUADRA" : (diferencia > 0 ? "EXCEDENTE" : "FALTANTE");
        const efectivo_diario_generado = total_contabilizado - efectivo_dia_anterior;

        setCalculation({
            vueltas_efectivas,
            ingresos_esperados,
            total_contabilizado,
            diferencia,
            estado_caja,
            efectivo_diario_generado,
            efectivo_dia_anterior
        });
        setStep(2);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                date: formData.date,
                total_accumulated_prev: prevData.total_accumulated_today || 0,
                total_accumulated_today: (prevData.total_accumulated_today || 0) + formData.vueltas_hoy,
                rides_today: formData.vueltas_hoy,
                admin_rides: formData.vueltas_admin,
                effective_rides: calculation.vueltas_efectivas,
                expected_income: calculation.ingresos_esperados,
                cash_withdrawn: formData.efectivo_retirado,
                cash_in_box: formData.efectivo_caja,
                card_payments: formData.pagos_tarjeta,
                total_counted: calculation.total_contabilizado,
                status: calculation.estado_caja,
                difference: calculation.diferencia,
                daily_cash_generated: calculation.efectivo_diario_generado,
                toys_sold_details: formData.juguetes_detalles,
                toys_sold_total: formData.juguetes_vendidos_total,
                worker_name: formData.worker_name
            };

            await api.post('/records/', payload);
            alert('Caja cuadrada y guardada con éxito!');
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    if (step === 1) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Date and Worker */}
                    <div className="space-y-2">
                        <label className="text-sm text-slate-400">Fecha de Cierre</label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleInputChange}
                            className="input-premium w-full text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-slate-400">Trabajador</label>
                        <input
                            type="text"
                            name="worker_name"
                            value={formData.worker_name}
                            onChange={handleInputChange}
                            className="input-premium w-full text-white"
                            placeholder="Nombre del trabajador"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-slate-400">Vueltas Realizadas Hoy</label>
                        <input
                            type="number"
                            name="vueltas_hoy"
                            value={formData.vueltas_hoy}
                            onChange={handleInputChange}
                            onFocus={(e) => e.target.select()}
                            className="input-premium w-full text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-slate-400">Vueltas Administrativas</label>
                        <input
                            type="number"
                            name="vueltas_admin"
                            value={formData.vueltas_admin}
                            onChange={handleInputChange}
                            onFocus={(e) => e.target.select()}
                            className="input-premium w-full text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-slate-400">Efectivo Retirado</label>
                        <input
                            type="number"
                            name="efectivo_retirado"
                            value={formData.efectivo_retirado}
                            onChange={handleInputChange}
                            onFocus={(e) => e.target.select()}
                            className="input-premium w-full text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-slate-400">Efectivo en Caja (Final)</label>
                        <input
                            type="number"
                            name="efectivo_caja"
                            value={formData.efectivo_caja}
                            onChange={handleInputChange}
                            onFocus={(e) => e.target.select()}
                            className="input-premium w-full text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-slate-400">Pagos con Tarjeta</label>
                        <input
                            type="number"
                            name="pagos_tarjeta"
                            value={formData.pagos_tarjeta}
                            onChange={handleInputChange}
                            onFocus={(e) => e.target.select()}
                            className="input-premium w-full text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-slate-400">Total Juguetes Vendidos ($)</label>
                        <input
                            type="number"
                            name="juguetes_vendidos_total"
                            value={formData.juguetes_vendidos_total}
                            onChange={handleInputChange}
                            onFocus={(e) => e.target.select()}
                            className="input-premium w-full text-white"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm text-slate-400">Detalle Juguetes (Opcional)</label>
                    <textarea
                        name="juguetes_detalles"
                        value={formData.juguetes_detalles}
                        onChange={handleInputChange}
                        className="input-premium w-full h-24 text-white"
                        placeholder="Ej: 1 Rex x 5000, 1 Auto x 3000..."
                    />
                </div>

                <button onClick={calculateResults} className="w-full btn-primary">
                    Calcular Cierre
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass p-4 rounded-xl">
                    <p className="text-sm text-slate-400">Ingresos Esperados</p>
                    <p className="text-2xl font-bold text-white">${calculation.ingresos_esperados.toLocaleString()}</p>
                </div>
                <div className="glass p-4 rounded-xl">
                    <p className="text-sm text-slate-400">Total Contabilizado</p>
                    <p className="text-2xl font-bold text-white">${calculation.total_contabilizado.toLocaleString()}</p>
                </div>
                <div className="glass p-4 rounded-xl">
                    <p className="text-sm text-slate-400">Efectivo Generado Hoy</p>
                    <p className="text-2xl font-bold text-emerald-400">${calculation.efectivo_diario_generado.toLocaleString()}</p>
                </div>
                <div className={`glass p-4 rounded-xl border-l-4 ${calculation.estado_caja === 'CUADRA' ? 'border-emerald-500' : (calculation.estado_caja === 'EXCEDENTE' ? 'border-yellow-500' : 'border-red-500')}`}>
                    <p className="text-sm text-slate-400">Estado</p>
                    <div className="flex items-center gap-2">
                        <p className={`text-2xl font-bold ${calculation.estado_caja === 'CUADRA' ? 'text-emerald-400' : (calculation.estado_caja === 'EXCEDENTE' ? 'text-yellow-400' : 'text-red-400')}`}>
                            {calculation.estado_caja}
                        </p>
                        {calculation.estado_caja === 'CUADRA' ? <CheckCircle className="text-emerald-500" /> : (calculation.estado_caja === 'EXCEDENTE' ? <AlertTriangle className="text-yellow-500" /> : <AlertTriangle className="text-red-500" />)}
                    </div>
                    {calculation.diferencia !== 0 && (
                        <p className="text-red-400 font-mono mt-1">
                            Diferencia: ${calculation.diferencia.toLocaleString()}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors">
                    Volver / Editar
                </button>
                <button onClick={handleSubmit} disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" />
                    Confirmar y Guardar
                </button>
            </div>
        </div>
    );
}
