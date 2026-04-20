"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    CalendarClock,
    Clock,
    Droplets,
    MessageCircle,
    Pill,
    Plus,
    Smile,
    Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Profile = { full_name: string | null; avatar_url: string | null };
type HealthLog = {
    id: string;
    recorded_at: string;
    mood_score: number | null;
    mood_label: string | null;
    pain_level: number | null;
    bleeding_level: string | null;
};
type MoodPoint = { label: string; value: number | null };
type UpcomingItem = {
    id: string;
    dueAt: Date;
    title: string;
    category: string;
    kind: "reminder" | "self";
};
type TomorrowAppt = {
    id: string;
    starts_at: string;
    location_detail: string | null;
    providerName: string;
    profession: string | null;
};

function firstName(fullName: string | null | undefined): string {
    if (!fullName?.trim()) return "there";
    return fullName.trim().split(/\s+/)[0] ?? "there";
}

function initials(name: string | null | undefined): string {
    if (!name?.trim()) return "?";
    const p = name.trim().split(/\s+/);
    const a = p[0]?.[0] ?? "";
    const b = p.length > 1 ? p[p.length - 1][0] : "";
    return (a + b).toUpperCase();
}

function formatLoggedAgo(iso: string): string {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const m = Math.floor(diffMs / 60000);
    if (m < 2) return "Logged just now";
    if (m < 60) return `Logged ${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Logged ${h}h ago`;
    const days = Math.floor(h / 24);
    return `Logged ${days}d ago`;
}

function moodStatusLabel(log: HealthLog | null): string {
    if (!log) return "No log yet";
    if (log.mood_label?.trim()) return log.mood_label.trim();
    if (log.mood_score != null) {
        if (log.mood_score >= 8) return "Calm";
        if (log.mood_score >= 5) return "Steady";
        return "Low energy";
    }
    return "Logged";
}

function formatBleeding(level: string | null | undefined): string {
    if (!level) return "—";
    return level.charAt(0).toUpperCase() + level.slice(1);
}

function startEndOfLocalDay(d: Date): { start: Date; end: Date } {
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}


export function MotherHomeDashboard() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [latestLog, setLatestLog] = useState<HealthLog | null>(null);
    const [moodSeries, setMoodSeries] = useState<MoodPoint[]>([]);
    const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
    const [tomorrowAppt, setTomorrowAppt] = useState<TomorrowAppt | null>(null);

    const name = firstName(profile?.full_name);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user || cancelled) {
                return;
            }

            const { data: prof } = await supabase
                .from("profiles")
                .select("full_name, avatar_url")
                .eq("user_id", user.id)
                .maybeSingle();

            const { data: logs } = await supabase
                .from("health_logs")
                .select("id, recorded_at, mood_score, mood_label, pain_level, bleeding_level")
                .eq("mother_user_id", user.id)
                .order("recorded_at", { ascending: false })
                .limit(200);

            const latest = logs?.[0] ?? null;
            if (cancelled) return;
            setProfile(prof as Profile);
            setLatestLog(latest);

            const dayKeys: string[] = [];
            const shortLabels: string[] = [];
            const now = new Date();
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now);
                d.setDate(d.getDate() - i);
                dayKeys.push(d.toDateString());
                shortLabels.push(d.toLocaleDateString(undefined, { weekday: "short" }));
            }

            const bestByDay = new Map<string, { score: number; time: number }>();
            for (const row of logs ?? []) {
                if (row.mood_score == null) continue;
                const dt = new Date(row.recorded_at);
                const key = dt.toDateString();
                const t = dt.getTime();
                const prev = bestByDay.get(key);
                if (!prev || t > prev.time) {
                    bestByDay.set(key, { score: row.mood_score, time: t });
                }
            }

            const series: MoodPoint[] = dayKeys.map((key, idx) => {
                const v = bestByDay.get(key);
                return { label: shortLabels[idx] ?? "", value: v ? v.score : null };
            });
            setMoodSeries(series);

            const { data: reminders } = await supabase
                .from("care_reminders")
                .select("id, title, category, reminder_time")
                .eq("mother_user_id", user.id)
                .eq("is_active", true);

            const reminderIds = reminders?.map((r) => r.id) ?? [];
            let events: Array<{
                id: string;
                due_at: string;
                reminder_id: string;
            }> = [];

            if (reminderIds.length > 0) {
                const { data: ev } = await supabase
                    .from("care_reminder_events")
                    .select("id, due_at, reminder_id")
                    .in("reminder_id", reminderIds)
                    .eq("status", "pending");
                events = ev ?? [];
            }

            const { start: todayStart, end: todayEnd } = startEndOfLocalDay(new Date());
            const reminderMap = new Map(reminders?.map((r) => [r.id, r]) ?? []);
            const items: UpcomingItem[] = [];
            for (const e of events) {
                const due = new Date(e.due_at);
                if (due >= todayStart && due <= todayEnd) {
                    const r = reminderMap.get(e.reminder_id);
                    if (r) {
                        const cat = (r.category ?? "other").toLowerCase();
                        items.push({
                            id: e.id,
                            dueAt: due,
                            title: r.title,
                            category: r.category ?? "Care",
                            kind: cat === "medication" || cat === "vitamin" ? "reminder" : "self",
                        });
                    }
                }
            }
            items.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
            setUpcoming(items.slice(0, 4));

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const { start: tStart, end: tEnd } = startEndOfLocalDay(tomorrow);

            const { data: appt } = await supabase
                .from("appointments")
                .select(
                    `
          id,
          starts_at,
          location_detail,
          healthcare_professional_profiles (
            profession,
            profiles (full_name)
          )
        `,
                )
                .eq("mother_user_id", user.id)
                .gte("starts_at", tStart.toISOString())
                .lte("starts_at", tEnd.toISOString())
                .order("starts_at", { ascending: true })
                .limit(1)
                .maybeSingle();

            if (appt && !cancelled) {
                const hcp = appt.healthcare_professional_profiles as unknown as {
                    profession: string | null;
                    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
                } | null;
                let providerName = "Your provider";
                const profession: string | null = hcp?.profession ?? null;
                if (hcp?.profiles) {
                    const pr = Array.isArray(hcp.profiles) ? hcp.profiles[0] : hcp.profiles;
                    if (pr?.full_name) providerName = pr.full_name;
                }
                setTomorrowAppt({
                    id: appt.id,
                    starts_at: appt.starts_at,
                    location_detail: appt.location_detail,
                    providerName,
                    profession,
                });
            } else if (!cancelled) {
                setTomorrowAppt(null);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const insight = useMemo(() => {
        if (!latestLog) {
            return `Hi ${name}. Log how you're feeling today to see personalized insights here.`;
        }
        const pain = latestLog.pain_level;
        const painBit =
            pain != null && pain <= 3
                ? "Your pain levels have been steady."
                : "Keep monitoring how you feel and reach out if anything worries you.";
        return `You're doing great, ${name}. ${painBit} Remember to take your iron supplement today.`;
    }, [latestLog, name]);

    const chartPoints = useMemo(() => {
        const vals = moodSeries.map((p) => (p.value == null ? null : p.value));
        const max = 10;
        const w = 320;
        const h = 96;
        const pad = 8;
        const innerW = w - pad * 2;
        const innerH = h - pad * 2;
        const n = vals.length;
        if (n === 0) return { d: "", circles: [] as { x: number; y: number }[] };
        const coords: { x: number; y: number }[] = [];
        for (let i = 0; i < n; i++) {
            const v = vals[i];
            const x = pad + (innerW * i) / Math.max(1, n - 1);
            const y =
                v == null
                    ? pad + innerH / 2
                    : pad + innerH - (v / max) * innerH;
            coords.push({ x, y });
        }
        const d = coords
            .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
            .join(" ");
        return { d, circles: coords };
    }, [moodSeries]);

    return (
        <div className="w-full">
            <section className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <h1 className="m-0 text-[1.65rem] font-extrabold tracking-tight">Hi, {name}</h1>
                    <p className="mt-1.5 m-0 text-base text-muted">How are you feeling today?</p>
                </div>
                <div className="relative shrink-0">
                    {profile?.avatar_url ? (
                        <img
                            src={profile.avatar_url}
                            alt=""
                            className="size-14 rounded-full border-[3px] border-white object-cover shadow-[0_4px_14px_rgba(40,90,80,0.15)]"
                            width={56}
                            height={56}
                        />
                    ) : (
                        <div
                            className="grid size-14 place-items-center rounded-full border-[3px] border-white bg-gradient-to-br from-[#b8e0dd] to-brand text-[1.1rem] font-extrabold text-white shadow-[0_4px_14px_rgba(40,90,80,0.15)]"
                            aria-hidden
                        >
                            {initials(profile?.full_name)}
                        </div>
                    )}
                    <span
                        className="absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-white bg-[#3cb371]"
                        title="Online"
                    />
                </div>
            </section>

            <section className="mb-6 rounded-[20px] border border-[#b8e0dc] bg-gradient-to-br from-[#e8f6f4] to-[#dff3f0] px-[18px] pb-[18px] pt-4">
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-block rounded-full bg-brand px-3 py-1.5 text-[0.78rem] font-extrabold text-white">
                        Latest status: {moodStatusLabel(latestLog)}
                    </span>
                    <span className="text-[0.82rem] text-[#5a6b78]">
                        {latestLog ? formatLoggedAgo(latestLog.recorded_at) : "No entries yet"}
                    </span>
                </div>
                <div className="mb-3.5 grid grid-cols-3 gap-2.5">
                    <div className="rounded-[14px] bg-white/75 px-2.5 py-3 text-center">
                        <Smile className="mx-auto mb-1.5 block text-brand" size={22} aria-hidden />
                        <span className="mb-1 block text-[0.65rem] font-extrabold uppercase tracking-wider text-[#6b8a84]">
                            Mood
                        </span>
                        <span className="text-[1.05rem] font-extrabold text-[#1f3d3a]">
                            {latestLog?.mood_score != null ? `${latestLog.mood_score}/10` : "—"}
                        </span>
                    </div>
                    <div className="rounded-[14px] bg-white/75 px-2.5 py-3 text-center">
                        <Activity className="mx-auto mb-1.5 block text-brand" size={22} aria-hidden />
                        <span className="mb-1 block text-[0.65rem] font-extrabold uppercase tracking-wider text-[#6b8a84]">
                            Pain
                        </span>
                        <span className="text-[1.05rem] font-extrabold text-[#1f3d3a]">
                            {latestLog?.pain_level != null ? `${latestLog.pain_level}/10` : "—"}
                        </span>
                    </div>
                    <div className="rounded-[14px] bg-white/75 px-2.5 py-3 text-center">
                        <Droplets className="mx-auto mb-1.5 block text-brand" size={22} aria-hidden />
                        <span className="mb-1 block text-[0.65rem] font-extrabold uppercase tracking-wider text-[#6b8a84]">
                            Bleeding
                        </span>
                        <span className="text-[1.05rem] font-extrabold text-[#1f3d3a]">
                            {formatBleeding(latestLog?.bleeding_level)}
                        </span>
                    </div>
                </div>
                <p className="m-0 text-[0.92rem] italic leading-normal text-[#2f4d48]">{insight}</p>
            </section>

            <section className="mb-6">
                <h2 className="mb-3.5 mt-0 text-[0.72rem] font-extrabold uppercase tracking-widest text-[#5a6672]">
                    Quick actions
                </h2>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Link
                        href="/dashboard/mother/logs/new"
                        className="flex flex-col gap-1.5 rounded-2xl border border-[#e2e9eb] bg-white px-3.5 py-4 text-inherit no-underline transition-[box-shadow,border-color] hover:border-[#c5ddd4] hover:shadow-[0_6px_20px_rgba(45,90,80,0.08)]"
                    >
                        <Plus className="mb-1 text-brand" size={26} />
                        <span className="text-[0.95rem] font-extrabold">Add log</span>
                        <span className="text-[0.78rem] leading-snug text-muted">Record health metrics</span>
                    </Link>
                    <Link
                        href="/dashboard/mother/care"
                        className="flex flex-col gap-1.5 rounded-2xl border border-[#e2e9eb] bg-white px-3.5 py-4 text-inherit no-underline transition-[box-shadow,border-color] hover:border-[#c5ddd4] hover:shadow-[0_6px_20px_rgba(45,90,80,0.08)]"
                    >
                        <CalendarClock className="mb-1 text-[#e07d9a]" size={26} />
                        <span className="text-[0.95rem] font-extrabold">Add reminder</span>
                        <span className="text-[0.78rem] leading-snug text-muted">Set care task</span>
                    </Link>
                    <Link
                        href="/dashboard/mother/schedule"
                        className="flex flex-col gap-1.5 rounded-2xl border border-[#e2e9eb] bg-white px-3.5 py-4 text-inherit no-underline transition-[box-shadow,border-color] hover:border-[#c5ddd4] hover:shadow-[0_6px_20px_rgba(45,90,80,0.08)]"
                    >
                        <Clock className="mb-1 text-[#4a90d9]" size={26} />
                        <span className="text-[0.95rem] font-extrabold">Appointments</span>
                        <span className="text-[0.78rem] leading-snug text-muted">View and book</span>
                    </Link>
                    <Link
                        href="/dashboard/mother/ai-chat"
                        className="flex flex-col gap-1.5 rounded-2xl border border-[#e2e9eb] bg-white px-3.5 py-4 text-inherit no-underline transition-[box-shadow,border-color] hover:border-[#c5ddd4] hover:shadow-[0_6px_20px_rgba(45,90,80,0.08)]"
                    >
                        <MessageCircle className="mb-1 text-[#8b7fc7]" size={26} />
                        <span className="text-[0.95rem] font-extrabold">Ask chat</span>
                        <span className="text-[0.78rem] leading-snug text-muted">Get instant advice</span>
                    </Link>
                </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
                <section className="rounded-[20px] border border-[#e2e9eb] bg-white px-4 pb-3 pt-4">
                    <div className="mb-3.5 flex items-center justify-between gap-3">
                        <h2 className="m-0 text-[0.72rem] font-extrabold uppercase tracking-widest text-[#5a6672]">
                            7-day mood trend
                        </h2>
                        <span className="rounded-full border border-[#c5ddd4] bg-white px-2.5 py-1 text-[0.72rem] font-bold text-[#2a6b66]">
                            Recovery phase
                        </span>
                    </div>
                    <div className="w-full">
                        <svg viewBox="0 0 320 112" className="block h-auto w-full" role="img" aria-label="Mood trend last 7 days">
                            <line x1="8" y1="8" x2="312" y2="8" stroke="#e8eef0" strokeDasharray="4 4" />
                            <line x1="8" y1="56" x2="312" y2="56" stroke="#e8eef0" strokeDasharray="4 4" />
                            <line x1="8" y1="104" x2="312" y2="104" stroke="#e8eef0" strokeDasharray="4 4" />
                            {chartPoints.d ? (
                                <path
                                    d={chartPoints.d}
                                    fill="none"
                                    stroke="#4ea8a7"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            ) : null}
                            {chartPoints.circles.map((c, i) => (
                                <circle key={i} cx={c.x} cy={c.y} r="4" fill="#fff" stroke="#4ea8a7" strokeWidth="2" />
                            ))}
                        </svg>
                        <div className="flex justify-between px-1 pt-1.5 text-[0.68rem] font-semibold text-[#8a96a3]">
                            {moodSeries.map((p) => (
                                <span key={p.label}>{p.label}</span>
                            ))}
                        </div>
                    </div>
                </section>

                <section>
                    <div className="mb-3.5 flex items-center justify-between gap-3">
                        <h2 className="m-0 text-[0.72rem] font-extrabold uppercase tracking-widest text-[#5a6672]">
                            Upcoming today
                        </h2>
                        <Link href="/dashboard/mother/care" className="text-[0.85rem] font-bold text-brand no-underline">
                            View all
                        </Link>
                    </div>
                    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                        {upcoming.length === 0 ? (
                            <li className="rounded-[14px] border border-dashed border-[#c9d5d8] bg-white px-3 py-3 text-[0.9rem] text-muted">
                                Nothing scheduled for today. Add a reminder anytime.
                            </li>
                        ) : (
                            upcoming.map((item) => (
                                <li key={item.id} className="rounded-[14px] border border-[#e2e9eb] bg-white px-3.5 py-3">
                                    <div className="mb-1.5 flex items-center gap-1.5 text-[0.72rem] font-extrabold uppercase tracking-wide text-brand">
                                        <Clock size={14} aria-hidden />
                                        {item.dueAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                    </div>
                                    <p className="mb-1 mt-0 text-[0.98rem] font-extrabold">{item.title}</p>
                                    <p className="m-0 flex items-center gap-1.5 text-[0.8rem] text-muted">
                                        {item.kind === "reminder" ? (
                                            <Pill size={14} className="shrink-0 opacity-85" aria-hidden />
                                        ) : (
                                            <Sparkles size={14} className="shrink-0 opacity-85" aria-hidden />
                                        )}
                                        {item.category}
                                    </p>
                                </li>
                            ))
                        )}
                    </ul>

                    {tomorrowAppt ? (
                        <div className="mt-4 rounded-[14px] border border-[#f0c8d2] bg-gradient-to-br from-[#fdeff2] to-[#fce8ec] px-4 py-3.5">
                            <p className="mb-1.5 mt-0 text-[0.68rem] font-extrabold uppercase tracking-wide text-[#b85c6f]">
                                Tomorrow&apos;s appointment
                            </p>
                            <p className="mb-1 mt-0 text-[1.1rem] font-extrabold text-ink">
                                {new Date(tomorrowAppt.starts_at).toLocaleTimeString(undefined, {
                                    hour: "numeric",
                                    minute: "2-digit",
                                })}
                            </p>
                            <p className="m-0 text-[0.9rem] text-[#4a3d42]">
                                {tomorrowAppt.providerName}
                                {tomorrowAppt.profession ? ` · ${tomorrowAppt.profession}` : ""}
                            </p>
                            {tomorrowAppt.location_detail ? (
                                <p className="mb-0 mt-2 text-[0.82rem] text-muted">{tomorrowAppt.location_detail}</p>
                            ) : null}
                        </div>
                    ) : null}
                </section>
            </div>

            <p className="m-0 mt-2 px-2 pb-2 text-center text-[0.88rem] italic text-muted">
                Taking care of yourself is part of taking care of your baby.
            </p>
        </div>
    );
}
