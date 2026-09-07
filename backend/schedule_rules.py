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
    "Wednesday": _shift("14:00", "20:00"),
    "Saturday": _shift("10:00", "17:30"),
    "Sunday": _shift("13:00", "20:00"),
}

PATTERN_E = {
    "Monday": _shift("10:00", "14:00"),
    "Tuesday": _shift("15:00", "20:00"),
    "Wednesday": _shift("10:00", "14:00"),
    "Thursday": _shift("15:00", "20:00"),
    "Friday": _shift("10:00", "14:00"),
}

PATTERN_T = {
    "Monday": _shift("14:00", "20:00"),
    "Tuesday": _shift("10:00", "15:00"),
    "Thursday": _shift("10:00", "15:00"),
    "Friday": _shift("14:00", "20:00"),
}

# Semana ancla: la semana que empieza el lunes 7 de septiembre de 2026,
# donde Eloisa hace PATTERN_T y Taahirah hace PATTERN_E. Se alterna cada semana desde ahí.
ANCHOR_MONDAY = date(2026, 9, 7)

WORKER_NAMES = {
    "belsy": "Belsy",
    "josefa": "Josefa",
    "eloisa": "Eloisa",
    "taahirah": "Taahirah",
}


def get_monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


def get_week_schedule(monday: date) -> dict:
    diff_weeks = round((monday - ANCHOR_MONDAY).days / 7)
    parity = diff_weeks % 2
    eloisa_pattern = PATTERN_T if parity == 0 else PATTERN_E
    taahirah_pattern = PATTERN_E if parity == 0 else PATTERN_T
    return {
        "belsy": BELSY,
        "josefa": JOSEFA,
        "eloisa": eloisa_pattern,
        "taahirah": taahirah_pattern,
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
    return get_week_schedule(monday)[worker_key].get(weekday_key)
