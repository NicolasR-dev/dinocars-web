'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { Calculator, Save } from 'lucide-react';

export default function CalcularVueltas({ onComplete, userRole }: { onComplete: (data: any) => void; userRole?: string }) {
    // Lo que se escribe acá son las 3 cifras que se ven en el contador físico de cada dino
    // (se reinicia a 0 al pasar de 999). El backend recuerda cuántos miles lleva cada uno
    // y reconstruye el número real — nadie tiene que hacer esa cuenta a mano.
    const [dinos, setDinos] = useState<number[]>([0, 0, 0, 0, 0, 0]);
    const [dinoCounters, setDinoCounters] = useState<{ name: string; thousands: number }[]>([]);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const isAdmin = userRole === 'admin';

    useEffect(() => {
        api.get('/dino-counters')
            .then(res => setDinoCounters(res.data.map((c: any) => ({ name: c.name, thousands: c.thousands }))))
            .catch(() => { });
    }, []);

    const handleCalculate = async () => {
        setLoading(true);
        try {
            const resolveRes = await api.post('/dino-counters/resolve', { raw_counts: dinos });
            const fullCounts: number[] = resolveRes.data.dino_counts;

            const lastRecordRes = await api.get('/last-record');
            const prevTotal = lastRecordRes.data.total_accumulated_today || 0;

            const res = await api.post('/calculate-vueltas', {
                dino_counts: fullCounts,
                total_accumulated_prev: prevTotal
            });

            if (isAdmin) {
                setResult(res.data);
            }

            // Still call onComplete but maybe after a short delay or directly
            // If it's a worker, we want to move them to the next tab without showing the green box.
            onComplete({ ...res.data, dinos: fullCounts });
        } catch (error) {
            console.error(error);
            alert('Error al calcular');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {dinos.map((val, idx) => {
                    const counter = dinoCounters[idx];
                    return (
                        <div key={idx} className="space-y-2">
                            <label className="text-sm text-slate-400">{counter?.name || `Dino ${idx + 1}`}</label>
                            <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-900/50 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all duration-200">
                                <div
                                    title="Miles acumulados (fijo, no se edita)"
                                    className="flex items-center justify-center px-2.5 bg-slate-800 text-slate-300 font-mono text-lg font-bold border-r border-slate-700 shrink-0"
                                >
                                    {counter ? `${counter.thousands}.` : '—'}
                                </div>
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
