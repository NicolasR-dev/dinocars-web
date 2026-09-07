'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Users, ArrowLeft, Sunrise, Sunset, Sun, Coffee, Clock, AlarmClock, PartyPopper } from 'lucide-react';
import {
    getMonday,
    getWeekSchedule,
    matchWorkerKey,
    WORKER_INFO,
    WEEKDAYS,
    calcHours,
    WorkerKey,
    ShiftType,
} from '@/lib/scheduleRules';

const SHIFT_STYLE: Record<ShiftType, { label: string; icon: any; bg: string; border: string; text: string }> = {
    apertura: { label: 'Apertura', icon: Sunrise, bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-300' },
    cierre: { label: 'Cierre', icon: Sunset, bg: 'bg-orange-500/15', border: 'border-orange-500/40', text: 'text-orange-300' },
    completo: { label: 'Turno Completo', icon: Sun, bg: 'bg-indigo-500/15', border: 'border-indigo-500/40', text: 'text-indigo-300' },
};

function fmtDate(d: Date) {
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

export default function WorkerSchedule({ currentUser }: { currentUser: any }) {
    const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
    const [showTeam, setShowTeam] = useState(false);

    const myKey = matchWorkerKey(currentUser?.username || '');
    const forceTeam = !myKey;

    const weekSchedule = getWeekSchedule(weekStart);
    const weekDates = WEEKDAYS.map((_, i) => {
        const dt = new Date(weekStart);
        dt.setDate(dt.getDate() + i);
        return dt;
    });

    const today = new Date();
    const todayKey = WEEKDAYS[(today.getDay() + 6) % 7].key;
    const isCurrentWeek = getMonday(today).getTime() === weekStart.getTime();

    const changeWeek = (delta: number) => {
        const next = new Date(weekStart);
        next.setDate(next.getDate() + delta * 7);
        setWeekStart(getMonday(next));
    };

    const myShifts = myKey ? weekSchedule[myKey] : undefined;
    const myTotalHours = myShifts ? WEEKDAYS.reduce((acc, d) => acc + calcHours(myShifts[d.key]), 0) : 0;

    const viewingTeam = showTeam || forceTeam;

    // "Mañana" siempre se calcula sobre la fecha real de hoy, sin importar qué semana se esté navegando.
    const tomorrowDate = new Date(today);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowMonday = getMonday(tomorrowDate);
    const tomorrowKey = WEEKDAYS[(tomorrowDate.getDay() + 6) % 7].key;
    const tomorrowShift = myKey ? getWeekSchedule(tomorrowMonday)[myKey][tomorrowKey] : undefined;

    return (
        <div className="space-y-5">
            {/* Aviso de mañana */}
            {!forceTeam && myKey && (
                <div className="rounded-xl p-4 sm:p-5 bg-gradient-to-r from-indigo-600 via-indigo-600 to-cyan-600 shadow-lg shadow-indigo-500/25 flex items-center gap-3 sm:gap-4">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                        {tomorrowShift ? (
                            <AlarmClock className="w-6 h-6 text-white" />
                        ) : (
                            <PartyPopper className="w-6 h-6 text-white" />
                        )}
                    </div>
                    <div className="min-w-0">
                        {tomorrowShift ? (
                            <>
                                <p className="text-white font-bold text-sm sm:text-base leading-tight">Mañana entras a las:</p>
                                <p className="text-2xl sm:text-3xl font-extrabold text-yellow-300 drop-shadow-[0_1px_6px_rgba(250,204,21,0.55)] leading-tight tracking-tight">
                                    {tomorrowShift.start} !!!
                                </p>
                            </>
                        ) : (
                            <p className="text-white font-bold text-sm sm:text-base leading-tight">
                                Mañana no trabajas, ¡a descansar!
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 min-w-0">
                        <Clock className="text-indigo-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                        <span className="truncate">{viewingTeam ? 'Horario del Equipo' : 'Mi Horario'}</span>
                    </h3>

                    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 shrink-0">
                        <button onClick={() => changeWeek(-1)} className="p-1.5 hover:bg-white/10 rounded-md transition-colors" aria-label="Semana anterior">
                            <ChevronLeft className="w-4 h-4 text-slate-400" />
                        </button>
                        <span className="text-[11px] sm:text-xs font-bold text-slate-300 px-1.5 sm:px-2 whitespace-nowrap">
                            {fmtDate(weekDates[0])}–{fmtDate(weekDates[6])}
                        </span>
                        <button onClick={() => changeWeek(1)} className="p-1.5 hover:bg-white/10 rounded-md transition-colors" aria-label="Semana siguiente">
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>
                </div>

                {!forceTeam && myKey && (
                    <p className="text-sm text-slate-400">
                        Hola {WORKER_INFO[myKey].name}, este es tu horario de la semana{isCurrentWeek ? ' actual' : ''}.
                    </p>
                )}

                {!forceTeam && (
                    <button
                        onClick={() => setShowTeam((v) => !v)}
                        className="btn-glass w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                    >
                        {showTeam ? <ArrowLeft className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        {showTeam ? 'Volver a mi horario' : 'Ver horario del equipo completo'}
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {!viewingTeam ? (
                    <motion.div
                        key="personal"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="space-y-2.5"
                    >
                        {WEEKDAYS.map((day, i) => {
                            const s = myShifts?.[day.key];
                            const isToday = day.key === todayKey && isCurrentWeek;
                            const style = s ? SHIFT_STYLE[s.type] : null;
                            const Icon = style?.icon ?? Coffee;
                            return (
                                <div
                                    key={day.key}
                                    className={`glass-card rounded-xl p-3.5 flex items-center gap-3 border ${isToday ? 'border-indigo-500/60 ring-1 ring-indigo-500/30' : 'border-slate-700/50'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${style ? style.bg : 'bg-slate-800'}`}>
                                        <Icon className={`w-5 h-5 ${style ? style.text : 'text-slate-500'}`} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className={`font-bold text-sm leading-tight ${isToday ? 'text-indigo-300' : 'text-white'}`}>
                                            {day.label}
                                            {isToday && <span className="ml-1.5 text-[10px] font-bold text-indigo-400 align-middle">HOY</span>}
                                        </p>
                                        <p className="text-[11px] text-slate-500 leading-tight">{fmtDate(weekDates[i])}</p>
                                    </div>

                                    {s ? (
                                        <div className={`px-2.5 py-1.5 rounded-lg border text-right shrink-0 ${style!.bg} ${style!.border}`}>
                                            <p className={`text-[10px] font-bold uppercase leading-tight ${style!.text}`}>{style!.label}</p>
                                            <p className={`text-xs font-mono font-bold leading-tight ${style!.text}`}>
                                                {s.start}–{s.end}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/50 text-xs font-medium text-slate-500 shrink-0">
                                            Libre
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <div className="glass-card rounded-xl p-4 flex items-center justify-between bg-indigo-500/5 border border-indigo-500/20">
                            <span className="text-sm text-slate-300 font-medium">Total horas esta semana</span>
                            <span className="text-xl font-bold text-indigo-300">{myTotalHours.toFixed(1)}h</span>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="team" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                        {/* Mobile: compact chip cards per worker (no horizontal scroll) */}
                        <div className="sm:hidden space-y-3">
                            {(Object.keys(WORKER_INFO) as WorkerKey[]).map((key) => {
                                const info = WORKER_INFO[key];
                                const shifts = weekSchedule[key];
                                const workDays = WEEKDAYS.filter((d) => shifts[d.key]);
                                const total = workDays.reduce((acc, d) => acc + calcHours(shifts[d.key]), 0);
                                return (
                                    <div key={key} className="glass-card rounded-xl p-3.5 border border-slate-700/50">
                                        <div className="flex items-center justify-between mb-2.5">
                                            <span className="font-bold text-sm text-white flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full ${info.color}`} />
                                                {info.name}
                                                {key === myKey && <span className="text-[9px] text-indigo-400 font-bold">(TÚ)</span>}
                                            </span>
                                            <span className="text-[11px] text-slate-400 font-medium">{total.toFixed(1)}h/sem</span>
                                        </div>
                                        {workDays.length === 0 ? (
                                            <p className="text-xs text-slate-500">Sin turnos esta semana.</p>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {workDays.map((d) => {
                                                    const s = shifts[d.key]!;
                                                    const style = SHIFT_STYLE[s.type];
                                                    return (
                                                        <span
                                                            key={d.key}
                                                            className={`text-[10px] font-bold px-2 py-1 rounded-md border ${style.bg} ${style.border} ${style.text}`}
                                                        >
                                                            {d.label.substring(0, 3)} {s.start}–{s.end}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop / tablet: full weekly grid */}
                        <div className="hidden sm:block glass p-4 sm:p-6 rounded-xl border border-slate-700 overflow-x-auto">
                            <div className="min-w-[720px]">
                                <div className="grid grid-cols-8 gap-1 mb-2">
                                    <div className="p-2 text-xs font-bold text-slate-500 uppercase">Trabajadora</div>
                                    {WEEKDAYS.map((day, i) => (
                                        <div
                                            key={day.key}
                                            className={`text-center py-2 rounded-lg border ${day.key === todayKey && isCurrentWeek ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700'
                                                }`}
                                        >
                                            <span className="text-[10px] font-bold text-slate-400 block uppercase">{day.label.substring(0, 3)}</span>
                                            <span className="text-sm font-bold text-white">{weekDates[i].getDate()}</span>
                                        </div>
                                    ))}
                                </div>

                                {(Object.keys(WORKER_INFO) as WorkerKey[]).map((key) => {
                                    const info = WORKER_INFO[key];
                                    const shifts = weekSchedule[key];
                                    const total = WEEKDAYS.reduce((acc, d) => acc + calcHours(shifts[d.key]), 0);
                                    return (
                                        <div key={key} className="grid grid-cols-8 gap-1 items-stretch mb-1">
                                            <div className="p-2 bg-slate-800/30 rounded-lg border border-slate-700/50 flex flex-col justify-center">
                                                <span className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                                                    <span className={`w-2 h-2 rounded-full ${info.color}`} />
                                                    {info.name}
                                                    {key === myKey && <span className="text-[9px] text-indigo-400 font-bold">(TÚ)</span>}
                                                </span>
                                                <span className="text-[10px] text-slate-400">{total.toFixed(1)}h/sem</span>
                                            </div>
                                            {WEEKDAYS.map((day) => {
                                                const s = shifts[day.key];
                                                const style = s ? SHIFT_STYLE[s.type] : null;
                                                return (
                                                    <div
                                                        key={day.key}
                                                        className={`rounded-lg border flex flex-col items-center justify-center py-2 ${style ? `${style.bg} ${style.border}` : 'bg-slate-800/20 border-slate-700/30'
                                                            }`}
                                                    >
                                                        {s ? (
                                                            <>
                                                                <span className={`text-[10px] font-bold leading-tight ${style!.text}`}>{s.start}</span>
                                                                <span className={`text-[10px] opacity-70 leading-tight ${style!.text}`}>{s.end}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-600">—</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Leyenda */}
                        <div className="flex flex-wrap gap-3 sm:gap-4">
                            {(Object.entries(SHIFT_STYLE) as [ShiftType, typeof SHIFT_STYLE[ShiftType]][]).map(([key, s]) => {
                                const Icon = s.icon;
                                return (
                                    <div key={key} className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <Icon className={`w-3.5 h-3.5 ${s.text}`} />
                                        {s.label}
                                    </div>
                                );
                            })}
                        </div>

                        {forceTeam && (
                            <p className="text-xs text-slate-500">
                                No encontramos un horario personal para tu usuario ({currentUser?.username}), por eso te mostramos el horario completo del equipo.
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
