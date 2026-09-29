"""
Reglas fijas de horario del equipo DinoCars.
Espejo en Python de frontend/lib/scheduleRules.ts — mantener ambos sincronizados.
"""
from datetime import date, timedelta
import unicodedata

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _shift(start: str, end: str) -> dict:
    is_open = start == "10:00"
    is_close = end == "20:00"
    shift_type = "completo" if (is_open and is_close) else ("apertura" if is_open else "cierre")
    return {"start": start, "end": end, "type": shift_type}


BELSY = {
    "Saturday": _shift("10:00", "20:00"),
    "Sunday": _shift("10:00", "20:00"),
}

JOSEFA = {
    "Wednesday": _shift("13:00", "20:00"),
    "Saturday": _shift("10:00", "17:30"),
    "Sunday": _shift("12:30", "20:00"),
}

TAAHIRAH = {
    "Wednesday": _shift("10:00", "14:00"),
    "Saturday": _shift("12:00", "20:00"),
    "Sunday": _shift("10:00", "20:00"),
}

ELOISA_BASE = {
    "Monday": _shift("10:00", "15:00"),
    "Thursday": _shift("10:00", "16:00"),
    "Friday": _shift("10:00", "16:00"),
}
ELOISA_TUE_A = _shift("10:00", "15:00")  # "semana A"
ELOISA_TUE_B = _shift("15:00", "20:00")  # "semana B"

PAZ_BASE = {
    "Monday": _shift("15:00", "20:00"),
    "Thursday": _shift("15:00", "20:00"),
    "Friday": _shift("14:00", "20:00"),
}
# Semana contraria a Eloisa: cuando Eloisa hace 10-15 (semana A), Paz hace 14-20.
PAZ_TUE_A = _shift("14:00", "20:00")
PAZ_TUE_B = _shift("10:00", "16:00")

# Semana ancla: el lunes 28 de septiembre de 2026 es "semana B"
# (Eloisa martes 15:00-20:00, Paz martes 10:00-16:00). Se alterna cada semana desde ahí.
ANCHOR_MONDAY = date(2026, 9, 28)

WORKER_NAMES = {
    "belsy": "Belsy",
    "josefa": "Josefa",
    "eloisa": "Eloisa",
    "taahirah": "Taahirah",
    "paz": "Paz",
}


def get_monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


def get_week_schedule(monday: date) -> dict:
    diff_weeks = round((monday - ANCHOR_MONDAY).days / 7)
    parity = diff_weeks % 2
    is_week_b = parity == 0

    return {
        "belsy": BELSY,
        "josefa": JOSEFA,
        "taahirah": TAAHIRAH,
        "eloisa": {**ELOISA_BASE, "Tuesday": ELOISA_TUE_B if is_week_b else ELOISA_TUE_A},
        "paz": {**PAZ_BASE, "Tuesday": PAZ_TUE_B if is_week_b else PAZ_TUE_A},
    }


def normalize_name(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().strip()


def match_worker_key(username: str):
    n = normalize_name(username)
    for key in WORKER_NAMES:
        if key in n:
            return key
    return None


def get_shift_for_date(worker_key: str, d: date):
    monday = get_monday(d)
    weekday_key = WEEKDAYS[d.weekday()]
    return get_week_schedule(monday).get(worker_key, {}).get(weekday_key)
