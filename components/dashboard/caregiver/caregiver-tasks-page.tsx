"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock3, Filter, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchLinkedMothers, type LinkedMother } from "@/lib/caregiver/linked-mothers";
import { CaregiverNoLinkedMothersPanel } from "@/components/dashboard/caregiver/caregiver-no-linked-mothers-panel";

type TaskRow = {
    id: string;
    mother_user_id: string;
    title: string;
    description: string | null;
    category: string;
    due_at: string | null;
    status: string;
    priority: string | null;
};

function formatDue(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function priorityStyle(p: string | null) {
    if (p === "urgent") return "bg-[#fee2e2] text-[#b91c1c]";
    if (p === "high") return "bg-[#ffedd5] text-[#c2410c]";
    return "";
}

export function CaregiverTasksPage() {
    const router = useRouter();
    const [tab, setTab] = useState<"open" | "done">("open");
    const [mothers, setMothers] = useState<LinkedMother[]>([]);
    const [tasks, setTasks] = useState<TaskRow[]>([]);
    const [openCount, setOpenCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const { mothers: ms } = await fetchLinkedMothers(supabase);
        setMothers(ms);
        const motherIds = ms.map((m) => m.motherUserId);
        if (motherIds.length === 0) {
            setTasks([]);
            setOpenCount(0);
            setLoading(false);
            return;
        }

        const { count: pendingCount } = await supabase
            .from("care_tasks")
            .select("id", { count: "exact", head: true })
            .in("mother_user_id", motherIds)
            .eq("status", "pending");
        setOpenCount(pendingCount ?? 0);

        const statusFilter = tab === "open" ? "pending" : "completed";
        const { data, error } = await supabase
            .from("care_tasks")
            .select("id, mother_user_id, title, description, category, due_at, status, priority")
            .in("mother_user_id", motherIds)
            .eq("status", statusFilter)
            .order("due_at", { ascending: true, nullsFirst: false })
            .limit(80);

        if (error) {
            const { data: fallback } = await supabase
                .from("care_tasks")
                .select("id, mother_user_id, title, description, category, due_at, status")
                .in("mother_user_id", motherIds)
                .eq("status", statusFilter)
                .order("due_at", { ascending: true, nullsFirst: false })
                .limit(80);
            setTasks((fallback ?? []) as TaskRow[]);
        } else {
            setTasks((data ?? []) as TaskRow[]);
        }
        setLoading(false);
    }, [tab]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
        void load();
    }, [load]);

    const nameByMother = useMemo(() => {
        const m = new Map<string, string>();
        for (const mo of mothers) m.set(mo.motherUserId, mo.displayName);
        return m;
    }, [mothers]);

    if (loading && mothers.length === 0) {
        return <p className="px-6 py-16 text-center text-sm text-muted">Loading tasks…</p>;
    }

    if (mothers.length === 0) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
                <h2 className="m-0 text-xl font-extrabold text-ink">Support Tasks</h2>
                <p className="m-0 mt-1 text-sm text-muted">Manage and prioritize your caregiving responsibilities.</p>
                <CaregiverNoLinkedMothersPanel
                    className="mt-8"
                    hint="Open tasks, priorities, and reminders will show up here for each mother you support."
                />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
            <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="m-0 text-xl font-extrabold text-ink">Support Tasks</h2>
                    <p className="m-0 mt-1 text-sm text-muted">Manage and prioritize your caregiving responsibilities.</p>
                </div>
                <Link
                    href="/dashboard/caregiver/tasks/new"
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white no-underline shadow-sm"
                >
                    <Plus className="size-5" />
                    Create Task
                </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="inline-flex rounded-xl border border-line bg-white p-1 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setTab("open")}
                        className={
                            "rounded-lg px-4 py-2 text-sm font-bold " +
                            (tab === "open" ? "bg-brand text-white" : "text-muted")
                        }
                    >
                        Open Tasks
                        <span className={"ml-2 rounded-full px-2 py-0.5 text-xs " + (tab === "open" ? "bg-white/20" : "bg-[#e8f6f5] text-brand")}>
                            {openCount}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("done")}
                        className={
                            "rounded-lg px-4 py-2 text-sm font-bold " + (tab === "done" ? "bg-brand text-white" : "text-muted")
                        }
                    >
                        Done
                    </button>
                </div>
                <button
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-bold text-muted shadow-sm"
                >
                    <Filter className="size-4" />
                    Filters
                </button>
            </div>

            <section className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="m-0 text-base font-extrabold text-ink">Today&apos;s priorities</h3>
                        <p className="m-0 text-sm text-muted">Items requiring attention</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-muted shadow-sm">
                        <Clock3 className="size-4" />
                        {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                    </div>
                </div>

                {loading ? (
                    <p className="text-sm text-muted">Loading…</p>
                ) : tasks.length === 0 ? (
                    <p className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted shadow-sm">
                        No {tab === "open" ? "open" : "completed"} tasks.
                    </p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {tasks.map((t, i) => (
                            <Link
                                key={t.id}
                                href={`/dashboard/caregiver/tasks/${t.id}`}
                                className={
                                    "block rounded-2xl border bg-white p-4 no-underline shadow-sm transition-shadow hover:shadow-md " +
                                    (i === 0 && tab === "open" ? "border-brand ring-1 ring-brand/30" : "border-line")
                                }
                            >
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <span className="mt-0.5 size-4 shrink-0 rounded border border-line" />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {t.priority ? (
                                        <span className={"rounded-full px-2 py-0.5 text-[0.65rem] font-extrabold capitalize " + priorityStyle(t.priority)}>
                                            {t.priority === "urgent" ? "Urgent" : t.priority === "high" ? "High" : t.priority}
                                        </span>
                                    ) : null}
                                </div>
                                <p className="m-0 mt-2 text-[0.95rem] font-extrabold text-ink">{t.title}</p>
                                <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                                    <span className="font-semibold text-ink">{nameByMother.get(t.mother_user_id) ?? "Mother"}</span>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                        <Clock3 className="size-3.5" />
                                        {formatDue(t.due_at)}
                                    </span>
                                </div>
                                <div className="mt-4 flex gap-4 border-t border-line pt-3 text-xs font-bold">
                                    <span className="text-muted line-through">Snooze</span>
                                    <button
                                        type="button"
                                        className="border-0 bg-transparent p-0 text-brand"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            void (async () => {
                                                await supabase
                                                    .from("care_tasks")
                                                    .update({
                                                        status: "completed",
                                                        completed_at: new Date().toISOString(),
                                                    })
                                                    .eq("id", t.id);
                                                router.refresh();
                                                void load();
                                            })();
                                        }}
                                    >
                                        Mark done
                                    </button>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
