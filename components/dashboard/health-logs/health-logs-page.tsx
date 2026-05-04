"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import { useRouter } from "next/navigation";
import {
    Activity,
    Calendar,
    ChevronRight,
    Droplets,
    Eye,
    Pencil,
    Plus,
    Smile,
    Frown,
    Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useHealthLogsNav } from "@/components/dashboard/health-logs/health-logs-nav-context";
import { MotherNewLogDrawer } from "@/components/dashboard/health-logs/mother-new-log-drawer";

export type HealthLogRow = {
    id: string;
    recorded_at: string;
    mood_score: number | null;
    mood_label: string | null;
    pain_level: number | null;
    bleeding_level: string | null;
    reflections: string | null;
};

function localDayKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function startOfWeekMonday(ref: Date): Date {
    const d = new Date(ref);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(12, 0, 0, 0);
    return d;
}

function formatCardDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatCardTime(iso: string): string {
    return new Date(iso)
        .toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
        .toUpperCase();
}

const badgeBase =
    "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-[0.72rem] font-extrabold tracking-wide";

function moodPresentation(log: HealthLogRow): { label: string; className: string; Icon: typeof Smile } {
    const raw = log.mood_label?.trim();
    if (raw) {
        const u = raw.toUpperCase();
        if (/tired|low|sad/i.test(raw))
            return { label: u, className: `${badgeBase} bg-[#fce8f0] text-[#9b3d60]`, Icon: Frown };
        if (/joy|great|happy/i.test(raw))
            return { label: u, className: `${badgeBase} bg-[#e0f7f4] text-[#0d6b5f]`, Icon: Smile };
        return { label: u, className: `${badgeBase} bg-[#e8f8f4] text-[#1f6b5c]`, Icon: Smile };
    }
    const s = log.mood_score;
    if (s == null) return { label: "—", className: `${badgeBase} bg-[#f0f3f5] text-[#5a6672]`, Icon: Smile };
    if (s >= 9) return { label: "JOYFUL", className: `${badgeBase} bg-[#e0f7f4] text-[#0d6b5f]`, Icon: Smile };
    if (s >= 6) return { label: "BALANCED", className: `${badgeBase} bg-[#e8f8f4] text-[#1f6b5c]`, Icon: Smile };
    if (s >= 4) return { label: "STEADY", className: `${badgeBase} bg-[#e8f8f4] text-[#1f6b5c]`, Icon: Smile };
    return { label: "TIRED", className: `${badgeBase} bg-[#fce8f0] text-[#9b3d60]`, Icon: Frown };
}

function bleedingPresentation(level: string | null): { label: string; className: string } {
    if (!level) return { label: "—", className: `${badgeBase} bg-[#f0f3f5] text-[#4a5568]` };
    const u = level.toUpperCase();
    if (level === "medium") return { label: u, className: `${badgeBase} bg-[#ffe8e0] text-[#b45309]` };
    if (level === "heavy") return { label: u, className: `${badgeBase} bg-[#fde2e4] text-[#9b1c1c]` };
    return { label: u, className: `${badgeBase} bg-[#f0f3f5] text-[#4a5568]` };
}

export function HealthLogsPageContent() {
    const router = useRouter();
    const { search, setSearch, showFilters } = useHealthLogsNav();
    const [logs, setLogs] = useState<HealthLogRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [weekCursor, setWeekCursor] = useState(() => new Date());
    /** Avoid SSR/client week strip mismatch from different `new Date()` / timezones. */
    const [weekReady, setWeekReady] = useState(false);
    const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
    const [painHigh, setPainHigh] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [showNewLogDrawer, setShowNewLogDrawer] = useState(false);
    const weekSwipeStartXRef = useRef<number | null>(null);
    const weekSwipeDeltaXRef = useRef(0);

    const loadLogs = useCallback(async (uid: string) => {
        const { data, error } = await supabase
            .from("health_logs")
            .select("id, recorded_at, mood_score, mood_label, pain_level, bleeding_level, reflections")
            .eq("mother_user_id", uid)
            .order("recorded_at", { ascending: false })
            .limit(100);

        if (error) {
            console.error(error);
            setLogs([]);
            return;
        }
        setLogs((data ?? []) as HealthLogRow[]);
    }, []);

    useEffect(() => {
        setWeekCursor(new Date());
        setWeekReady(true);
    }, []);

    useEffect(() => {
        let active = true;
        const run = async () => {
            try {
                const { data, error } = await supabase.auth.getUser();
                if (!active) return;
                if (error) {
                    console.error(error);
                    router.replace("/auth/sign-in");
                    return;
                }
                const user = data?.user ?? null;
                if (!user) {
                    router.replace("/auth/sign-in");
                    return;
                }
                setUserId(user.id);
                await loadLogs(user.id);
            } catch (e) {
                console.error(e);
                if (active) router.replace("/auth/sign-in");
            } finally {
                if (active) setLoading(false);
            }
        };
        void run();
        return () => {
            active = false;
        };
    }, [router, loadLogs]);

    const weekDays = useMemo(() => {
        const start = startOfWeekMonday(weekCursor);
        const days: { key: string; dow: string; dayNum: number }[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push({
                key: localDayKey(d),
                dow: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3).toUpperCase(),
                dayNum: d.getDate(),
            });
        }
        return days;
    }, [weekCursor]);

    const filteredLogs = useMemo(() => {
        let list = logs;
        if (selectedDayKey) {
            list = list.filter((log) => localDayKey(new Date(log.recorded_at)) === selectedDayKey);
        }
        if (painHigh) {
            list = list.filter((log) => log.pain_level != null && log.pain_level > 4);
        }
        const q = search.trim().toLowerCase();
        if (q) {
            list = list.filter((log) => {
                const ref = (log.reflections ?? "").toLowerCase();
                const ml = (log.mood_label ?? "").toLowerCase();
                return ref.includes(q) || ml.includes(q);
            });
        }
        return list;
    }, [logs, selectedDayKey, painHigh, search]);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this log entry? This cannot be undone.")) return;
        if (!userId) return;
        setDeletingId(id);
        const { error } = await supabase.from("health_logs").delete().eq("id", id).eq("mother_user_id", userId);
        setDeletingId(null);
        if (error) {
            alert(error.message);
            return;
        }
        setLogs((prev) => prev.filter((l) => l.id !== id));
    };

    const clearFilters = () => {
        setSelectedDayKey(null);
        setPainHigh(false);
        setSearch("");
    };

    const hasActiveFilters = selectedDayKey != null || painHigh || search.trim().length > 0;

    const shiftWeek = (days: number) => {
        setWeekCursor((prev) => {
            const d = new Date(prev);
            d.setDate(d.getDate() + days);
            return d;
        });
    };

    const handleWeekSwipeStart = (event: TouchEvent<HTMLDivElement>) => {
        if (!weekReady || event.touches.length !== 1) return;
        weekSwipeStartXRef.current = event.touches[0]?.clientX ?? null;
        weekSwipeDeltaXRef.current = 0;
    };

    const handleWeekSwipeMove = (event: TouchEvent<HTMLDivElement>) => {
        if (weekSwipeStartXRef.current == null || event.touches.length !== 1) return;
        const currentX = event.touches[0]?.clientX ?? weekSwipeStartXRef.current;
        weekSwipeDeltaXRef.current = currentX - weekSwipeStartXRef.current;
    };

    const handleWeekSwipeEnd = () => {
        const delta = weekSwipeDeltaXRef.current;
        if (Math.abs(delta) >= 48) {
            shiftWeek(delta < 0 ? 7 : -7);
        }
        weekSwipeStartXRef.current = null;
        weekSwipeDeltaXRef.current = 0;
    };

    const chipBase =
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#e2e9eb] bg-white px-3.5 py-2 text-[0.82rem] font-semibold text-[#4a5568] hover:border-[#c5ddd4]";
    const chipActive = "border-brand bg-[#eaf6f5] text-[#2a6b66]";

    return (
        <div className="relative mx-auto w-full max-w-[800px] pb-[120px] lg:max-w-[880px] lg:pb-12">
            <div className="-mx-4 mb-4 px-4 pt-4 lg:-mx-8 lg:px-8">
                {weekReady ? (
                    <div
                        className="flex w-full select-none items-stretch justify-between gap-2 overflow-x-auto pb-0.5 [touch-action:pan-y] [scrollbar-width:thin]"
                        role="tablist"
                        aria-label="Select day"
                        onTouchStart={handleWeekSwipeStart}
                        onTouchMove={handleWeekSwipeMove}
                        onTouchEnd={handleWeekSwipeEnd}
                        onTouchCancel={handleWeekSwipeEnd}
                    >
                        {weekDays.map((day) => {
                            const selected = selectedDayKey === day.key;
                            const isToday = day.key === localDayKey(new Date());
                            return (
                                <button
                                    key={day.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={selected}
                                    aria-current={isToday ? "date" : undefined}
                                    className={`flex min-h-[68px] min-w-11 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-3 transition-[background-color,color,box-shadow] ${selected
                                        ? "bg-brand text-white shadow-md"
                                        : isToday
                                            ? "bg-slate-100 text-slate-700"
                                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                        }`}
                                    onClick={() => setSelectedDayKey((k) => (k === day.key ? null : day.key))}
                                >
                                    <span
                                        className={`text-[0.65rem] font-bold tracking-wide ${selected ? "text-white" : ""
                                            }`}
                                    >
                                        {day.dow}
                                    </span>
                                    <span className={`text-lg font-bold tabular-nums ${selected ? "text-white" : ""}`}>
                                        {day.dayNum}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div
                        className="pointer-events-none flex w-full items-stretch justify-between gap-2 overflow-x-auto [scrollbar-width:thin]"
                        aria-busy="true"
                        aria-label="Loading calendar"
                    >
                        {Array.from({ length: 7 }, (_, i) => (
                            <div
                                key={i}
                                className="min-h-[68px] min-w-11 flex-1 rounded-xl bg-slate-50 bg-[length:200%_100%] animate-health-shimmer bg-[linear-gradient(90deg,#f1f5f9_0%,#f8fafc_50%,#f1f5f9_100%)]"
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
                <button
                    type="button"
                    className={`${chipBase} ${!hasActiveFilters ? chipActive : ""}`}
                    onClick={clearFilters}
                >
                    All logs
                </button>
                <button
                    type="button"
                    className={`${chipBase} ${painHigh ? chipActive : ""}`}
                    onClick={() => setPainHigh((p) => !p)}
                >
                    Pain: &gt; 4
                </button>
            </div>

            {showFilters ? (
                <p className="mb-4 mt-0 text-[0.85rem] leading-snug text-muted">
                    Use the week strip to focus one day, or &quot;Pain &gt; 4&quot; for higher pain entries. Search matches your
                    notes.
                </p>
            ) : null}

            <div className="mb-3 flex items-baseline justify-between">
                <span className="text-[0.68rem] font-extrabold uppercase tracking-widest text-[#7a8799]">Recent entries</span>
                <span className="text-[0.82rem] font-bold text-brand">{filteredLogs.length} total</span>
            </div>

            {loading ? (
                <p className="px-4 py-6 text-center text-muted">Loading logs…</p>
            ) : filteredLogs.length === 0 ? (
                <div className="px-4 py-6 text-center text-muted">
                    <p className="m-0">No entries match your filters yet.</p>
                    <Link
                        href="/dashboard/mother/logs/new"
                        className="mt-4 inline-block h-12 rounded-xl bg-brand px-5 text-[15px] font-bold leading-[48px] text-white no-underline"
                    >
                        Add your first log
                    </Link>
                </div>
            ) : (
                <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
                    {filteredLogs.map((log) => {
                        const mood = moodPresentation(log);
                        const MoodIcon = mood.Icon;
                        const bleed = bleedingPresentation(log.bleeding_level);
                        const isNewest = logs[0]?.id === log.id;
                        return (
                            <li
                                key={log.id}
                                className={`rounded-2xl border border-[#e8ecee] bg-white px-4 pb-3.5 pt-4 shadow-[0_4px_18px_rgba(35,55,65,0.06)] ${isNewest ? "border-[#c4b5fd] shadow-[0_4px_18px_rgba(35,55,65,0.06),0_0_0_1px_rgba(139,92,246,0.2)]" : ""
                                    }`}
                            >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                        <span className="block text-base font-extrabold text-ink">{formatCardDate(log.recorded_at)}</span>
                                        <span className="mt-0.5 block text-[0.85rem] text-muted">{formatCardTime(log.recorded_at)}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Link
                                            href={`/dashboard/mother/logs/${log.id}`}
                                            className="inline-flex size-9 items-center justify-center rounded-[10px] border-0 bg-[#f4f7f8] text-[#5c6474] no-underline hover:bg-[#eaf6f5] hover:text-brand"
                                            aria-label="View"
                                        >
                                            <Eye size={18} />
                                        </Link>
                                        <Link
                                            href={`/dashboard/mother/logs/new?edit=${log.id}`}
                                            className="inline-flex size-9 items-center justify-center rounded-[10px] border-0 bg-[#f4f7f8] text-[#5c6474] no-underline hover:bg-[#eaf6f5] hover:text-brand"
                                            aria-label="Edit"
                                        >
                                            <Pencil size={18} />
                                        </Link>
                                        <button
                                            type="button"
                                            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-[#f4f7f8] text-[#5c6474] hover:bg-[#fdeeee] hover:text-[#c53030] disabled:opacity-60"
                                            disabled={deletingId === log.id}
                                            onClick={() => handleDelete(log.id)}
                                            aria-label="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="mb-3 flex flex-wrap gap-3">
                                    <div className={`${mood.className} lg:flex-1 lg:justify-center lg:py-6`}>
                                        < MoodIcon size={16} className="shrink-0 opacity-90" aria-hidden />
                                        <span>{mood.label}</span>
                                    </div>
                                    <div className={`${badgeBase} lg:flex-1 lg:justify-center lg:py-6 bg-[#f0f3f5] text-[#3d4a5c]`}>
                                        <Activity size={16} className="shrink-0 opacity-90" aria-hidden />
                                        <span>PAIN {log.pain_level != null ? `${log.pain_level}/10` : "—"}</span>
                                    </div>
                                    <div className={`${bleed.className} lg:flex-1 lg:justify-center lg:py-6`}>
                                        <Droplets size={16} className="shrink-0 opacity-90" aria-hidden />
                                        <span>{bleed.label}</span>
                                    </div>
                                </div>
                                {
                                    log.reflections?.trim() ? (
                                        <blockquote className="m-0 mb-3 rounded-xl border-0 bg-[#f4f7f8] px-3.5 py-3 text-[0.9rem] italic leading-normal text-[#3d4d56]">
                                            &ldquo;{log.reflections.trim()}&rdquo;
                                        </blockquote>
                                    ) : null
                                }
                                <Link
                                    href={`/dashboard/mother/logs/${log.id}`}
                                    className="inline-flex items-center gap-1 text-[0.88rem] font-bold text-brand no-underline hover:underline"
                                >
                                    View details
                                    <ChevronRight size={16} aria-hidden />
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )
            }

            <p className="mx-0 my-7 mb-2 flex items-center justify-center gap-2 text-[0.82rem] text-muted lg:my-16 lg:flex-col lg:gap-2">
                <Calendar size={16} aria-hidden className="lg:size-7 lg:text-[#b8c0cc]" />
                End of recent history
            </p>

            <button
                type="button"
                className="fixed bottom-[calc(88px+env(safe-area-inset-bottom,0))] right-5 z-[35] flex size-14 cursor-pointer items-center justify-center rounded-full border-0 bg-brand text-white shadow-[0_8px_24px_rgba(46,125,120,0.35)] transition-[transform,box-shadow] hover:scale-105 hover:shadow-[0_10px_28px_rgba(46,125,120,0.4)] lg:bottom-8 lg:right-8"
                aria-label="Add new log"
                onClick={() => setShowNewLogDrawer(true)}
            >
                <Plus size={28} strokeWidth={2.5} />
            </button>

            {
                showNewLogDrawer ? (
                    <MotherNewLogDrawer
                        onClose={() => setShowNewLogDrawer(false)}
                        onSaved={() => {
                            if (userId) void loadLogs(userId);
                        }}
                    />
                ) : null
            }
        </div >
    );
}
