// Eventos especiales del equipo DinoCars: cumpleaños, amigo secreto y aniversario.
import { WORKER_INFO, WorkerKey } from './scheduleRules';

export type EventIcon = 'birthday' | 'secretFriend' | 'anniversary';

export type SpecialEvent = {
    key: string;
    title: string;
    subtitle?: string;
    icon: EventIcon;
    month: number; // 1-12
    day: number;
    recurring: boolean; // true = se repite cada año; false = fecha puntual de este año
    year?: number; // solo para eventos no recurrentes
    theme?: 'christmas'; // acento visual especial (colores/emojis navideños)
};

const WORKER_BIRTHDAYS: Record<WorkerKey, { month: number; day: number }> = {
    josefa: { month: 7, day: 13 },
    eloisa: { month: 3, day: 10 },
    taahirah: { month: 1, day: 22 },
    paz: { month: 7, day: 19 },
};

export const SPECIAL_EVENTS: SpecialEvent[] = [
    ...(Object.keys(WORKER_BIRTHDAYS) as WorkerKey[]).map((key) => ({
        key: `birthday-${key}`,
        title: `Cumpleaños de ${WORKER_INFO[key].name}`,
        icon: 'birthday' as const,
        month: WORKER_BIRTHDAYS[key].month,
        day: WORKER_BIRTHDAYS[key].day,
        recurring: true,
    })),
    {
        key: 'amigo-secreto',
        title: '🎄 Amigo Secreto 🎅',
        subtitle: '¡Navidad! Sábado 19 de diciembre',
        icon: 'secretFriend' as const,
        month: 12,
        day: 19,
        recurring: false,
        year: 2026,
        theme: 'christmas',
    },
    {
        key: 'aniversario',
        title: 'Aniversario DinoCars',
        subtitle: 'Salida de aniversario',
        icon: 'anniversary' as const,
        month: 8,
        day: 30,
        recurring: true,
    },
];

function stripTime(d: Date): Date {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
}

// Devuelve la próxima ocurrencia futura (o de hoy) del evento a partir de `from`.
// Para eventos no recurrentes ya pasados, igual retorna la fecha puntual (queda en el pasado).
export function getNextOccurrence(event: SpecialEvent, from: Date): Date {
    if (!event.recurring && event.year) {
        return new Date(event.year, event.month - 1, event.day);
    }

    const today = stripTime(from);
    const year = from.getFullYear();
    let candidate = new Date(year, event.month - 1, event.day);

    if (candidate.getTime() < today.getTime()) {
        candidate = new Date(year + 1, event.month - 1, event.day);
    }

    return candidate;
}

export function getCountdownParts(target: Date, now: Date) {
    const diffMs = target.getTime() - now.getTime();
    const totalHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return { days, hours };
}
