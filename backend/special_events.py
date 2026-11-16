"""
Eventos especiales del equipo DinoCars: cumpleaños, amigo secreto y aniversario.
Espejo en Python de frontend/lib/specialEvents.ts — mantener ambos sincronizados.
"""
from datetime import date

# Debe coincidir con WORKER_BIRTHDAYS en frontend/lib/specialEvents.ts
WORKER_BIRTHDAYS = {
    "Josefa": (7, 13),
    "Eloisa": (3, 10),
    "Taahirah": (1, 22),
    "Paz": (7, 19),
}

SPECIAL_EVENTS = [
    *[
        {"key": f"birthday-{name.lower()}", "title": f"Cumpleaños de {name}", "month": m, "day": d, "recurring": True}
        for name, (m, d) in WORKER_BIRTHDAYS.items()
    ],
    {
        "key": "amigo-secreto",
        "title": "🎄 Amigo Secreto 🎅",
        "month": 12,
        "day": 19,
        "recurring": False,
        "year": 2026,
    },
    {
        "key": "aniversario",
        "title": "Aniversario DinoCars",
        "month": 8,
        "day": 30,
        "recurring": True,
    },
]


def _next_occurrence(event: dict, today: date) -> date:
    if not event["recurring"] and event.get("year"):
        return date(event["year"], event["month"], event["day"])

    year = today.year
    candidate = date(year, event["month"], event["day"])
    if candidate < today:
        candidate = date(year + 1, event["month"], event["day"])
    return candidate


def get_nearest_event(today: date):
    """Devuelve (evento, fecha_proxima, dias_restantes) para el evento especial más cercano."""
    occurrences = sorted(
        ((_next_occurrence(e, today), e) for e in SPECIAL_EVENTS),
        key=lambda pair: pair[0],
    )
    nearest_date, nearest_event = occurrences[0]
    return nearest_event, nearest_date, (nearest_date - today).days
