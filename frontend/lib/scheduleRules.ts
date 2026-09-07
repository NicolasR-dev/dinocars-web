// Reglas fijas de horario del equipo DinoCars.
// Belsy y Josefa tienen horario fijo. Eloisa y Taahirah rotan sus patrones cada semana.

export type ShiftType = 'apertura' | 'cierre' | 'completo';

export type Shift = { start: string; end: string; type: ShiftType };

export const WEEKDAYS = [
    { key: 'Monday', label: 'Lunes' },
    { key: 'Tuesday', label: 'Martes' },
    { key: 'Wednesday', label: 'Miércoles' },
    { key: 'Thursday', label: 'Jueves' },
    { key: 'Friday', label: 'Viernes' },
    { key: 'Saturday', label: 'Sábado' },
    { key: 'Sunday', label: 'Domingo' },
] as const;

export type WeekdayKey = typeof WEEKDAYS[number]['key'];

type WeekSchedule = Partial<Record<WeekdayKey, Shift>>;

// La tienda abre a las 10:00 y cierra a las 20:00.
// Un turno que empieza a las 10:00 es "apertura", uno que termina a las 20:00 es "cierre",
// y uno que hace ambas cosas es el "turno completo".
function shift(start: string, end: string): Shift {
    const isOpen = start === '10:00';
    const isClose = end === '20:00';
    const type: ShiftType = isOpen && isClose ? 'completo' : isOpen ? 'apertura' : 'cierre';
    return { start, end, type };
}

// ── Horarios fijos ──────────────────────────────────────────────────────────

const BELSY: WeekSchedule = {
    Saturday: shift('10:00', '20:00'),
    Sunday: shift('10:00', '20:00'),
};

const JOSEFA: WeekSchedule = {
    Wednesday: shift('14:00', '20:00'),
    Saturday: shift('10:00', '17:30'),
    Sunday: shift('13:00', '20:00'),
};

// ── Par rotativo: Eloisa <-> Taahirah intercambian su patrón cada semana ────

const PATTERN_E: WeekSchedule = {
    Monday: shift('10:00', '14:00'),
    Tuesday: shift('15:00', '20:00'),
    Wednesday: shift('10:00', '14:00'),
    Thursday: shift('15:00', '20:00'),
    Friday: shift('10:00', '14:00'),
};

const PATTERN_T: WeekSchedule = {
    Monday: shift('14:00', '20:00'),
    Tuesday: shift('10:00', '15:00'),
    Thursday: shift('10:00', '15:00'),
    Friday: shift('14:00', '20:00'),
};

// Semana ancla: la semana que empieza el lunes 7 de septiembre de 2026,
// donde Eloisa hace PATTERN_T y Taahirah hace PATTERN_E. A partir de ahí se alterna cada semana.
const ANCHOR_MONDAY = new Date(2026, 8, 7);

export function getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

function weeksBetween(a: Date, b: Date): number {
    const ms = b.getTime() - a.getTime();
    return Math.round(ms / (7 * 24 * 60 * 60 * 1000));
}

export type WorkerKey = 'belsy' | 'josefa' | 'eloisa' | 'taahirah';

export const WORKER_INFO: Record<WorkerKey, { name: string; color: string }> = {
    belsy: { name: 'Belsy', color: 'bg-blue-500' },
    josefa: { name: 'Josefa', color: 'bg-pink-500' },
    eloisa: { name: 'Eloisa', color: 'bg-emerald-500' },
    taahirah: { name: 'Taahirah', color: 'bg-purple-500' },
};

export function normalizeName(s: string): string {
    return s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .trim();
}

export function matchWorkerKey(username: string): WorkerKey | null {
    const n = normalizeName(username || '');
    const keys = Object.keys(WORKER_INFO) as WorkerKey[];
    return keys.find((k) => n.includes(k)) ?? null;
}

export function getWeekSchedule(monday: Date): Record<WorkerKey, WeekSchedule> {
    const diff = weeksBetween(ANCHOR_MONDAY, monday);
    const parity = ((diff % 2) + 2) % 2; // 0 = misma paridad que la semana ancla

    const eloisaPattern = parity === 0 ? PATTERN_T : PATTERN_E;
    const taahirahPattern = parity === 0 ? PATTERN_E : PATTERN_T;

    return {
        belsy: BELSY,
        josefa: JOSEFA,
        eloisa: eloisaPattern,
        taahirah: taahirahPattern,
    };
}

export function calcHours(s?: Shift): number {
    if (!s) return 0;
    const [sh, sm] = s.start.split(':').map(Number);
    const [eh, em] = s.end.split(':').map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
}
