"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useMotherPageHeader } from "@/components/layout/mother-dashboard-header-context";
import {
    Activity,
    CalendarDays,
    Check,
    Droplets,
    MoreHorizontal,
    MoreVertical,
    Pill,
    Plus,
    RefreshCw,
    Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
    computeNextDueIso,
    formatDueTime,
    recurrenceLabel,
    type CareReminderCategory,
    type CareReminderRecurrence,
} from "@/lib/care-reminders";
import { MotherReminderDrawer } from "@/components/dashboard/care/mother-reminder-drawer";

type ReminderJoin = {
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

export type CareEventListRow = {
    event: {
        id: string;
        due_at: string;
        status: "pending" | "completed" | "missed";
        completed_at: string | null;
    };
    reminder: ReminderJoin;
};

type TabId = "active" | "done" | "missed";

function categoryIcon(category: CareReminderCategory): typeof Pill {
    switch (category) {
        case "hydration":
            return Droplets;
        case "movement":
            return Activity;
        case "appointment":
            return CalendarDays;
        case "vitamin":
            return Sparkles;
        case "other":
            return MoreHorizontal;
        case "medication":
        default:
            return Pill;
    }
}

export function MotherCarePageContent() {
    const router = useRouter();
    const { setPageHeader } = useMotherPageHeader();
    const [tab, setTab] = useState<TabId>("active");
    const [rows, setRows] = useState<CareEventListRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [showDrawer, setShowDrawer] = useState(false);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [completingId, setCompletingId] = useState<string | null>(null);

    const loadRows = useCallback(async (uid: string) => {
        const statusMap: Record<TabId, "pending" | "completed" | "missed"> = {
            active: "pending",
            done: "completed",
            missed: "missed",
        };
        const status = statusMap[tab];

        const { data, error } = await supabase
            .from("care_reminder_events")
            .select(
                `
        id,
        due_at,
        status,
        completed_at,
        reminder_id,
        care_reminders (
          id,
          title,
          category,
          instructions,
          recurrence,
          reminder_time,
          start_date,
          end_date,
          is_active,
          mother_user_id
        )
      `
            )
            .eq("status", status)
            .order("due_at", { ascending: tab === "active" });

        if (error) {
            console.error(error);
            setRows([]);
            return;
        }

        const list: CareEventListRow[] = [];
        for (const raw of data ?? []) {
            const r = raw as unknown as {
                id: string;
                due_at: string;
                status: "pending" | "completed" | "missed";
                completed_at: string | null;
                reminder_id: string;
                care_reminders: (ReminderJoin & { mother_user_id: string }) | (ReminderJoin & { mother_user_id: string })[] | null;
            };
            const remRaw = r.care_reminders;
            const rem = Array.isArray(remRaw) ? remRaw[0] : remRaw;
            if (!rem || rem.mother_user_id !== uid || !rem.is_active) continue;
            list.push({
                event: {
                    id: r.id,
                    due_at: r.due_at,
                    status: r.status,
                    completed_at: r.completed_at,
                },
                reminder: {
                    id: rem.id,
                    title: rem.title,
                    category: rem.category,
                    instructions: rem.instructions,
                    recurrence: rem.recurrence,
                    reminder_time: rem.reminder_time,
                    start_date: rem.start_date,
                    end_date: rem.end_date,
                    is_active: rem.is_active,
                },
            });
        }

        if (tab === "done") {
            list.sort((a, b) => new Date(b.event.due_at).getTime() - new Date(a.event.due_at).getTime());
        }
        if (tab === "missed") {
            list.sort((a, b) => new Date(b.event.due_at).getTime() - new Date(a.event.due_at).getTime());
        }

        setRows(list);
    }, [tab]);

    useEffect(() => {
        let active = true;
        void (async () => {
            const { data, error } = await supabase.auth.getUser();
            if (!active) return;
            if (error || !data.user) {
                router.replace("/auth/sign-in");
                return;
            }
            setUserId(data.user.id);
        })();
        return () => {
            active = false;
        };
    }, [router]);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        void (async () => {
            setLoading(true);
            await loadRows(userId);
            if (!cancelled) setLoading(false);
        })();
        return () => {
            cancelled = true;
        };
    }, [userId, tab, loadRows]);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (t.closest?.("[data-care-kebab]")) return;
            setMenuOpenId(null);
        };
        document.addEventListener("click", onDoc);
        return () => document.removeEventListener("click", onDoc);
    }, []);

    useEffect(() => {
        setPageHeader({
            title: "Care plan",
            layout: "standard",
            showNotifications: false,
            showSettings: false,
            trailing: (
                <button
                    type="button"
                    className="inline-flex size-10 items-center justify-center rounded-xl border-0 bg-transparent text-brand transition-colors hover:bg-[#eef5f5] lg:size-11"
                    aria-label="Add reminder"
                    onClick={() => setShowDrawer(true)}
                >
                    <Plus size={22} strokeWidth={2.25} />
                </button>
            ),
        });
        return () => setPageHeader(null);
    }, [setPageHeader]);

    const onToggleComplete = async (row: CareEventListRow) => {
        if (tab !== "active" || completingId) return;
        setCompletingId(row.event.id);
        const nowIso = new Date().toISOString();
        const { error: uErr } = await supabase
            .from("care_reminder_events")
            .update({ status: "completed", completed_at: nowIso })
            .eq("id", row.event.id)
            .eq("status", "pending");

        if (uErr) {
            setCompletingId(null);
            alert(uErr.message);
            return;
        }

        const next = computeNextDueIso(row.event.due_at, row.reminder.recurrence);
        if (next && row.reminder.is_active) {
            if (row.reminder.end_date) {
                const end = new Date(`${row.reminder.end_date}T23:59:59`);
                if (new Date(next).getTime() > end.getTime()) {
                    if (userId) await loadRows(userId);
                    setCompletingId(null);
                    return;
                }
            }
            const { error: iErr } = await supabase.from("care_reminder_events").insert({
                reminder_id: row.reminder.id,
                due_at: next,
                status: "pending",
            });
            if (iErr) console.error(iErr);
        }

        if (userId) await loadRows(userId);
        setCompletingId(null);
    };

    const tabs: { id: TabId; label: string }[] = [
        { id: "active", label: "Active" },
        { id: "done", label: "Done" },
        { id: "missed", label: "Missed" },
    ];

    return (
        <div className="relative mx-auto w-full max-w-[520px] pb-28 lg:max-w-[760px]">
            <div
                className="mb-5 flex rounded-xl bg-shell-sidebar p-1.5 shadow-[inset_0_1px_2px_rgba(26,44,52,0.05)]"
                role="tablist"
                aria-label="Reminder status"
            >
                {tabs.map(({ id, label }) => {
                    const selected = tab === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            className={`min-h-10 flex-1 rounded-[10px] text-[0.82rem] font-extrabold transition-colors ${selected ? "bg-white text-[#2a3340] shadow-sm" : "text-[#6a7486]"
                                }`}
                            onClick={() => setTab(id)}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <p className="py-10 text-center text-[0.92rem] text-muted">Loading reminders…</p>
            ) : rows.length === 0 ? (
                <div className="rounded-2xl border border-[#e8ecee] bg-white px-4 py-10 text-center shadow-[0_4px_18px_rgba(35,55,65,0.04)]">
                    <p className="m-0 text-[0.95rem] font-semibold text-[#3d4a5c]">
                        {tab === "active"
                            ? "No active reminders"
                            : tab === "done"
                                ? "Nothing completed yet"
                                : "No missed reminders"}
                    </p>
                    <p className="mb-0 mt-2 text-[0.86rem] text-muted">
                        {tab === "active"
                            ? "Tap + to add vitamins, hydration, movement, and more."
                            : "Completed and missed tasks will appear here."}
                    </p>
                </div>
            ) : (
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {rows.map((row) => {
                        const Icon = categoryIcon(row.reminder.category);
                        const menuOpen = menuOpenId === row.event.id;
                        return (
                            <li
                                key={row.event.id}
                                className="relative rounded-2xl border border-[#e8ecee] bg-white px-3.5 py-3 shadow-[0_4px_18px_rgba(35,55,65,0.06)]"
                            >
                                <div className="flex items-stretch gap-2.5">
                                    <Link
                                        href={`/dashboard/mother/care/reminders/${row.reminder.id}`}
                                        className="flex min-w-0 flex-1 items-start gap-3 rounded-xl py-0.5 no-underline outline-none ring-brand focus-visible:ring-2"
                                    >
                                        <span className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-full bg-[#eaf6f5] text-brand">
                                            <Icon size={20} strokeWidth={2} aria-hidden />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <span className="block text-[0.95rem] font-extrabold leading-snug text-ink">
                                                {row.reminder.title}
                                            </span>
                                            <span className="mt-0.5 block text-[0.8rem] font-semibold text-[#5c6a7a]">
                                                {formatDueTime(row.event.due_at)}
                                            </span>
                                            <span className="mt-1 inline-flex items-center gap-1 text-[0.72rem] font-bold uppercase tracking-wide text-[#8b96a8]">
                                                <RefreshCw size={12} aria-hidden />
                                                {recurrenceLabel(row.reminder.recurrence)}
                                            </span>
                                        </div>
                                    </Link>
                                    <div className="flex shrink-0 flex-col items-end justify-between gap-1">
                                        {tab === "active" ? (
                                            <button
                                                type="button"
                                                className={`grid size-11 shrink-0 place-items-center rounded-xl border-2 transition-colors ${completingId === row.event.id
                                                    ? "border-[#dce3e8] bg-[#f4f7f8] text-muted"
                                                    : "border-[#dce8e6] bg-white text-brand hover:border-brand"
                                                    }`}
                                                aria-label={`Mark ${row.reminder.title} done`}
                                                disabled={completingId === row.event.id}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    void onToggleComplete(row);
                                                }}
                                            >
                                                <Check size={20} strokeWidth={2.5} />
                                            </button>
                                        ) : (
                                            <span
                                                className={`grid size-11 place-items-center rounded-xl text-[0.65rem] font-extrabold uppercase ${tab === "done"
                                                    ? "bg-[#e8f6f5] text-[#1f6b5c]"
                                                    : "bg-[#fce8f0] text-[#9b3d60]"
                                                    }`}
                                            >
                                                {tab === "done" ? "Done" : "Missed"}
                                            </span>
                                        )}
                                        <div className="relative">
                                            <button
                                                type="button"
                                                data-care-kebab
                                                className="inline-flex size-9 items-center justify-center rounded-lg text-[#6a7486] hover:bg-[#f0f3f5]"
                                                aria-label="Reminder actions"
                                                aria-expanded={menuOpen}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setMenuOpenId((id) => (id === row.event.id ? null : row.event.id));
                                                }}
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                            {menuOpen ? (
                                                <div
                                                    data-care-kebab
                                                    className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-xl border border-[#e3eaed] bg-white py-1 shadow-[0_8px_24px_rgba(26,44,52,0.12)]"
                                                >
                                                    <Link
                                                        href={`/dashboard/mother/care/new?edit=${row.reminder.id}`}
                                                        className="block px-4 py-2.5 text-[0.88rem] font-bold text-[#2a3340] no-underline hover:bg-[#f4f7f8]"
                                                        onClick={() => setMenuOpenId(null)}
                                                    >
                                                        Edit reminder
                                                    </Link>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <p className="mx-0 mt-8 text-center text-[0.88rem] italic leading-relaxed text-[#8b96a8]">
                &ldquo;Taking care of yourself is part of taking care of your baby.&rdquo;
            </p>

            {showDrawer ? (
                <MotherReminderDrawer
                    onClose={() => setShowDrawer(false)}
                    onSaved={() => {
                        if (userId) void loadRows(userId);
                    }}
                />
            ) : null}
        </div>
    );
}
