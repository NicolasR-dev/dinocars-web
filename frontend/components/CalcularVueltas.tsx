'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { motion } from 'framer-motion';
import { Calculator, Save } from 'lucide-react';

export default function CalcularVueltas({ onComplete }: { onComplete: (data: any) => void }) {
    const [dinos, setDinos] = useState<number[]>([0, 0, 0, 0, 0, 0]);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleCalculate = async () => {
        setLoading(true);
        try {
            // First get the last record to know previous total
            const lastRecordRes = await api.get('/last-record');
            const prevTotal = lastRecordRes.data.total_accumulated_today || 0;

            const res = await api.post('/calculate-vueltas', {
                dino_counts: dinos,
                total_accumulated_prev: prevTotal
            });

            setResult(res.data);
            onComplete({ ...res.data, dinos });
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
                {dinos.map((val, idx) => (
                    <div key={idx} className="space-y-2">
                        <label className="text-sm text-slate-400">Dino {idx + 1}</label>
                        <input
                            type="number"
                            value={val || ''}
                            onChange={(e) => {
                                const newDinos = [...dinos];
                                newDinos[idx] = parseInt(e.target.value) || 0;
                                setDinos(newDinos);
                            }}
                            className="input-premium w-full text-center text-xl font-mono text-white"
                        />
                    </div>
                ))}
            </div>

            <button
                onClick={handleCalculate}
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2"
            >
                <Calculator className="w-5 h-5" />
                Calcular Total
            </button>

            {result && (
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
