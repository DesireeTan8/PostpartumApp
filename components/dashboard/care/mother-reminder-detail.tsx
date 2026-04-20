"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
    AlertCircle,
    Check,
    ChevronRight,
    Clock,
    Pencil,
    Trash2,
    Trophy,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useMotherPageHeader } from "@/components/layout/mother-dashboard-header-context";
import { MOTHER_DASHBOARD_HEADER_ICON_LINK } from "@/components/layout/mother-dashboard-header-chrome";
import {
    computeNextDueIso,
    formatDueTime,
    formatShortDate,
    localTimestampIso,
    recurrenceLabel,
    type CareReminderRecurrence,
    type CareReminderCategory,
} from "@/lib/care-reminders";

type ReminderDetail = {
    id: string;
    title: string;
    category: CareReminderCategory;
    instructions: string | null;
    recurrence: CareReminderRecurrence;
    reminder_time: string;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
};

type EventRow = {
    id: string;
    due_at: string;
    status: "pending" | "completed" | "missed";
    completed_at: string | null;
};

function categoryTagLabel(c: CareReminderCategory): string {
    switch (c) {
        case "medication":
            return "Medication";
        case "vitamin":
            return "Vitamin";
        case "hydration":
            return "Hydration";
        case "movement":
            return "Movement";
        case "appointment":
            return "Appointment";
        default:
            return "Care";
    }
}

function localDayKey(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function complianceAndStreak(events: EventRow[]): { compliance: number; streak: number } {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    const recent = events.filter((e) => new Date(e.due_at) >= cutoff);
    const settled = recent.filter((e) => e.status === "completed" || e.status === "missed");
    const done = settled.filter((e) => e.status === "completed").length;
    const missed = settled.filter((e) => e.status === "missed").length;
    const denom = done + missed;
    const compliance = denom === 0 ? 0 : Math.round((100 * done) / denom);

    const completedDays = new Set(
        events.filter((e) => e.status === "completed" && e.completed_at).map((e) => localDayKey(e.completed_at!))
    );
    let streak = 0;
    for (let i = 0; i < 60; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (completedDays.has(key)) streak++;
        else break;
    }

    return { compliance, streak };
}

type Props = { reminderId: string };

export function MotherReminderDetail({ reminderId }: Props) {
    const router = useRouter();
    const { setPageHeader } = useMotherPageHeader();
    const [userId, setUserId] = useState<string | null>(null);
    const [reminder, setReminder] = useState<ReminderDetail | null>(null);
    const [events, setEvents] = useState<EventRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionBusy, setActionBusy] = useState(false);

    const load = useCallback(async () => {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id ?? null;
        if (!uid) {
            router.replace("/auth/sign-in");
            return;
        }
        setUserId(uid);

        const { data: rem, error: rErr } = await supabase
            .from("care_reminders")
            .select("id, title, category, instructions, recurrence, reminder_time, start_date, end_date, is_active")
            .eq("id", reminderId)
            .eq("mother_user_id", uid)
            .maybeSingle();

        if (rErr || !rem) {
            setReminder(null);
            setEvents([]);
            setLoading(false);
            return;
        }

        setReminder(rem as ReminderDetail);

        const { data: evs, error: eErr } = await supabase
            .from("care_reminder_events")
            .select("id, due_at, status, completed_at")
            .eq("reminder_id", reminderId)
            .order("due_at", { ascending: false })
            .limit(80);

        if (eErr) {
            setEvents([]);
        } else {
            setEvents((evs ?? []) as EventRow[]);
        }
        setLoading(false);
    }, [reminderId, router]);

    useEffect(() => {
        void load();
    }, [load]);

    const onDelete = useCallback(async () => {
        if (!userId || !reminder) return;
        if (!confirm("Delete this reminder and all history? This cannot be undone.")) return;
        setActionBusy(true);
        const { error } = await supabase.from("care_reminders").delete().eq("id", reminder.id).eq("mother_user_id", userId);
        setActionBusy(false);
        if (error) {
            alert(error.message);
            return;
        }
        router.replace("/dashboard/mother/care");
    }, [userId, reminder, router]);

    useEffect(() => {
        if (loading || !reminder) return;
        setPageHeader({
            title: "Reminder info",
            layout: "detail",
            backHref: "/dashboard/mother/care",
            backLabel: "Back to care plan",
            trailing: (
                <button
                    type="button"
                    className={`${MOTHER_DASHBOARD_HEADER_ICON_LINK} text-[#d24a4a] hover:text-[#b83838]`}
                    aria-label="Delete reminder"
                    disabled={actionBusy}
                    onClick={() => void onDelete()}
                >
                    <Trash2 size={20} />
                </button>
            ),
        });
        return () => setPageHeader(null);
    }, [loading, reminder, actionBusy, onDelete, setPageHeader]);

    const nextPending = events.find((e) => e.status === "pending");
    const { compliance, streak } = complianceAndStreak(events);

    const onMarkDone = async () => {
        if (!userId || !reminder || !nextPending || actionBusy) return;
        setActionBusy(true);
        const nowIso = new Date().toISOString();
        const { error: uErr } = await supabase
            .from("care_reminder_events")
            .update({ status: "completed", completed_at: nowIso })
            .eq("id", nextPending.id)
            .eq("status", "pending");

        if (uErr) {
            setActionBusy(false);
            alert(uErr.message);
            return;
        }

        const next = computeNextDueIso(nextPending.due_at, reminder.recurrence);
        if (next && reminder.is_active) {
            if (reminder.end_date) {
                const end = new Date(`${reminder.end_date}T23:59:59`);
                if (new Date(next).getTime() <= end.getTime()) {
                    await supabase.from("care_reminder_events").insert({
                        reminder_id: reminder.id,
                        due_at: next,
                        status: "pending",
                    });
                }
            } else {
                await supabase.from("care_reminder_events").insert({
                    reminder_id: reminder.id,
                    due_at: next,
                    status: "pending",
                });
            }
        }

        await load();
        setActionBusy(false);
    };

    if (loading) {
        return <p className="py-12 text-center text-sm text-muted">Loading…</p>;
    }

    if (!reminder) {
        return (
            <div className="mx-auto max-w-[520px] py-10 text-center">
                <p className="text-[0.95rem] text-muted">This reminder could not be found.</p>
                <Link href="/dashboard/mother/care" className="mt-4 inline-block font-bold text-brand no-underline">
                    Back to Care Plan
                </Link>
            </div>
        );
    }

    const dueLine = nextPending
        ? `Due at ${formatDueTime(nextPending.due_at)}`
        : `Scheduled ${formatDueTime(localTimestampIso(reminder.start_date, reminder.reminder_time))}`;

    return (
        <div className="mx-auto w-full max-w-[520px] pb-28">
            <article className="mb-5 overflow-hidden rounded-2xl border border-[#e8ecee] bg-white shadow-[0_4px_18px_rgba(35,55,65,0.06)]">
                <div className="h-1.5 bg-brand" aria-hidden />
                <div className="px-4 pb-4 pt-3.5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#e8f6f5] px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-wide text-[#1f5c59]">
                            {categoryTagLabel(reminder.category)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[0.78rem] font-bold text-[#5c6a7a]">
                            <Clock size={14} aria-hidden />
                            {dueLine}
                        </span>
                    </div>
                    <h2 className="m-0 text-[1.15rem] font-extrabold leading-snug text-ink">{reminder.title}</h2>
                    <p className="mb-4 mt-2 text-[0.88rem] leading-relaxed text-muted">
                        {reminder.instructions?.trim()
                            ? reminder.instructions.trim()
                            : "Stay consistent with this habit — small steps add up to better recovery and wellbeing."}
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl bg-[#f4f7f8] px-3 py-2.5">
                            <p className="m-0 text-[0.65rem] font-extrabold uppercase tracking-wide text-[#8b96a8]">Frequency</p>
                            <p className="mb-0 mt-1 text-[0.82rem] font-bold text-[#2a3340]">{recurrenceLabel(reminder.recurrence)}</p>
                        </div>
                        <div className="rounded-xl bg-[#f4f7f8] px-3 py-2.5">
                            <p className="m-0 text-[0.65rem] font-extrabold uppercase tracking-wide text-[#8b96a8]">Start date</p>
                            <p className="mb-0 mt-1 text-[0.82rem] font-bold text-[#2a3340]">{formatShortDate(reminder.start_date)}</p>
                        </div>
                    </div>
                </div>
            </article>

            {reminder.instructions?.trim() ? (
                <section className="mb-5">
                    <h3 className="mb-2 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-[#8b96a8]">Instructions</h3>
                    <div className="rounded-2xl border border-[#d7ebe9] bg-[#e8f6f5] px-3.5 py-3 text-[0.88rem] leading-relaxed text-[#1f4f4d]">
                        {reminder.instructions.trim()}
                    </div>
                </section>
            ) : null}

            <div className="mb-5 rounded-2xl border border-[#f5d4dc] bg-[#fceef2] px-4 py-3.5">
                <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-white/80 text-[#c77d2a] shadow-sm">
                        <Trophy size={22} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="m-0 text-[0.95rem] font-extrabold text-[#7a2840]">
                            {streak > 0 ? `${streak} day streak!` : "Build your streak"}
                        </p>
                        <p className="mb-0 mt-0.5 text-[0.78rem] font-bold uppercase tracking-wide text-[#9b4d60]">
                            {compliance}% compliance (30 days)
                        </p>
                    </div>
                </div>
            </div>

            <section className="mb-6">
                <h3 className="mb-2.5 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-[#8b96a8]">
                    Recent activity
                </h3>
                <ul className="m-0 flex list-none flex-col gap-0 overflow-hidden rounded-2xl border border-[#e8ecee] bg-white p-0 shadow-[0_4px_18px_rgba(35,55,65,0.04)]">
                    {events.slice(0, 12).map((e, idx) => {
                        const isDone = e.status === "completed";
                        const isMissed = e.status === "missed";
                        const label = isDone
                            ? `Taken at ${e.completed_at ? formatDueTime(e.completed_at) : formatDueTime(e.due_at)}`
                            : isMissed
                                ? "Missed"
                                : "Pending";
                        return (
                            <li
                                key={e.id}
                                className={`flex items-center gap-3 border-[#f0f3f5] px-3.5 py-3 ${idx > 0 ? "border-t" : ""}`}
                            >
                                {isDone ? (
                                    <Check className="shrink-0 text-[#1f6b5c]" size={18} aria-hidden />
                                ) : isMissed ? (
                                    <AlertCircle className="shrink-0 text-[#c53030]" size={18} aria-hidden />
                                ) : (
                                    <Clock className="shrink-0 text-[#8b96a8]" size={18} aria-hidden />
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 text-[0.72rem] font-extrabold uppercase tracking-wide text-[#8b96a8]">
                                        {formatShortDate(e.due_at)}
                                    </p>
                                    <p className="mb-0 mt-0.5 text-[0.86rem] font-semibold text-[#2a3340]">{label}</p>
                                </div>
                                <ChevronRight className="shrink-0 text-[#c5cdd4]" size={18} aria-hidden />
                            </li>
                        );
                    })}
                </ul>
            </section>

            {nextPending ? (
                <button
                    type="button"
                    className="mb-3 flex h-[52px] w-full items-center justify-center rounded-xl border-0 bg-brand text-[0.95rem] font-bold text-white disabled:opacity-60"
                    disabled={actionBusy}
                    onClick={() => void onMarkDone()}
                >
                    Mark as Done
                </button>
            ) : null}

            <Link
                href={`/dashboard/mother/care/new?edit=${reminder.id}`}
                className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#e8a4b8] bg-white text-[0.95rem] font-bold text-[#9b3d60] no-underline"
            >
                <Pencil size={18} aria-hidden />
                Edit Reminder
            </Link>
        </div>
    );
}
