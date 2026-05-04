import type { SupabaseClient } from "@supabase/supabase-js";
import { isPermanentWebPushError, sendWebPush, type StoredPushSubscription } from "@/lib/push/web-push-server";

type CareReminderDispatchEvent = {
    id: string;
    reminder_id: string;
    due_at: string;
    care_reminders: {
        id: string;
        title: string;
        mother_user_id: string;
    }[] | {
        id: string;
        title: string;
        mother_user_id: string;
    } | null;
};

type PushSubscriptionRow = StoredPushSubscription & {
    id: string;
    user_id: string;
};

export type CareReminderDispatchResult = {
    scanned: number;
    sent: number;
    markedSentEvents: number;
    noSubscription: number;
    removedSubscriptions: number;
    retriableFailures: number;
};

function normalizeReminder(
    raw: CareReminderDispatchEvent["care_reminders"]
): { id: string; title: string; mother_user_id: string } | null {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] ?? null;
    return raw;
}

function reminderPushBody(title: string): string {
    return `Reminder due now: ${title}`;
}

export async function dispatchDueCareReminderPushes(params: {
    admin: SupabaseClient;
    batchSize?: number;
    lookbackHours?: number;
}): Promise<CareReminderDispatchResult> {
    const admin = params.admin;
    const batchSize = Math.max(1, Math.min(500, params.batchSize ?? 100));
    const lookbackHours = Math.max(1, Math.min(72, params.lookbackHours ?? 6));

    const now = new Date();
    const lookback = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000);

    const { data: eventRows, error: eventError } = await admin
        .from("care_reminder_events")
        .select("id, reminder_id, due_at, care_reminders!inner(id, title, mother_user_id)")
        .eq("status", "pending")
        .is("push_sent_at", null)
        .lte("due_at", now.toISOString())
        .gte("due_at", lookback.toISOString())
        .order("due_at", { ascending: true })
        .limit(batchSize);

    if (eventError) {
        throw new Error(`Could not load due reminder events: ${eventError.message}`);
    }

    const events = (eventRows ?? []) as CareReminderDispatchEvent[];
    if (!events.length) {
        return {
            scanned: 0,
            sent: 0,
            markedSentEvents: 0,
            noSubscription: 0,
            removedSubscriptions: 0,
            retriableFailures: 0,
        };
    }

    const userIds = Array.from(
        new Set(
            events
                .map((e) => normalizeReminder(e.care_reminders)?.mother_user_id ?? null)
                .filter((v): v is string => Boolean(v))
        )
    );

    const { data: subRows, error: subError } = await admin
        .from("push_subscriptions")
        .select("id, user_id, endpoint, p256dh, auth_key")
        .in("user_id", userIds);

    if (subError) {
        throw new Error(`Could not load push subscriptions: ${subError.message}`);
    }

    const subscriptions = (subRows ?? []) as PushSubscriptionRow[];
    const subscriptionsByUser = new Map<string, PushSubscriptionRow[]>();
    for (const sub of subscriptions) {
        const bucket = subscriptionsByUser.get(sub.user_id) ?? [];
        bucket.push(sub);
        subscriptionsByUser.set(sub.user_id, bucket);
    }

    let sent = 0;
    let noSubscription = 0;
    let retriableFailures = 0;
    const eventIdsToMarkSent: string[] = [];
    const subscriptionIdsToDelete = new Set<string>();

    for (const event of events) {
        const reminder = normalizeReminder(event.care_reminders);
        if (!reminder) continue;

        const userSubs = subscriptionsByUser.get(reminder.mother_user_id) ?? [];
        if (!userSubs.length) {
            noSubscription++;
            continue;
        }

        let eventSuccess = 0;
        let permanentFailures = 0;
        let temporaryFailures = 0;

        await Promise.all(
            userSubs.map(async (sub) => {
                try {
                    await sendWebPush(
                        {
                            endpoint: sub.endpoint,
                            p256dh: sub.p256dh,
                            auth_key: sub.auth_key,
                        },
                        {
                            title: "Care Reminder",
                            body: reminderPushBody(reminder.title),
                            url: `/dashboard/mother/care/reminders/${reminder.id}`,
                        }
                    );
                    eventSuccess++;
                    sent++;
                } catch (error) {
                    if (isPermanentWebPushError(error)) {
                        permanentFailures++;
                        subscriptionIdsToDelete.add(sub.id);
                        return;
                    }
                    temporaryFailures++;
                    retriableFailures++;
                }
            })
        );

        // Mark dispatched when at least one endpoint received the push,
        // or when all endpoints are permanently invalid (removed).
        if (eventSuccess > 0 || (permanentFailures > 0 && temporaryFailures === 0)) {
            eventIdsToMarkSent.push(event.id);
        }
    }

    if (eventIdsToMarkSent.length > 0) {
        const { error: markError } = await admin
            .from("care_reminder_events")
            .update({ push_sent_at: now.toISOString() })
            .in("id", eventIdsToMarkSent)
            .is("push_sent_at", null);
        if (markError) {
            throw new Error(`Could not mark reminder events as dispatched: ${markError.message}`);
        }
    }

    const idsToDelete = Array.from(subscriptionIdsToDelete);
    if (idsToDelete.length > 0) {
        const { error: deleteSubError } = await admin
            .from("push_subscriptions")
            .delete()
            .in("id", idsToDelete);
        if (deleteSubError) {
            throw new Error(`Could not prune invalid push subscriptions: ${deleteSubError.message}`);
        }
    }

    return {
        scanned: events.length,
        sent,
        markedSentEvents: eventIdsToMarkSent.length,
        noSubscription,
        removedSubscriptions: idsToDelete.length,
        retriableFailures,
    };
}