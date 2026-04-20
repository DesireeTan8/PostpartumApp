import webpush from "web-push";

let configured = false;

function ensureVapidConfigured() {
    if (configured) return;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) {
        throw new Error(
            "Missing VAPID keys. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT (e.g. you@domain.com). Generate keys with: npx web-push generate-vapid-keys"
        );
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
}

export type StoredPushSubscription = {
    endpoint: string;
    p256dh: string;
    auth_key: string;
};

export function sendWebPush(sub: StoredPushSubscription, payload: { title: string; body: string; url?: string }) {
    ensureVapidConfigured();
    const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
            p256dh: sub.p256dh,
            auth: sub.auth_key,
        },
    };
    const body = JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/dashboard/mother/care",
    });
    return webpush.sendNotification(pushSubscription, body, {
        TTL: 60 * 60,
        urgency: "normal",
    });
}