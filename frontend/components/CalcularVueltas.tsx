'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { Calculator, Pencil, Check, X as XIcon } from 'lucide-react';

type DinoCounter = { id: number; name: string; thousands: number };

export default function CalcularVueltas({ onComplete, userRole }: { onComplete: (data: any) => void; userRole?: string }) {
    // Lo que se escribe acá son las 3 cifras que se ven en el contador físico de cada dino
    // (se reinicia a 0 al pasar de 999). El "thousands" que arma el número real recién se
    // confirma y se guarda cuando se cierra la caja (ver CuadrarCaja) — acá es solo una
    // vista previa, para que un error de tipeo en esta pantalla no corrompa el contador.
    const [dinos, setDinos] = useState<number[]>([0, 0, 0, 0, 0, 0]);
    const [dinoCounters, setDinoCounters] = useState<DinoCounter[]>([]);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const isAdmin = userRole === 'admin';

    // Corrección manual del "thousands" (solo admin), por si un error de tipeo lo dejó mal.
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');

    const loadCounters = () => {
        api.get('/dino-counters')
            .then(res => setDinoCounters(res.data))
            .catch(() => { });
    };

    useEffect(() => {
        loadCounters();
    }, []);

    const handleCalculate = async () => {
        setLoading(true);
        try {
            // Vista previa: usa el "thousands" que ya conocemos, sin persistir nada todavía.
            const previewCounts = dinos.map((raw, idx) => (dinoCounters[idx]?.thousands || 0) * 1000 + raw);

            const lastRecordRes = await api.get('/last-record');
            const prevTotal = lastRecordRes.data.total_accumulated_today || 0;

            const res = await api.post('/calculate-vueltas', {
                dino_counts: previewCounts,
                total_accumulated_prev: prevTotal
            });

            if (isAdmin) {
                setResult(res.data);
            }

            // "dinos" acá son las lecturas CRUDAS (3 dígitos). El reinicio automático recién
            // se resuelve y se guarda de verdad al confirmar el cierre en Cuadrar Caja.
            onComplete({ ...res.data, dinos });
        } catch (error) {
            console.error(error);
            alert('Error al calcular');
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (counter: DinoCounter) => {
        setEditingId(counter.id);
        setEditValue(String(counter.thousands));
    };

    const saveEdit = async (counterId: number) => {
        const value = parseInt(editValue);
        if (isNaN(value) || value < 0) {
            setEditingId(null);
            return;
        }
        try {
            await api.put(`/dino-counters/${counterId}`, { thousands: value });
            loadCounters();
        } catch (e) {
            console.error(e);
            alert('Error al corregir el contador');
        } finally {
            setEditingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {dinos.map((val, idx) => {
                    const counter = dinoCounters[idx];
                    const isEditing = counter && editingId === counter.id;
                    return (
                        <div key={idx} className="space-y-2">
                            <label className="text-sm text-slate-400">{counter?.name || `Dino ${idx + 1}`}</label>
                            <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-900/50 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all duration-200">
                                {isEditing ? (
                                    <div className="flex items-center bg-slate-800 border-r border-slate-700 shrink-0">
                                        <input
                                            type="number"
                                            autoFocus
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="w-10 bg-transparent text-center text-slate-200 font-mono text-sm outline-none"
                                        />
                                        <button onClick={() => saveEdit(counter.id)} className="px-1 text-emerald-400 hover:text-emerald-300">
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => setEditingId(null)} className="px-1 text-slate-500 hover:text-slate-300">
                                            <XIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        title={isAdmin ? 'Tocar para corregir los miles acumulados' : 'Miles acumulados'}
                                        onClick={() => isAdmin && counter && startEdit(counter)}
                                        className={`flex items-center justify-center gap-1 px-2.5 bg-slate-800 text-slate-300 font-mono text-lg font-bold border-r border-slate-700 shrink-0 ${isAdmin ? 'cursor-pointer hover:bg-slate-700' : ''}`}
                                    >
                                        {counter ? `${counter.thousands}.` : '—'}
                                        {isAdmin && counter && <Pencil className="w-2.5 h-2.5 opacity-50" />}
                                    </div>
                                )}
                                <input
                                    type="number"
                                    min={0}
                                    max={999}
                                    placeholder="000"
                                    value={val || ''}
                                    onChange={(e) => {
                                        const newDinos = [...dinos];
                                        newDinos[idx] = parseInt(e.target.value) || 0;
                                        setDinos(newDinos);
                                    }}
                                    className="flex-1 min-w-0 bg-transparent px-3 py-3 text-center text-xl font-mono text-white outline-none"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={handleCalculate}
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2"
            >
                <Calculator className="w-5 h-5" />
                {isAdmin ? 'Calcular Total' : 'Confirmar y Continuar'}
            </button>

            {isAdmin && result && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center space-y-2"
                >
                    <p className="text-slate-400">Total Hoy</p>
                    <p className="text-3xl font-bold text-emerald-400">{result.total_today}</p>
                    <div className="pt-2 border-t border-emerald-500/20 mt-2">
                        <p className="text-sm text-slate-400">Vueltas Realizadas</p>
                        <p className="text-xl font-semibold text-white">{result.rides_today}</p>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
