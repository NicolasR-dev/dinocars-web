// Reglas fijas de horario del equipo DinoCars.
// Belsy, Josefa y Taahirah tienen horario fijo. Eloisa y Paz tienen el martes rotativo
// (cada una con sus propios horarios, no intercambian turno entre ellas).

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
    Wednesday: shift('13:00', '20:00'),
    Saturday: shift('10:00', '17:30'),
    Sunday: shift('12:30', '20:00'),
};

const TAAHIRAH: WeekSchedule = {
    Wednesday: shift('10:00', '14:00'),
    Saturday: shift('12:00', '20:00'),
    Sunday: shift('10:00', '20:00'),
};

// ── Eloisa y Paz: fijas de lunes a viernes, miércoles libre, martes rotativo ────

const ELOISA_BASE: WeekSchedule = {
    Monday: shift('10:00', '15:00'),
    Thursday: shift('10:00', '16:00'),
    Friday: shift('10:00', '16:00'),
};
const ELOISA_TUE_A = shift('10:00', '15:00'); // "semana A"
const ELOISA_TUE_B = shift('15:00', '20:00'); // "semana B"

const PAZ_BASE: WeekSchedule = {
    Monday: shift('15:00', '20:00'),
    Thursday: shift('15:00', '20:00'),
    Friday: shift('14:00', '20:00'),
};
// Semana contraria a Eloisa: cuando Eloisa hace 10-15 (semana A), Paz hace 14-20.
const PAZ_TUE_A = shift('14:00', '20:00');
const PAZ_TUE_B = shift('10:00', '16:00');

// Semana ancla: el lunes 28 de septiembre de 2026 es "semana B"
// (Eloisa martes 15:00-20:00, Paz martes 10:00-16:00). Se alterna cada semana desde ahí.
const ANCHOR_MONDAY = new Date(2026, 8, 28);

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

export type WorkerKey = 'belsy' | 'josefa' | 'eloisa' | 'taahirah' | 'paz';

export const WORKER_INFO: Record<WorkerKey, { name: string; color: string }> = {
    belsy: { name: 'Belsy', color: 'bg-blue-500' },
    josefa: { name: 'Josefa', color: 'bg-pink-500' },
    eloisa: { name: 'Eloisa', color: 'bg-emerald-500' },
    taahirah: { name: 'Taahirah', color: 'bg-purple-500' },
    paz: { name: 'Paz', color: 'bg-orange-500' },
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
    const parity = ((diff % 2) + 2) % 2; // 0 = misma paridad que la semana ancla (semana B)
    const isWeekB = parity === 0;

    return {
        belsy: BELSY,
        josefa: JOSEFA,
        taahirah: TAAHIRAH,
        eloisa: { ...ELOISA_BASE, Tuesday: isWeekB ? ELOISA_TUE_B : ELOISA_TUE_A },
        paz: { ...PAZ_BASE, Tuesday: isWeekB ? PAZ_TUE_B : PAZ_TUE_A },
    };
}

export function calcHours(s?: Shift): number {
    if (!s) return 0;
    const [sh, sm] = s.start.split(':').map(Number);
    const [eh, em] = s.end.split(':').map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
}
