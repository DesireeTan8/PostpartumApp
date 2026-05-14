"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Activity,
    CalendarDays,
    ChevronRight,
    ClipboardList,
    FileText,
    LayoutGrid,
    MessageCircle,
    Plus,
    Stethoscope,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
    fetchLinkedMothers,
    postpartumDayLabel,
    type LinkedMother,
} from "@/lib/caregiver/linked-mothers";
import { CaregiverCareRequestsContent } from "@/components/dashboard/caregiver/caregiver-care-requests";
import { CaregiverNoLinkedMothersPanel } from "@/components/dashboard/caregiver/caregiver-no-linked-mothers-panel";

type AppointmentRow = {
    id: string;
    mother_user_id: string;
    starts_at: string;
    ends_at: string;
    status: string;
    location_type: string;
    location_detail: string | null;
};

type TaskRow = {
    id: string;
    mother_user_id: string;
    title: string;
    category: string;
    due_at: string | null;
    status: string;
    priority: string | null;
};

type HealthLogRow = {
    recorded_at: string;
    sleep_quality: string | null;
    sleep_hours: number | null;
    mood_score: number | null;
    mood_label: string | null;
};

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function locationLabel(a: AppointmentRow) {
    const t = a.location_type === "home" ? "Home visit" : a.location_type === "virtual" ? "Virtual" : "Clinic";
    return a.location_detail ? `${t} · ${a.location_detail}` : t;
}

export function CaregiverDashboardHome() {
    const [mothers, setMothers] = useState<LinkedMother[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [appts, setAppts] = useState<AppointmentRow[]>([]);
    const [tasks, setTasks] = useState<TaskRow[]>([]);
    const [health, setHealth] = useState<HealthLogRow | null>(null);
    const [loading, setLoading] = useState(true);

    const selected = useMemo(
        () => mothers.find((m) => m.motherUserId === selectedId) ?? mothers[0] ?? null,
        [mothers, selectedId]
    );

    const load = useCallback(async () => {
        setLoading(true);
        const { mothers: ms } = await fetchLinkedMothers(supabase);
        setMothers(ms);
        if (ms.length && !selectedId) setSelectedId(ms[0].motherUserId);
        const motherIds = ms.map((m) => m.motherUserId);
        if (motherIds.length === 0) {
            setAppts([]);
            setTasks([]);
            setHealth(null);
            setLoading(false);
            return;
        }

        const sel = selectedId ?? ms[0]?.motherUserId ?? motherIds[0];

        const [{ data: apData }, tRes, { data: hData }] = await Promise.all([
            supabase
                .from("appointments")
                .select("id, mother_user_id, starts_at, ends_at, status, location_type, location_detail")
                .in("mother_user_id", motherIds)
                .gte("starts_at", new Date().toISOString())
                .order("starts_at", { ascending: true })
                .limit(8),
            supabase
                .from("care_tasks")
                .select("id, mother_user_id, title, category, due_at, status, priority")
                .in("mother_user_id", motherIds)
                .eq("status", "pending")
                .order("due_at", { ascending: true })
                .limit(12),
            supabase
                .from("health_logs")
                .select("recorded_at, sleep_quality, sleep_hours, mood_score, mood_label")
                .eq("mother_user_id", sel)
                .order("recorded_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
        ]);

        let taskRows = (tRes.data ?? []) as TaskRow[];
        if (tRes.error) {
            const { data: t2 } = await supabase
                .from("care_tasks")
                .select("id, mother_user_id, title, category, due_at, status")
                .in("mother_user_id", motherIds)
                .eq("status", "pending")
                .order("due_at", { ascending: true })
                .limit(12);
            taskRows = (t2 ?? []) as TaskRow[];
        }

        setAppts((apData ?? []) as AppointmentRow[]);
        setTasks(taskRows);
        setHealth(hData as HealthLogRow | null);
        setLoading(false);
    }, [selectedId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
        void load();
    }, [load]);

    useEffect(() => {
        if (!selected?.motherUserId) return;
        let cancelled = false;
        (async () => {
            const { data } = await supabase
                .from("health_logs")
                .select("recorded_at, sleep_quality, sleep_hours, mood_score, mood_label")
                .eq("mother_user_id", selected.motherUserId)
                .order("recorded_at", { ascending: false })
                .limit(1)
                .maybeSingle();
            if (!cancelled) setHealth(data as HealthLogRow | null);
        })();
        return () => {
            cancelled = true;
        };
    }, [selected?.motherUserId]);

    const nextAppt = appts[0] ?? null;
    const upcomingTwo = appts.slice(0, 2);
    const todayTasks = tasks.slice(0, 2);
    const ppLabel = postpartumDayLabel(selected?.deliveryDate ?? null);

    const hasMothers = mothers.length > 0;
    const restPct = health?.sleep_hours != null ? Math.min(100, (Number(health.sleep_hours) / 10) * 100) : 38;
    const moodPct = health?.mood_score != null ? Math.min(100, (health.mood_score / 10) * 100) : 72;

    if (loading && !hasMothers) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
                <div className="mb-6 h-7 w-40 animate-pulse rounded-lg bg-[#e8ecee]" />
                <div className="mb-6 flex gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="size-14 shrink-0 animate-pulse rounded-full bg-[#e8ecee]" />
                    ))}
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="h-64 animate-pulse rounded-2xl bg-[#e8ecee]" />
                    <div className="h-64 animate-pulse rounded-2xl bg-[#e8ecee]" />
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#e8ecee]" />
                    ))}
                </div>
                <p className="mt-8 text-center text-sm text-muted">Loading dashboard…</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
            {/* Mobile: quick header row */}
            <div className="mb-6 flex items-center justify-between md:hidden">
                <h2 className="m-0 text-lg font-extrabold text-ink">Caregiver</h2>
                <Link href="/dashboard/caregiver/patients" className="text-sm font-bold text-brand no-underline">
                    All patients
                </Link>
            </div>

            {/* Linked mothers */}
            <section className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="m-0 flex items-center gap-2 text-[0.8rem] font-extrabold uppercase tracking-wide text-muted">
                        <LayoutGrid className="size-4 text-brand opacity-80" aria-hidden />
                        Linked mothers
                    </h3>
                    <Link href="/dashboard/caregiver/support-plan" className="text-sm font-bold text-brand no-underline">
                        Manage plan
                    </Link>
                </div>
                {hasMothers ? (
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {mothers.map((m) => {
                            const active = m.motherUserId === selected?.motherUserId;
                            return (
                                <button
                                    key={m.motherUserId}
                                    type="button"
                                    onClick={() => setSelectedId(m.motherUserId)}
                                    className="flex shrink-0 flex-col items-center gap-2 border-0 bg-transparent p-0"
                                >
                                    <span
                                        className={
                                            "grid size-14 place-items-center overflow-hidden rounded-full text-sm font-extrabold " +
                                            (active ? "ring-[3px] ring-brand ring-offset-2" : "ring-1 ring-line")
                                        }
                                    >
                                        {m.avatarUrl ? (
                                            <img src={m.avatarUrl} alt="" className="size-full object-cover" />
                                        ) : (
                                            <span className="bg-brand/15 text-brand">{m.displayName.slice(0, 1)}</span>
                                        )}
                                    </span>
                                    <span className={"max-w-[88px] truncate text-xs font-bold " + (active ? "text-brand" : "text-muted")}>
                                        {m.displayName.split(" ")[0]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <CaregiverNoLinkedMothersPanel
                        layout="compact"
                        hint="Ask her to add you to her care team, or set a supported mother on your profile. The sections below stay in preview until someone is linked."
                    />
                )}
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Daily health summary */}
                <div className="rounded-2xl border border-line bg-white p-5 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Activity className="size-5 text-brand" />
                        <h3 className="m-0 text-base font-extrabold text-ink">Daily health summary</h3>
                        {health?.recorded_at ? (
                            <span className="text-xs text-muted">
                                Last updated{" "}
                                {new Date(health.recorded_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                            </span>
                        ) : null}
                        <span className="ml-auto rounded-full bg-brand/15 px-2.5 py-0.5 text-[0.65rem] font-extrabold text-brand">
                            Normal
                        </span>
                    </div>
                    {ppLabel ? (
                        <p className="mb-4 text-lg font-semibold italic text-ink">
                            {ppLabel}: {health?.mood_label ? `Mood — ${health.mood_label}` : "Recovery on track"}
                        </p>
                    ) : (
                        <p className="mb-4 text-lg font-semibold italic text-muted">Select check-ins from the mother app to see trends.</p>
                    )}
                    <div className="space-y-4">
                        <div>
                            <div className="mb-1 flex justify-between text-[0.7rem] font-bold uppercase tracking-wide text-muted">
                                <span>Rest quality</span>
                                <span>{health?.sleep_quality ?? "—"}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[#eceff2]">
                                <div className="h-full rounded-full bg-[#4b5563]" style={{ width: `${restPct}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="mb-1 flex justify-between text-[0.7rem] font-bold uppercase tracking-wide text-muted">
                                <span>Mood / wellbeing</span>
                                <span>{health?.mood_score != null ? `${health.mood_score}/10` : "—"}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[#eceff2]">
                                <div className="h-full rounded-full bg-brand" style={{ width: `${moodPct}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Next visit + mobile card */}
                <div className="space-y-4">
                    {nextAppt ? (
                        <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 to-white p-5 shadow-sm">
                            <p className="m-0 text-[0.7rem] font-extrabold uppercase tracking-wide text-muted">Next visit</p>
                            <p className="mt-1 text-lg font-extrabold text-ink">
                                {mothers.find((x) => x.motherUserId === nextAppt.mother_user_id)?.displayName ?? "Mother"}
                            </p>
                            <p className="mt-1 text-sm text-muted">
                                {formatTime(nextAppt.starts_at)} – {formatTime(nextAppt.ends_at)}
                            </p>
                            <p className="mt-1 text-sm text-muted">{locationLabel(nextAppt)}</p>
                            <Link
                                href="/dashboard/caregiver/appointments"
                                className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-white no-underline"
                            >
                                View details
                            </Link>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-line bg-white p-5 text-sm text-muted shadow-sm">
                            No upcoming appointments in the next few days.
                        </div>
                    )}

                    {/* Quick actions — mobile grid */}
                    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm md:hidden">
                        <p className="m-0 mb-3 text-[0.75rem] font-extrabold uppercase text-muted">Quick actions</p>
                        <div className="grid grid-cols-2 gap-3">
                            <Link
                                href="/dashboard/caregiver/notes/new"
                                className="flex flex-col items-center gap-2 rounded-xl border border-line bg-[#f8fafc] py-4 text-center no-underline"
                            >
                                <Plus className="size-6 text-[#3b82f6]" />
                                <span className="text-xs font-bold text-ink">Add note</span>
                            </Link>
                            <Link
                                href="/dashboard/caregiver/tasks/new"
                                className="flex flex-col items-center gap-2 rounded-xl border border-line bg-[#f8fafc] py-4 text-center no-underline"
                            >
                                <ClipboardList className="size-6 text-[#8b5cf6]" />
                                <span className="text-xs font-bold text-ink">Add task</span>
                            </Link>
                            <Link
                                href={
                                    selected?.motherUserId
                                        ? `/dashboard/caregiver/vitals?mother=${selected.motherUserId}`
                                        : "/dashboard/caregiver/vitals"
                                }
                                className="flex flex-col items-center gap-2 rounded-xl border border-line bg-[#f8fafc] py-4 text-center no-underline"
                            >
                                <Stethoscope className="size-6 text-brand" />
                                <span className="text-xs font-bold text-ink">Log vitals</span>
                            </Link>
                            <Link
                                href="/dashboard/caregiver/appointments"
                                className="flex flex-col items-center gap-2 rounded-xl border border-line bg-[#f8fafc] py-4 text-center no-underline"
                            >
                                <CalendarDays className="size-6 text-[#f97316]" />
                                <span className="text-xs font-bold text-ink">Plan visit</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop quick actions row */}
            <section className="mt-8 hidden md:block">
                <h3 className="mb-3 text-[0.8rem] font-extrabold uppercase tracking-wide text-muted">Quick actions</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Link
                        href="/dashboard/caregiver/notes/new"
                        className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 no-underline shadow-sm transition-shadow hover:shadow-md"
                    >
                        <span className="grid size-11 place-items-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                            <FileText className="size-5" />
                        </span>
                        <div>
                            <p className="m-0 font-extrabold text-ink">Add note</p>
                            <p className="m-0 text-xs text-muted">Record observation</p>
                        </div>
                    </Link>
                    <Link
                        href="/dashboard/caregiver/tasks/new"
                        className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 no-underline shadow-sm transition-shadow hover:shadow-md"
                    >
                        <span className="grid size-11 place-items-center rounded-xl bg-[#f5f3ff] text-[#7c3aed]">
                            <ClipboardList className="size-5" />
                        </span>
                        <div>
                            <p className="m-0 font-extrabold text-ink">Add task</p>
                            <p className="m-0 text-xs text-muted">New care item</p>
                        </div>
                    </Link>
                    <Link
                        href="/dashboard/caregiver/appointments"
                        className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 no-underline shadow-sm transition-shadow hover:shadow-md"
                    >
                        <span className="grid size-11 place-items-center rounded-xl bg-[#fff7ed] text-[#ea580c]">
                            <CalendarDays className="size-5" />
                        </span>
                        <div>
                            <p className="m-0 font-extrabold text-ink">Plan visit</p>
                            <p className="m-0 text-xs text-muted">Schedule support</p>
                        </div>
                    </Link>
                    <Link
                        href="/dashboard/caregiver/chat"
                        className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 no-underline shadow-sm transition-shadow hover:shadow-md"
                    >
                        <span className="grid size-11 place-items-center rounded-xl bg-[#ecfdf5] text-[#059669]">
                            <MessageCircle className="size-5" />
                        </span>
                        <div>
                            <p className="m-0 font-extrabold text-ink">Ask chat</p>
                            <p className="m-0 text-xs text-muted">AI assistance</p>
                        </div>
                    </Link>
                </div>
            </section>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="m-0 text-base font-extrabold text-ink">Upcoming appointments</h3>
                        <Link href="/dashboard/caregiver/appointments" className="text-sm font-bold text-brand no-underline">
                            View all
                        </Link>
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-3 p-0">
                        {upcomingTwo.length === 0 ? (
                            <li className="rounded-2xl border border-line bg-white p-4 text-sm text-muted shadow-sm">None scheduled.</li>
                        ) : (
                            upcomingTwo.map((a) => (
                                <li key={a.id}>
                                    <Link
                                        href="/dashboard/caregiver/appointments"
                                        className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white px-4 py-3 no-underline shadow-sm"
                                    >
                                        <div>
                                            <p className="m-0 text-sm font-extrabold text-ink">{formatTime(a.starts_at)}</p>
                                            <p className="m-0 text-xs text-muted">{locationLabel(a)}</p>
                                        </div>
                                        <ChevronRight className="size-5 shrink-0 text-[#b8c2cc]" />
                                    </Link>
                                </li>
                            ))
                        )}
                    </ul>
                </section>

                <section>
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="m-0 text-base font-extrabold text-ink">Today&apos;s tasks</h3>
                        <Link href="/dashboard/caregiver/tasks" className="text-sm font-bold text-brand no-underline">
                            Go to tasks
                        </Link>
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-3 p-0">
                        {todayTasks.length === 0 ? (
                            <li className="rounded-2xl border border-line bg-white p-4 text-sm text-muted shadow-sm">No open tasks.</li>
                        ) : (
                            todayTasks.map((t) => (
                                <li key={t.id}>
                                    <Link
                                        href={`/dashboard/caregiver/tasks/${t.id}`}
                                        className="flex items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3 no-underline shadow-sm"
                                    >
                                        <span className="mt-1 size-4 shrink-0 rounded border border-line" />
                                        <div className="min-w-0 flex-1">
                                            <p className="m-0 font-bold text-ink">{t.title}</p>
                                            <p className="m-0 mt-1 text-xs text-muted">
                                                <span className="rounded-md bg-[#f0f3f5] px-1.5 py-0.5 font-semibold capitalize">{t.category}</span>
                                                {t.due_at ? ` · Due ${formatTime(t.due_at)}` : ""}
                                            </p>
                                        </div>
                                    </Link>
                                </li>
                            ))
                        )}
                    </ul>
                </section>
            </div>

            <section id="care-requests" className="mt-12 border-t border-line pt-10">
                <CaregiverCareRequestsContent />
            </section>
        </div>
    );
}
