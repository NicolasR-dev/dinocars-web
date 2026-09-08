import os
import json
from datetime import date, timedelta
from calendar import monthrange

from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session

from . import models, schedule_rules

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_CLAIM_EMAIL = os.getenv("VAPID_CLAIM_EMAIL", "mailto:admin@dinocars.local")

# Meta mensual fija. La notificación de las 16:00 solo comunica el % de avance,
# nunca el monto de la meta ni el total acumulado (pedido explícito del negocio).
MONTHLY_GOAL = 6_000_000


def _send(subscription: models.PushSubscription, payload: dict) -> bool:
    """Devuelve False si la suscripción está muerta (debe borrarse)."""
    if not VAPID_PRIVATE_KEY:
        print("WARNING: VAPID_PRIVATE_KEY no configurada, no se puede enviar push.")
        return True
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIM_EMAIL},
        )
        return True
    except WebPushException as e:
        status = e.response.status_code if e.response is not None else None
        print(f"Push failed ({status}) for endpoint {subscription.endpoint[:60]}...: {e}")
        # 404/410 = la suscripción ya no existe en el navegador (desinstaló, expiró, etc.)
        return status not in (404, 410)


def _prune_dead_subscriptions(db: Session, dead_ids: list):
    if not dead_ids:
        return
    db.query(models.PushSubscription).filter(models.PushSubscription.id.in_(dead_ids)).delete(synchronize_session=False)
    db.commit()


def notify_tomorrow_shifts(db: Session):
    tomorrow = date.today() + timedelta(days=1)
    subscriptions = db.query(models.PushSubscription).join(models.User).all()
    dead_ids = []

    for sub in subscriptions:
        worker_key = schedule_rules.match_worker_key(sub.user.username)
        if not worker_key:
            continue

        shift = schedule_rules.get_shift_for_date(worker_key, tomorrow)
        if shift:
            body = f"Mañana entras a las {shift['start']} (hasta las {shift['end']})."
        else:
            body = "Mañana no trabajas, ¡a descansar!"

        payload = {
            "title": "🦕 DinoCars — Tu turno de mañana",
            "body": body,
            "tag": "tomorrow-shift",
        }
        if not _send(sub, payload):
            dead_ids.append(sub.id)

    _prune_dead_subscriptions(db, dead_ids)


def notify_cash_closed(db: Session, record: models.DailyRecord):
    """Avisa a los usuarios con rol 'owner' cada vez que se cierra una caja."""
    total = record.daily_cash_generated or 0.0
    rides = record.rides_today or 0

    payload = {
        "title": "💰 Caja cerrada",
        "body": f"Total del día: ${total:,.0f} — Vueltas: {rides}".replace(",", "."),
        "tag": "cash-closed",
    }

    subscriptions = (
        db.query(models.PushSubscription)
        .join(models.User)
        .filter(models.User.role == "owner")
        .all()
    )
    dead_ids = [sub.id for sub in subscriptions if not _send(sub, payload)]
    _prune_dead_subscriptions(db, dead_ids)


def notify_monthly_goal(db: Session):
    today = date.today()
    month_prefix = today.strftime("%Y-%m")
    days_in_month = monthrange(today.year, today.month)[1]
    days_left = days_in_month - today.day

    records = db.query(models.DailyRecord).filter(models.DailyRecord.date.like(f"{month_prefix}%")).all()
    total = sum(r.daily_cash_generated or 0.0 for r in records)
    pct = min(999, round((total / MONTHLY_GOAL) * 100)) if MONTHLY_GOAL else 0

    if days_left <= 0:
        days_text = "¡Último día del mes!"
    elif days_left == 1:
        days_text = "Queda 1 día para fin de mes."
    else:
        days_text = f"Quedan {days_left} días para fin de mes."

    payload = {
        "title": "📊 DinoCars — Meta mensual",
        "body": f"Vamos en el {pct}% de la meta de este mes. {days_text}",
        "tag": "monthly-goal",
    }

    subscriptions = db.query(models.PushSubscription).all()
    dead_ids = [sub.id for sub in subscriptions if not _send(sub, payload)]
    _prune_dead_subscriptions(db, dead_ids)
