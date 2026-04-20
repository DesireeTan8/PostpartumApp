export type CareReminderCategory =
    | "medication"
    | "hydration"
    | "movement"
    | "appointment"
    | "vitamin"
    | "other";

export type CareReminderRecurrence = "once" | "daily" | "weekly" | "monthly";

export type CareReminderRow = {
    id: string;
    mother_user_id: string;
    category: CareReminderCategory;
    title: string;
    instructions: string | null;
    reminder_time: string;
    start_date: string;
    end_date: string | null;
    recurrence: CareReminderRecurrence;
    is_active: boolean;
};

export type CareReminderEventRow = {
    id: string;
    reminder_id: string;
    due_at: string;
    status: "pending" | "completed" | "missed";
    completed_at: string | null;
};

export function pad2(n: number): string {
    return String(n).padStart(2, "0");
}

/** Parse Postgres `time` or `HH:MM` into hours and minutes. */
export function parseTimeParts(time: string): { h: number; m: number } {
    const parts = time.split(":");
    const h = parseInt(parts[0] ?? "0", 10);
    const m = parseInt(parts[1] ?? "0", 10);
    return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
}

/** `dateStr` YYYY-MM-DD, `timeStr` from DB time or input time */
export function localTimestampIso(dateStr: string, timeStr: string): string {
    const { h, m } = parseTimeParts(timeStr);
    const [y, mo, d] = dateStr.split("-").map((x) => parseInt(x, 10));
    if (![y, mo, d].every((n) => Number.isFinite(n)))
        return new Date().toISOString();
    const dt = new Date(y, mo - 1, d, h, m, 0, 0);
    return dt.toISOString();
}

export function formatDueTime(iso: string): string {
    return new Date(iso)
        .toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
        .toUpperCase();
}

export function formatShortDate(isoOrDate: string): string {
    const d = new Date(
        isoOrDate.includes("T") ? isoOrDate : `${isoOrDate}T12:00:00`,
    );
    return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

export function recurrenceLabel(r: CareReminderRecurrence): string {
    switch (r) {
        case "once":
            return "One time";
        case "daily":
            return "Daily";
        case "weekly":
            return "Weekly";
        case "monthly":
            return "Monthly";
        default:
            return r;
    }
}

export function computeNextDueIso(
    fromDueIso: string,
    recurrence: CareReminderRecurrence,
): string | null {
    if (recurrence === "once") return null;
    const d = new Date(fromDueIso);
    if (recurrence === "daily") d.setDate(d.getDate() + 1);
    else if (recurrence === "weekly") d.setDate(d.getDate() + 7);
    else if (recurrence === "monthly") d.setMonth(d.getMonth() + 1);
    return d.toISOString();
}

/** First pending occurrence: start_date at reminder_time; roll forward if recurring and in the past. */
export function firstEventDueIso(params: {
    startDate: string;
    reminderTime: string;
    recurrence: CareReminderRecurrence;
    now?: Date;
}): string {
    const now = params.now ?? new Date();
    const due = localTimestampIso(params.startDate, params.reminderTime);
    if (params.recurrence === "once") return due;

    let d = new Date(due);
    const safety = 400;
    let i = 0;
    while (d.getTime() < now.getTime() - 60_000 && i < safety) {
        const next = computeNextDueIso(d.toISOString(), params.recurrence);
        if (!next) break;
        d = new Date(next);
        i++;
    }
    return d.toISOString();
}