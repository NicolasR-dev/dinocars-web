'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save, AlertTriangle, CheckCircle, ChevronRight,
    CreditCard, Banknote, RotateCw, ShoppingBag, CalendarDays,
    User, ArrowLeft, TrendingUp, Wallet, Receipt
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function fmt(n: number) {
    return `$${n.toLocaleString('es-CL')}`;
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700/60">
            <span className="text-indigo-400">{icon}</span>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{label}</span>
        </div>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">{label}</label>
            {children}
            {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
        </div>
    );
}

function NumInput({ name, value, onChange }: { name: string; value: number; onChange: any }) {
    return (
        <input
            type="number"
            name={name}
            value={value}
            onChange={onChange}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            className="input-premium w-full text-white text-lg font-semibold"
            style={{ fontSize: '1.125rem' }}
        />
    );
}

function SummaryCard({
    label, value, color = 'text-white', icon, wide = false, borderColor
}: {
    label: string; value: string; color?: string; icon: React.ReactNode;
    wide?: boolean; borderColor?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass p-4 rounded-xl flex items-center gap-3 ${wide ? 'col-span-2 sm:col-span-2' : ''} ${borderColor ? `border-l-4 ${borderColor}` : ''}`}
        >
            <div className={`p-2.5 rounded-lg bg-white/5 ${color}`}>{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400 truncate">{label}</p>
                <p className={`text-xl font-bold ${color} truncate`}>{value}</p>
            </div>
        </motion.div>
    );
}

// ── step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
    const steps = ['Datos', 'Resumen'];
    return (
        <div className="flex items-center justify-center gap-3 mb-6">
            {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === i + 1
                        ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                        : step > i + 1
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                        {step > i + 1 ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${step === i + 1 ? 'text-white' : 'text-slate-500'}`}>{s}</span>
                    {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-slate-600" />}
                </div>
            ))}
        </div>
    );
}

// ── main component ────────────────────────────────────────────────────────────

export default function CuadrarCaja({ initialRides, currentUser }: { initialRides?: number; currentUser?: any }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [prevData, setPrevData] = useState<any>(null);

    const [formData, setFormData] = useState({
        date: toLocalDateStr(new Date()),
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
        if (currentUser) {
            const name = currentUser.username || currentUser.sub || '';
            if (name) setFormData(prev => ({ ...prev, worker_name: name }));
        }
    }, [currentUser]);

    useEffect(() => {
        if (initialRides !== undefined)
            setFormData(prev => ({ ...prev, vueltas_hoy: initialRides }));
    }, [initialRides]);

    const loadInitialData = async () => {
        try {
            const res = await api.get('/last-record');
            setPrevData(res.data);
        } catch (e) {
            console.error('Error loading initial data', e);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: (name === 'juguetes_detalles' || name === 'date' || name === 'worker_name')
                ? value
                : (value === '' ? 0 : parseFloat(value))
        }));
    };

    const calculateResults = () => {
        if (!prevData) return;

        const vueltas_efectivas = formData.vueltas_hoy - formData.vueltas_admin;
        const ingresos_esperados = (vueltas_efectivas * 4000) + formData.juguetes_vendidos_total;
        const efectivo_dia_anterior = prevData.cash_in_box || 0;
        const total_contabilizado = formData.efectivo_retirado + formData.efectivo_caja + formData.pagos_tarjeta;
        const diferencia = (total_contabilizado - efectivo_dia_anterior) - ingresos_esperados;
        const estado_caja = diferencia === 0 ? 'CUADRA' : diferencia > 0 ? 'EXCEDENTE' : 'FALTANTE';
        const efectivo_en_caja_hoy = (formData.efectivo_retirado + formData.efectivo_caja) - efectivo_dia_anterior;
        const total_dia = efectivo_en_caja_hoy + formData.pagos_tarjeta;

        setCalculation({
            vueltas_efectivas,
            ingresos_esperados,
            total_contabilizado,
            diferencia,
            estado_caja,
            efectivo_dia_anterior,
            efectivo_en_caja_hoy,
            pagos_tarjeta: formData.pagos_tarjeta,
            total_dia,
            efectivo_diario_generado: total_contabilizado - efectivo_dia_anterior,
        });
        setStep(2);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await api.post('/records/', {
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
                worker_name: formData.worker_name,
            });
            alert('¡Caja cuadrada y guardada con éxito!');
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert('Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    // ── STEP 1: DATA ENTRY ──────────────────────────────────────────────────

    if (step === 1) {
        return (
            <div className="space-y-6 pb-2">
                <StepIndicator step={1} />

                {/* ── Info general ── */}
                <div className="glass p-4 rounded-xl border border-slate-700/50">
                    <SectionTitle icon={<CalendarDays className="w-4 h-4" />} label="Información del cierre" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Fecha de Cierre">
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                className="input-premium w-full text-white"
                            />
                        </Field>
                        <Field label="Trabajador">
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    name="worker_name"
                                    value={formData.worker_name}
                                    onChange={handleInputChange}
                                    className="input-premium w-full text-white pl-9"
                                    placeholder="Nombre del trabajador"
                                />
                            </div>
                        </Field>
                    </div>
                </div>

                {/* ── Vueltas ── */}
                <div className="glass p-4 rounded-xl border border-slate-700/50">
                    <SectionTitle icon={<RotateCw className="w-4 h-4" />} label="Vueltas" />
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Vueltas Totales" hint="Contador al cierre">
                            <NumInput name="vueltas_hoy" value={formData.vueltas_hoy} onChange={handleInputChange} />
                        </Field>
                        <Field label="V. Administrativas" hint="Prueba / cortesía">
                            <NumInput name="vueltas_admin" value={formData.vueltas_admin} onChange={handleInputChange} />
                        </Field>
                    </div>
                    {/* live preview */}
                    <div className="mt-3 flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-2 text-xs text-slate-400">
                        <span>Vueltas efectivas</span>
                        <span className="font-bold text-white text-sm">
                            {formData.vueltas_hoy - formData.vueltas_admin}
                            <span className="text-slate-400 font-normal ml-1">
                                = {fmt((formData.vueltas_hoy - formData.vueltas_admin) * 4000)}
                            </span>
                        </span>
                    </div>
                </div>

                {/* ── Dinero ── */}
                <div className="glass p-4 rounded-xl border border-slate-700/50">
                    <SectionTitle icon={<Banknote className="w-4 h-4" />} label="Dinero" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field label="Efectivo Retirado" hint="Retiros durante el día">
                            <NumInput name="efectivo_retirado" value={formData.efectivo_retirado} onChange={handleInputChange} />
                        </Field>
                        <Field label="Efectivo en Caja" hint="Saldo final en caja">
                            <NumInput name="efectivo_caja" value={formData.efectivo_caja} onChange={handleInputChange} />
                        </Field>
                        <Field label="Pagos con Tarjeta" hint="Total transbank/POS">
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400 pointer-events-none" />
                                <input
                                    type="number"
                                    name="pagos_tarjeta"
                                    value={formData.pagos_tarjeta}
                                    onChange={handleInputChange}
                                    onFocus={(e) => e.target.select()}
                                    inputMode="numeric"
                                    className="input-premium w-full text-white pl-9 text-lg font-semibold"
                                />
                            </div>
                        </Field>
                    </div>
                </div>

                {/* ── Juguetes ── */}
                <div className="glass p-4 rounded-xl border border-slate-700/50">
                    <SectionTitle icon={<ShoppingBag className="w-4 h-4" />} label="Juguetes" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Total Juguetes ($)" hint="Suma total en pesos">
                            <NumInput name="juguetes_vendidos_total" value={formData.juguetes_vendidos_total} onChange={handleInputChange} />
                        </Field>
                        <Field label="Detalle (Opcional)">
                            <textarea
                                name="juguetes_detalles"
                                value={formData.juguetes_detalles}
                                onChange={handleInputChange}
                                className="input-premium w-full h-[72px] text-white text-sm resize-none"
                                placeholder="Ej: 1 Rex $5.000, 1 Auto $3.000"
                            />
                        </Field>
                    </div>
                </div>

                {/* ── CTA ── */}
                <button
                    onClick={calculateResults}
                    disabled={!prevData}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-4 text-base font-bold disabled:opacity-50"
                >
                    Ver Resumen
                    <ChevronRight className="w-5 h-5" />
                </button>
                {!prevData && (
                    <p className="text-center text-xs text-slate-500">Cargando datos del día anterior…</p>
                )}
            </div>
        );
    }

    // ── STEP 2: CONFIRMATION SUMMARY ────────────────────────────────────────

    const estadoColor = calculation.estado_caja === 'CUADRA'
        ? { border: 'border-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10' }
        : calculation.estado_caja === 'EXCEDENTE'
            ? { border: 'border-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/10' }
            : { border: 'border-red-500', text: 'text-red-400', bg: 'bg-red-500/10' };

    const estadoIcon = calculation.estado_caja === 'CUADRA'
        ? <CheckCircle className="w-6 h-6 text-emerald-500" />
        : <AlertTriangle className="w-6 h-6 text-yellow-500" />;

    return (
        <div className="space-y-5 pb-2">
            <StepIndicator step={2} />

            <p className="text-center text-xs text-slate-400">
                Revisa los resultados antes de confirmar el cierre del{' '}
                <span className="font-semibold text-slate-200">{formData.date}</span>
            </p>

            {/* Summary grid */}
            <div className="grid grid-cols-2 gap-3">
                <SummaryCard
                    label="Ingresos Esperados"
                    value={fmt(calculation.ingresos_esperados)}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="text-white"
                />
                <SummaryCard
                    label="Efectivo en Caja Hoy"
                    value={fmt(calculation.efectivo_en_caja_hoy)}
                    icon={<Banknote className="w-5 h-5" />}
                    color="text-emerald-400"
                />
                <SummaryCard
                    label="Pagos con Tarjeta"
                    value={fmt(calculation.pagos_tarjeta)}
                    icon={<CreditCard className="w-5 h-5" />}
                    color="text-sky-400"
                />
                <SummaryCard
                    label="Total del Día"
                    value={fmt(calculation.total_dia)}
                    icon={<Wallet className="w-5 h-5" />}
                    color="text-violet-400"
                />

                {/* Estado — wide */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`col-span-2 glass p-4 rounded-xl border-l-4 ${estadoColor.border} ${estadoColor.bg}`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-slate-400 mb-1">Estado de Caja</p>
                            <p className={`text-3xl font-black ${estadoColor.text}`}>
                                {calculation.estado_caja}
                            </p>
                            {calculation.diferencia !== 0 && (
                                <p className="text-xs mt-1 text-slate-400">
                                    Diferencia:{' '}
                                    <span className={`font-bold ${estadoColor.text}`}>
                                        {fmt(Math.abs(calculation.diferencia))}
                                    </span>
                                    {' '}{calculation.diferencia > 0 ? 'de más' : 'de menos'}
                                </p>
                            )}
                        </div>
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                            {estadoIcon}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Recap mini-table */}
            <div className="glass rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="px-4 py-2 bg-slate-800/60 border-b border-slate-700/50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5" /> Detalle del cierre
                    </p>
                </div>
                <div className="divide-y divide-slate-700/40">
                    {[
                        { label: 'Trabajador', value: formData.worker_name || '—' },
                        { label: 'Vueltas totales', value: `${formData.vueltas_hoy} (${formData.vueltas_admin} admin)` },
                        { label: 'Vueltas efectivas', value: `${calculation.vueltas_efectivas}` },
                        { label: 'Efectivo retirado', value: fmt(formData.efectivo_retirado) },
                        { label: 'Efectivo final en caja', value: fmt(formData.efectivo_caja) },
                        { label: 'Saldo caja anterior', value: fmt(calculation.efectivo_dia_anterior) },
                        ...(formData.juguetes_vendidos_total > 0
                            ? [{ label: 'Juguetes vendidos', value: fmt(formData.juguetes_vendidos_total) }]
                            : []),
                    ].map(row => (
                        <div key={row.label} className="flex justify-between items-center px-4 py-2.5 text-sm">
                            <span className="text-slate-400">{row.label}</span>
                            <span className="font-medium text-white">{row.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3.5 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver y Editar
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 py-3.5 font-bold text-base disabled:opacity-60"
                >
                    <Save className="w-5 h-5" />
                    {loading ? 'Guardando…' : 'Confirmar y Guardar'}
                </button>
            </div>
        </div>
    );
}
