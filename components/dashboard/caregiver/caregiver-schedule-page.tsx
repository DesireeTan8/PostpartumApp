"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchLinkedMothers, type LinkedMother } from "@/lib/caregiver/linked-mothers";
import { CaregiverNoLinkedMothersPanel } from "@/components/dashboard/caregiver/caregiver-no-linked-mothers-panel";

type ApptRow = {
    id: string;
    mother_user_id: string;
    starts_at: string;
    location_type: string;
    location_detail: string | null;
};

export function CaregiverSchedulePage() {
    const [mothers, setMothers] = useState<LinkedMother[]>([]);
    const [rows, setRows] = useState<ApptRow[]>([]);
    const [day, setDay] = useState(() => new Date());
    const [ready, setReady] = useState(false);

    const load = useCallback(async () => {
        const { mothers: ms } = await fetchLinkedMothers(supabase);
        setMothers(ms);
        const ids = ms.map((m) => m.motherUserId);
        if (ids.length === 0) {
            setRows([]);
            setReady(true);
            return;
        }
        const { data } = await supabase
            .from("appointments")
            .select("id, mother_user_id, starts_at, location_type, location_detail")
            .in("mother_user_id", ids)
            .order("starts_at", { ascending: true })
            .limit(100);
        setRows((data ?? []) as ApptRow[]);
        setReady(true);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
        void load();
    }, [load]);

    const nameBy = useMemo(() => {
        const m = new Map<string, string>();
        for (const mo of mothers) m.set(mo.motherUserId, mo.displayName);
        return m;
    }, [mothers]);

    const dayStr = day.toDateString();
    const forDay = rows.filter((r) => new Date(r.starts_at).toDateString() === dayStr);

    const monthLabel = day.toLocaleString(undefined, { month: "long", year: "numeric" });
    const hasMothers = mothers.length > 0;

    if (!ready) {
        return <p className="px-6 py-16 text-center text-sm text-muted">Loading schedule…</p>;
    }

    return (
        <div className="mx-auto max-w-lg px-4 py-6 lg:max-w-2xl lg:px-8">
            {!hasMothers ? (
                <CaregiverNoLinkedMothersPanel
                    className="mb-8"
                    hint="Your agenda will list real visits here after a mother is linked. Below is a preview of the calendar layout."
                />
            ) : null}
            <div className="flex items-center justify-between">
                <h2 className="m-0 text-xl font-extrabold text-ink">Schedule</h2>
                <Link
                    href="/dashboard/caregiver/appointments"
                    className="grid size-12 place-items-center rounded-full bg-brand text-white shadow-md no-underline"
                    aria-label="Add"
                >
                    <Plus className="size-6" />
                </Link>
            </div>

            <div
                className={
                    "mt-6 rounded-2xl border border-line bg-white p-4 shadow-sm " +
                    (!hasMothers ? "pointer-events-none opacity-55" : "")
                }
                aria-hidden={!hasMothers}
            >
                <div className="flex items-center justify-between">
                    <button type="button" className="border-0 bg-transparent text-lg font-bold text-muted" onClick={() => setDay(new Date(day.getFullYear(), day.getMonth() - 1, 1))}>
                        ‹
                    </button>
                    <span className="font-extrabold text-ink">{monthLabel}</span>
                    <button type="button" className="border-0 bg-transparent text-lg font-bold text-muted" onClick={() => setDay(new Date(day.getFullYear(), day.getMonth() + 1, 1))}>
                        ›
                    </button>
                </div>
                <p className="mt-4 text-center text-sm text-muted">Tap a day below (prototype) — selected: {day.toLocaleDateString()}</p>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                        <span key={`${d}-${i}`} className="font-extrabold text-muted">
                            {d}
                        </span>
                    ))}
                    {Array.from({ length: 35 }, (_, i) => {
                        const start = new Date(day.getFullYear(), day.getMonth(), 1);
                        const pad = start.getDay();
                        const dom = i - pad + 1;
                        const cell = new Date(day.getFullYear(), day.getMonth(), dom);
                        const inMonth = cell.getMonth() === day.getMonth();
                        const isSel = inMonth && cell.toDateString() === new Date().toDateString();
                        return (
                            <button
                                key={i}
                                type="button"
                                disabled={!inMonth}
                                onClick={() => inMonth && setDay(cell)}
                                className={
                                    "aspect-square rounded-full text-[0.7rem] font-bold " +
                                    (!inMonth ? "text-transparent" : isSel ? "bg-brand text-white" : "text-ink hover:bg-[#f3f4f6]")
                                }
                            >
                                {inMonth ? dom : "·"}
                            </button>
                        );
                    })}
                </div>
            </div>

            <h3 className="mt-8 text-sm font-extrabold text-ink">Agenda</h3>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                {!hasMothers ? (
                    <li className="rounded-xl border border-dashed border-line bg-[#f8fafc] p-4 text-sm text-muted shadow-sm">
                        No visits yet — link a mother to see her schedule.
                    </li>
                ) : forDay.length === 0 ? (
                    <li className="rounded-xl border border-line bg-white p-4 text-sm text-muted shadow-sm">No visits this day.</li>
                ) : (
                    forDay.map((a) => (
                        <li key={a.id} className="rounded-xl border border-line bg-white p-4 shadow-sm">
                            <p className="m-0 font-extrabold text-ink">
                                {new Date(a.starts_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                            </p>
                            <p className="m-0 text-sm text-muted">{nameBy.get(a.mother_user_id) ?? "Mother"}</p>
                            <p className="m-0 text-xs text-muted capitalize">
                                {a.location_type}
                                {a.location_detail ? ` · ${a.location_detail}` : ""}
                            </p>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}
