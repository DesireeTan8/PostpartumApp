"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Send } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { isWebPushSupported, urlBase64ToUint8Array } from "@/lib/push/web-push-client";

const cardClass =
    "mb-3.5 rounded-2xl border border-[#c9e4dc] bg-white px-4 pb-[18px] pt-4 shadow-[0_4px_16px_rgba(40,90,80,0.06)]";
const cardTitleClass = "m-0 mb-3 flex items-center gap-2 text-[0.95rem] font-extrabold text-[#2a6b66]";

export function MotherPushNotificationsCard() {
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
    const [supported, setSupported] = useState<boolean | null>(null);
    const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
    const [subscribedLocal, setSubscribedLocal] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const refreshLocalState = useCallback(async () => {
        if (!isWebPushSupported()) {
            setSupported(false);
            setPermission("unsupported");
            setSubscribedLocal(false);
            return;
        }
        setSupported(true);
        setPermission(Notification.permission);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            setSubscribedLocal(Boolean(sub));
        } catch {
            setSubscribedLocal(false);
        }
    }, []);

    useEffect(() => {
        void refreshLocalState();
    }, [refreshLocalState]);

    const enablePush = async () => {
        setMessage(null);
        if (!vapidPublic) {
            setMessage("Push is not configured on this server (missing NEXT_PUBLIC_VAPID_PUBLIC_KEY).");
            return;
        }
        if (!isWebPushSupported()) {
            setMessage("This browser does not support web push, or the site is not served over HTTPS.");
            return;
        }

        setBusy(true);
        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== "granted") {
                setMessage("Notifications were blocked. You can enable them in browser settings.");
                setBusy(false);
                return;
            }

            const reg = await navigator.serviceWorker.ready;
            let sub = await reg.pushManager.getSubscription();
            if (!sub) {
                sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidPublic) as BufferSource,
                });
            }

            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setMessage("You need to be signed in.");
                setBusy(false);
                return;
            }

            const res = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    subscription: sub.toJSON(),
                    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
                }),
            });

            if (!res.ok) {
                const j = (await res.json().catch(() => ({}))) as { error?: string };
                setMessage(j.error ?? `Could not save subscription (${res.status})`);
                setBusy(false);
                return;
            }

            setSubscribedLocal(true);
            setMessage(null);
        } catch (e) {
            setMessage(e instanceof Error ? e.message : "Could not enable notifications.");
        } finally {
            setBusy(false);
        }
    };

    const disablePush = async () => {
        setMessage(null);
        setBusy(true);
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            const {
                data: { session },
            } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (sub && token) {
                const endpoint = encodeURIComponent(sub.endpoint);
                await fetch(`/api/push/subscribe?endpoint=${endpoint}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                });
            }
            await sub?.unsubscribe();
            setSubscribedLocal(false);
        } catch (e) {
            setMessage(e instanceof Error ? e.message : "Could not turn off notifications.");
        } finally {
            setBusy(false);
        }
    };

    const sendTest = async () => {
        setMessage(null);
        setBusy(true);
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setMessage("You need to be signed in.");
                return;
            }
            const res = await fetch("/api/push/test", {
                method: "POST",
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            const j = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
            if (!res.ok) {
                setMessage(j.error ?? "Test send failed.");
                return;
            }
            setMessage("Test sent. Check your device notifications.");
        } catch (e) {
            setMessage(e instanceof Error ? e.message : "Test send failed.");
        } finally {
            setBusy(false);
        }
    };

    if (supported === false || permission === "unsupported") {
        return (
            <section className={cardClass}>
                <h3 className={cardTitleClass}>
                    <Bell size={18} /> Reminder notifications
                </h3>
                <p className="mb-0 text-[0.88rem] leading-snug text-muted">
                    Web push isn’t available in this browser or context. Use a recent version of Chrome, Edge, Firefox, or Safari
                    (iOS 16.4+), install or open the app over HTTPS, and on iPhone add this app to your Home Screen first.
                </p>
            </section>
        );
    }

    const canEnable = permission !== "denied" && vapidPublic;

    return (
        <section className={cardClass}>
            <h3 className={cardTitleClass}>
                <Bell size={18} /> Reminder notifications
            </h3>
            <p className="mb-3 text-[0.88rem] leading-snug text-muted">
                Get system notifications for care reminders when this app is installed or open in the browser. Works best on
                Android and desktop; on iPhone, add Postpartum Pathways to your Home Screen, then enable here.
            </p>

            {!vapidPublic ? (
                <p className="mb-0 text-[0.82rem] font-semibold text-[#b45309]">
                    Push isn’t configured yet: add VAPID keys to the deployment environment (see project setup).
                </p>
            ) : permission === "denied" ? (
                <p className="mb-0 text-[0.88rem] text-muted">
                    Notifications are blocked for this site. Open browser settings and allow notifications for this origin, then
                    try again.
                </p>
            ) : subscribedLocal && permission === "granted" ? (
                <div className="flex flex-col gap-2.5">
                    <p className="m-0 text-[0.88rem] font-semibold text-[#1f6b5c]">Notifications are on for this device.</p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            disabled={busy}
                            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[11px] border border-brand bg-transparent px-3 text-[0.88rem] font-bold text-brand disabled:opacity-50 min-[400px]:flex-none"
                            onClick={() => void sendTest()}
                        >
                            <Send size={16} aria-hidden />
                            Send test
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[11px] border border-[#e2e9eb] bg-[#f8fafb] px-3 text-[0.88rem] font-bold text-[#5c6a7a] disabled:opacity-50 min-[400px]:flex-none"
                            onClick={() => void disablePush()}
                        >
                            <BellOff size={16} aria-hidden />
                            Turn off
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    disabled={busy || !canEnable}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-[11px] border-0 bg-brand text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:bg-brand-disabled"
                    onClick={() => void enablePush()}
                >
                    <Bell size={18} aria-hidden />
                    {busy ? "Working…" : "Enable reminder notifications"}
                </button>
            )}

            {message ? <p className="mb-0 mt-3 text-[0.82rem] text-[#4a5568]">{message}</p> : null}
        </section>
    );
}
