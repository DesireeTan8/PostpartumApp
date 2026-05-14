"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, MapPin, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchLinkedMothers, type LinkedMother } from "@/lib/caregiver/linked-mothers";
import { CaregiverNoLinkedMothersPanel } from "@/components/dashboard/caregiver/caregiver-no-linked-mothers-panel";

type ApptRow = {
    id: string;
    mother_user_id: string;
    starts_at: string;
    ends_at: string;
    status: string;
    location_type: string;
    location_detail: string | null;
};

function statusUi(status: string): { label: string; className: string } {
    if (status === "requested") return { label: "Needed", className: "text-[#e11d48] border-[#fecdd3]" };
    if (status === "cancelled") return { label: "Not attending", className: "text-muted border-line" };
    return { label: "Assigned", className: "text-muted border-line" };
}

function groupKey(iso: string) {
    return new Date(iso).toDateString();
}

function formatGroupLabel(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const tom = new Date(today);
    tom.setDate(tom.getDate() + 1);
    if (d.toDateString() === tom.toDateString()) return "Tomorrow";
    return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }).toUpperCase();
}

export function CaregiverAppointmentsPage() {
    const [mothers, setMothers] = useState<LinkedMother[]>([]);
    const [rows, setRows] = useState<ApptRow[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const { mothers: ms } = await fetchLinkedMothers(supabase);
        setMothers(ms);
        const motherIds = ms.map((m) => m.motherUserId);
        if (motherIds.length === 0) {
            setRows([]);
            setLoading(false);
            return;
        }
        const { data } = await supabase
            .from("appointments")
            .select("id, mother_user_id, starts_at, ends_at, status, location_type, location_detail")
            .in("mother_user_id", motherIds)
            .order("starts_at", { ascending: true })
            .limit(80);
        setRows((data ?? []) as ApptRow[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
        void load();
    }, [load]);

    const nameByMother = useMemo(() => {
        const m = new Map<string, string>();
        for (const mo of mothers) m.set(mo.motherUserId, mo.displayName);
        return m;
    }, [mothers]);

    const pending = rows.filter((r) => r.status === "requested").length;
    const assigned = rows.filter((r) => r.status === "scheduled" || r.status === "confirmed").length;

    const grouped = useMemo(() => {
        const g = new Map<string, ApptRow[]>();
        for (const r of rows) {
            const k = groupKey(r.starts_at);
            if (!g.has(k)) g.set(k, []);
            g.get(k)!.push(r);
        }
        return g;
    }, [rows]);

    if (loading && mothers.length === 0) {
        return <p className="px-6 py-16 text-center text-sm text-muted">Loading appointments…</p>;
    }

    if (mothers.length === 0 && !loading) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
                <h2 className="m-0 text-xl font-extrabold text-ink">Appointments</h2>
                <p className="m-0 mt-1 text-sm text-muted">Visits and scheduling tied to mothers you support.</p>
                <CaregiverNoLinkedMothersPanel
                    className="mt-8"
                    hint="Upcoming visits from her app and care team will appear here after you’re linked."
                />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 lg:grid lg:grid-cols-[1fr_280px] lg:gap-8 lg:px-8">
            <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="m-0 text-xl font-extrabold text-ink">Appointments</h2>
                    <button
                        type="button"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white shadow-sm"
                    >
                        <Plus className="size-5" />
                        Create Appointment
                    </button>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#fecdd3] bg-[#fff1f2] px-4 py-3 text-center shadow-sm">
                        <p className="m-0 text-2xl font-extrabold text-[#be123c]">{pending}</p>
                        <p className="m-0 text-[0.65rem] font-extrabold uppercase text-[#9f1239]">Pending</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-white px-4 py-3 text-center shadow-sm">
                        <p className="m-0 text-2xl font-extrabold text-ink">{assigned}</p>
                        <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">Assigned</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-white px-4 py-3 text-center shadow-sm">
                        <CalendarDays className="mx-auto size-6 text-brand" />
                        <p className="m-0 mt-1 text-[0.65rem] font-extrabold uppercase text-muted">Schedule</p>
                    </div>
                </div>

                {loading ? (
                    <p className="mt-10 text-center text-sm text-muted">Loading…</p>
                ) : (
                    <div className="mt-10 space-y-8">
                        {[...grouped.entries()].map(([key, list]) => (
                            <section key={key}>
                                <h3 className="m-0 text-[0.7rem] font-extrabold uppercase tracking-wide text-muted">
                                    {formatGroupLabel(list[0]!.starts_at)}
                                </h3>
                                <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
                                    {list.map((a) => {
                                        const ui = statusUi(a.status);
                                        const start = new Date(a.starts_at);
                                        const end = new Date(a.ends_at);
                                        const mins = Math.round((end.getTime() - start.getTime()) / 60000);
                                        return (
                                            <li
                                                key={a.id}
                                                className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-sm"
                                            >
                                                <div className="min-w-[72px] text-sm font-extrabold text-ink">
                                                    {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                                                    <p className="m-0 text-[0.7rem] font-semibold text-muted">{mins} min</p>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="m-0 font-extrabold text-ink">Visit with provider</p>
                                                    <p className="m-0 mt-1 flex items-center gap-1 text-xs text-muted">
                                                        <MapPin className="size-3.5 shrink-0" />
                                                        {a.location_type}
                                                        {a.location_detail ? ` · ${a.location_detail}` : ""}
                                                    </p>
                                                    <p className="m-0 mt-1 text-xs font-semibold text-ink">
                                                        {nameByMother.get(a.mother_user_id) ?? "Mother"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`rounded-full border px-2.5 py-1 text-[0.65rem] font-extrabold ${ui.className}`}>
                                                        {ui.label}
                                                    </span>
                                                    {a.status === "requested" ? (
                                                        <span className="rounded-xl bg-brand/15 px-3 py-2 text-xs font-bold text-brand">Assign flow</span>
                                                    ) : (
                                                        <ChevronRight className="size-5 text-[#b8c2cc]" />
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ))}
                        {rows.length === 0 ? (
                            <p className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted shadow-sm">
                                No appointments on file.
                            </p>
                        ) : null}
                    </div>
                )}
            </div>

            <aside className="mt-10 lg:mt-14">
                <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-extrabold text-ink">{new Date().toLocaleString(undefined, { month: "long", year: "numeric" })}</span>
                        <CalendarDays className="size-5 text-brand" />
                    </div>
                    <p className="m-0 text-center text-3xl font-extrabold text-brand">{new Date().getDate()}</p>
                    <p className="mt-4 text-center text-xs text-muted">Dots on the full calendar view can be added when you connect scheduling data.</p>
                </div>
                <p className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#f8fafc] px-3 py-3 text-center text-xs text-muted">
                    <CalendarDays className="size-4 shrink-0 text-brand" />
                    Coverage reminders will appear here as your team grows.
                </p>
            </aside>
        </div>
    );
}
