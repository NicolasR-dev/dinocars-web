'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Send } from 'lucide-react';
import api from '@/lib/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
        output[i] = rawData.charCodeAt(i);
    }
    return output;
}

type Status = 'unsupported' | 'checking' | 'off' | 'on' | 'denied';

export default function PushNotifications({ isAdmin }: { isAdmin?: boolean }) {
    const [status, setStatus] = useState<Status>('checking');
    const [busy, setBusy] = useState(false);
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        const check = async () => {
            if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
                setStatus('unsupported');
                return;
            }
            if (Notification.permission === 'denied') {
                setStatus('denied');
                return;
            }
            try {
                const reg = await navigator.serviceWorker.register('/sw.js');
                const existing = await reg.pushManager.getSubscription();
                setStatus(existing ? 'on' : 'off');
            } catch {
                setStatus('off');
            }
        };
        check();
    }, []);

    const handleEnable = async () => {
        setBusy(true);
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setStatus('denied');
                return;
            }

            const reg = await navigator.serviceWorker.register('/sw.js');
            const { data } = await api.get('/push/vapid-public-key');
            if (!data.key) {
                alert('El servidor todavía no tiene configuradas las notificaciones push.');
                return;
            }

            const subscription = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(data.key),
            });

            const json = subscription.toJSON();
            await api.post('/push/subscribe', {
                endpoint: json.endpoint,
                keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
            });

            setStatus('on');
        } catch (e) {
            console.error(e);
            alert('No se pudo activar las notificaciones.');
        } finally {
            setBusy(false);
        }
    };

    const handleDisable = async () => {
        setBusy(true);
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            const subscription = await reg?.pushManager.getSubscription();
            if (subscription) {
                const json = subscription.toJSON();
                await api.post('/push/unsubscribe', { endpoint: json.endpoint, keys: json.keys });
                await subscription.unsubscribe();
            }
            setStatus('off');
        } catch (e) {
            console.error(e);
        } finally {
            setBusy(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            await api.post('/push/test');
            alert('Notificaciones de prueba enviadas a todas las suscripciones activas.');
        } catch (e) {
            console.error(e);
            alert('No se pudo enviar la prueba (revisa que VAPID_PRIVATE_KEY esté configurada en el backend).');
        } finally {
            setTesting(false);
        }
    };

    if (status === 'unsupported' || status === 'checking') return null;

    if (status === 'denied') {
        return (
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <BellOff className="w-3.5 h-3.5" />
                Notificaciones bloqueadas (actívalas en los ajustes de tu navegador)
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={status === 'on' ? handleDisable : handleEnable}
                disabled={busy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${status === 'on'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                    }`}
            >
                {status === 'on' ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{status === 'on' ? 'Notificaciones activadas' : 'Activar notificaciones'}</span>
            </button>

            {isAdmin && status === 'on' && (
                <button
                    onClick={handleTest}
                    disabled={testing}
                    title="Enviar ambas notificaciones ahora mismo, sin esperar a las 22:00/16:00"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors"
                >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Probar ahora</span>
                </button>
            )}
        </div>
    );
}
