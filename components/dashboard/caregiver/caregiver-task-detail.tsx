"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Check, Clock, MapPin, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchLinkedMothers, type LinkedMother } from "@/lib/caregiver/linked-mothers";

type TaskRow = {
    id: string;
    mother_user_id: string;
    title: string;
    description: string | null;
    category: string;
    due_at: string | null;
    status: string;
    priority: string | null;
    created_at: string;
    created_by_user_id: string;
};

export function CaregiverTaskDetail({ taskId }: { taskId: string }) {
    const router = useRouter();
    const [task, setTask] = useState<TaskRow | null>(null);
    const [mothers, setMothers] = useState<LinkedMother[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        const { mothers: ms } = await fetchLinkedMothers(supabase);
        setMothers(ms);
        const { data, error: e } = await supabase
            .from("care_tasks")
            .select("id, mother_user_id, title, description, category, due_at, status, priority, created_at, created_by_user_id")
            .eq("id", taskId)
            .maybeSingle();
        if (e) {
            setError(e.message);
            setTask(null);
            return;
        }
        if (!data) {
            const { data: d2 } = await supabase
                .from("care_tasks")
                .select("id, mother_user_id, title, description, category, due_at, status, created_at, created_by_user_id")
                .eq("id", taskId)
                .maybeSingle();
            setTask((d2 ?? null) as TaskRow | null);
            return;
        }
        setTask(data as TaskRow);
    }, [taskId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
        void load();
    }, [load]);

    const mother = mothers.find((m) => m.motherUserId === task?.mother_user_id);

    const markDone = async () => {
        if (!task) return;
        setBusy(true);
        await supabase
            .from("care_tasks")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", task.id);
        setBusy(false);
        router.replace("/dashboard/caregiver/tasks");
    };

    const remove = async () => {
        if (!task) return;
        if (!confirm("Delete this task?")) return;
        setBusy(true);
        await supabase.from("care_tasks").delete().eq("id", task.id);
        setBusy(false);
        router.replace("/dashboard/caregiver/tasks");
    };

    if (error) {
        return <p className="px-6 py-16 text-center text-sm text-[#a33f58]">{error}</p>;
    }

    if (!task) {
        return <p className="px-6 py-16 text-center text-sm text-muted">Loading task…</p>;
    }

    const due = task.due_at ? new Date(task.due_at) : null;

    return (
        <div className="mx-auto max-w-5xl px-4 py-6 lg:grid lg:grid-cols-[1fr_280px] lg:gap-8 lg:px-8">
            <div>
                <Link
                    href="/dashboard/caregiver/tasks"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-brand no-underline"
                >
                    <ArrowLeft className="size-4" />
                    Back to Tasks
                </Link>

                <div className="rounded-2xl border border-line bg-white p-6 shadow-sm lg:p-8">
                    <div className="mb-4 rounded-xl bg-brand/10 px-4 py-3 text-sm font-bold text-[#2a6b66]">
                        <Clock className="mr-2 inline size-4" aria-hidden />
                        {due ? `Due ${due.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}` : "No due time set"}
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                        {task.priority === "urgent" || task.priority === "high" ? (
                            <span className="rounded-full bg-[#fee2e2] px-2.5 py-0.5 text-[0.7rem] font-extrabold text-[#b91c1c]">
                                {task.priority === "urgent" ? "High Priority" : "Elevated"}
                            </span>
                        ) : null}
                        <span className="rounded-full bg-[#f0f9ff] px-2.5 py-0.5 text-[0.7rem] font-extrabold capitalize text-[#0369a1]">
                            {task.category.replace("_", " ")}
                        </span>
                    </div>
                    <h1 className="m-0 text-2xl font-extrabold text-ink">{task.title}</h1>

                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        <div className="flex gap-2 text-sm">
                            <Calendar className="size-4 shrink-0 text-muted" />
                            <div>
                                <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">Date</p>
                                <p className="m-0 font-bold text-ink">{due ? due.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : "—"}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 text-sm">
                            <Clock className="size-4 shrink-0 text-muted" />
                            <div>
                                <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">Time</p>
                                <p className="m-0 font-bold text-ink">{due ? due.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "—"}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 text-sm">
                            <MapPin className="size-4 shrink-0 text-muted" />
                            <div>
                                <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">Location</p>
                                <p className="m-0 font-bold text-ink">As documented in visit notes</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8">
                        <h2 className="m-0 text-sm font-extrabold text-ink">Task description</h2>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                            {task.description?.trim() || "No additional details."}
                        </p>
                    </div>

                    {mother ? (
                        <Link
                            href={`/dashboard/caregiver/mothers/${mother.motherUserId}`}
                            className="mt-8 flex items-center justify-between rounded-xl border border-line px-4 py-3 no-underline"
                        >
                            <div>
                                <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">Mother</p>
                                <p className="m-0 font-bold text-ink">{mother.displayName}</p>
                            </div>
                            <span className="text-muted">›</span>
                        </Link>
                    ) : null}

                    <button
                        type="button"
                        disabled={busy || task.status !== "pending"}
                        onClick={() => void markDone()}
                        className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-50"
                    >
                        <Check className="size-5" />
                        Mark as Done
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove()}
                        className="mt-3 flex h-11 w-full items-center justify-center gap-2 border-0 bg-transparent text-sm font-bold text-[#e11d48]"
                    >
                        <Trash2 className="size-4" />
                        Delete Task
                    </button>
                </div>
            </div>

            <aside className="mt-8 space-y-4 lg:mt-14">
                <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                    <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">Quick actions</p>
                    <ul className="mt-3 space-y-2 text-sm font-bold text-brand">
                        <li>
                            <Link href="/dashboard/caregiver/notes/new" className="no-underline">
                                Add care note
                            </Link>
                        </li>
                        <li>
                            <Link href="/dashboard/caregiver/chat" className="no-underline">
                                Message care team
                            </Link>
                        </li>
                    </ul>
                </div>
                <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                    <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">Activity</p>
                    <p className="mt-2 text-xs text-muted">
                        Created {new Date(task.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                </div>
            </aside>
        </div>
    );
}
