'use client';

import { useEffect, useState } from 'react';
import { Cake, Gift, PartyPopper } from 'lucide-react';
import { SPECIAL_EVENTS, getNextOccurrence, getCountdownParts, EventIcon } from '@/lib/specialEvents';

const EVENT_STYLE: Record<EventIcon, { Icon: any; bg: string; border: string; text: string }> = {
    birthday: { Icon: Cake, bg: 'bg-pink-500/15', border: 'border-pink-500/40', text: 'text-pink-300' },
    secretFriend: { Icon: Gift, bg: 'bg-red-500/15', border: 'border-emerald-500/40', text: 'text-red-300' },
    anniversary: { Icon: PartyPopper, bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-300' },
};

function fmtEventDate(d: Date) {
    return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
}

export default function SpecialEvents() {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(id);
    }, []);

    const upcoming = SPECIAL_EVENTS
        .map((event) => ({ event, date: getNextOccurrence(event, now) }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    const next = upcoming[0];
    const { days, hours } = next ? getCountdownParts(next.date, now) : { days: 0, hours: 0 };
    const isChristmas = next?.event.theme === 'christmas';

    return (
        <div className="space-y-3">
            <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <PartyPopper className="text-amber-400 w-5 h-5" />
                Eventos Especiales
            </h4>

            {next && (
                <div
                    className={`rounded-xl p-4 sm:p-5 shadow-lg ${isChristmas
                            ? 'bg-gradient-to-r from-red-600 via-rose-600 to-emerald-600 shadow-red-500/25'
                            : 'bg-gradient-to-r from-amber-600 via-orange-600 to-pink-600 shadow-orange-500/25'
                        }`}
                >
                    <p className="text-white/80 text-[11px] font-bold uppercase tracking-wide">
                        {isChristmas ? '🎄 Próximo evento' : 'Próximo evento'}
                    </p>
                    <p className="text-white font-bold text-base sm:text-lg leading-tight mt-0.5">{next.event.title}</p>
                    <div className="flex items-baseline gap-2 mt-2 flex-wrap">
                        <span className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.25)]">
                            {isChristmas ? '🎅 ' : ''}{days}d {hours}h{isChristmas ? ' 🎁' : ''}
                        </span>
                        <span className="text-white/70 text-xs sm:text-sm">· {fmtEventDate(next.date)}</span>
                    </div>
                </div>
            )}

            <div className="grid sm:grid-cols-2 gap-2.5">
                {upcoming.map(({ event, date }) => {
                    const style = EVENT_STYLE[event.icon];
                    const Icon = style.Icon;
                    const isNext = next && event.key === next.event.key;
                    return (
                        <div
                            key={event.key}
                            className={`glass-card rounded-xl p-3.5 flex items-center gap-3 border ${isNext ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-slate-700/50'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${style.bg}`}>
                                <Icon className={`w-5 h-5 ${style.text}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-sm text-white leading-tight truncate">{event.title}</p>
                                {event.subtitle && (
                                    <p className="text-[11px] text-slate-500 leading-tight truncate">{event.subtitle}</p>
                                )}
                            </div>
                            <div className={`px-2.5 py-1.5 rounded-lg border text-right shrink-0 ${style.bg} ${style.border}`}>
                                <p className={`text-xs font-mono font-bold leading-tight ${style.text}`}>{fmtEventDate(date)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
