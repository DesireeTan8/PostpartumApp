"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, ClipboardList, Clock3, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type ProfileMini = { full_name: string | null; avatar_url: string | null };
type MotherProfilesJoin = {
    profiles: ProfileMini | ProfileMini[] | null;
} | null;

type CareRequestRow = {
    id: string;
    mother_user_id: string;
    status: string;
    preferred_date: string | null;
    window_start: string | null;
    window_end: string | null;
    notes: string | null;
    created_at: string;
    care_services: { name: string | null } | { name: string | null }[] | null;
    mother_profiles: MotherProfilesJoin | MotherProfilesJoin[] | null;
};

type RequestEventRow = {
    id: string;
    step_label: string;
    status_note: string | null;
    created_at: string;
};

function unwrap<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null;
    if (Array.isArray(value)) return value[0] ?? null;
    return value;
}

function formatShortDate(d: string | null): string {
    if (!d) return "—";
    return new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

function formatWindow(start: string | null, end: string | null): string {
    const s = start?.slice(0, 5) ?? "—";
    const e = end?.slice(0, 5) ?? "—";
    return `${s} – ${e}`;
}

function statusLabel(status: string): string {
    switch (status) {
        case "submitted":
            return "Submitted";
        case "in_review":
            return "In review";
        case "scheduled":
            return "Scheduled";
        case "completed":
            return "Completed";
        case "cancelled":
            return "Cancelled";
        default:
            return status;
    }
}

function statusPillClass(status: string): string {
    switch (status) {
        case "submitted":
            return "bg-[#fff4e6] text-[#9a5f1a]";
        case "in_review":
            return "bg-[#e8f6f5] text-[#2a6b66]";
        case "scheduled":
            return "bg-[#e8f0ff] text-[#334e9f]";
        case "completed":
            return "bg-[#eef4ff] text-[#334e9f]";
        case "cancelled":
            return "bg-[#fdeef1] text-[#a33f58]";
        default:
            return "bg-[#f0f3f5] text-[#5a6672]";
    }
}

export function CaregiverCareRequestsContent() {
    const [supportedMotherId, setSupportedMotherId] = useState<string | null>(null);
    const [motherName, setMotherName] = useState<string | null>(null);
    const [rows, setRows] = useState<CareRequestRow[]>([]);
    const [events, setEvents] = useState<RequestEventRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) {
            setLoading(false);
            return;
        }

        const { data: cg, error: cgErr } = await supabase
            .from("caregiver_profiles")
            .select("supported_mother_user_id")
            .eq("user_id", uid)
            .maybeSingle();

        if (cgErr) {
            setError(cgErr.message);
            setLoading(false);
            return;
        }

        const mid = cg?.supported_mother_user_id ?? null;
        setSupportedMotherId(mid);

        if (!mid) {
            setRows([]);
            setMotherName(null);
            setLoading(false);
            return;
        }

        const { data: prof } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", mid)
            .maybeSingle();

        setMotherName(prof?.full_name?.trim() ?? null);

        const { data: reqs, error: rErr } = await supabase
            .from("care_requests")
            .select(
                `
        id,
        mother_user_id,
        status,
        preferred_date,
        window_start,
        window_end,
        notes,
        created_at,
        care_services(name),
        mother_profiles!care_requests_mother_user_id_fkey(
          profiles(full_name, avatar_url)
        )
      `
            )
            .eq("mother_user_id", mid)
            .order("created_at", { ascending: false })
            .limit(40);

        if (rErr) {
            setError(rErr.message);
            setRows([]);
        } else {
            setRows((reqs ?? []) as CareRequestRow[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
        void load();
    }, [load]);

    const loadEvents = useCallback(async (requestId: string) => {
        const { data, error: e } = await supabase
            .from("care_request_events")
            .select("id, step_label, status_note, created_at")
            .eq("care_request_id", requestId)
            .order("created_at", { ascending: true });
        if (!e) setEvents((data ?? []) as RequestEventRow[]);
        else setEvents([]);
    }, []);

    useEffect(() => {
        if (selectedId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- load on selection
            void loadEvents(selectedId);
        } else {
            setEvents([]);
        }
    }, [selectedId, loadEvents]);

    const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);
    const service = selected ? unwrap(selected.care_services) : null;

    if (loading) {
        return <p className="py-10 text-center text-sm text-muted">Loading…</p>;
    }

    if (!supportedMotherId) {
        return (
            <div className="mx-auto max-w-[520px] px-4 pb-28 pt-2">
                <p className="rounded-2xl border border-dashed border-[#d5dde2] bg-[#f8fafb] px-4 py-6 text-center text-[0.9rem] text-muted">
                    Link to a supported mother in your profile to see her care requests here.
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-2">
            <div className="mb-4 flex items-center gap-2 text-ink">
                <ClipboardList className="size-6 text-brand" strokeWidth={2} aria-hidden />
                <h2 className="m-0 text-[1.15rem] font-bold tracking-tight">Her care requests</h2>
            </div>
            <p className="mb-4 text-[0.88rem] leading-relaxed text-muted">
                Read-only updates for <span className="font-semibold text-ink">{motherName ?? "your supported mother"}</span>.
                She manages scheduling in her app.
            </p>

            {error ? (
                <p className="mb-3 rounded-xl border border-[#f5c4c4] bg-[#fff5f5] px-3 py-2 text-[0.88rem] text-[#a33f58]">
                    {error}
                </p>
            ) : null}

            {!selectedId ? (
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {rows.length === 0 ? (
                        <li className="rounded-2xl border border-[#e4e9ec] bg-white px-4 py-8 text-center text-[0.9rem] text-muted shadow-sm">
                            No care requests yet.
                        </li>
                    ) : (
                        rows.map((r) => {
                            const mp = unwrap(unwrap(r.mother_profiles)?.profiles ?? null);
                            const svc = unwrap(r.care_services);
                            return (
                                <li key={r.id}>
                                    <button
                                        type="button"
                                        className="flex w-full items-start gap-3 rounded-2xl border border-[#e4e9ec] bg-white px-3.5 py-3.5 text-left shadow-sm transition-colors hover:border-[#c5ddd4]"
                                        onClick={() => setSelectedId(r.id)}
                                    >
                                        {mp?.avatar_url ? (
                                            <img src={mp.avatar_url} alt="" className="size-11 shrink-0 rounded-full object-cover" />
                                        ) : (
                                            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eceff2] text-[#8b96a8]">
                                                <UserRound size={20} />
                                            </span>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold ${statusPillClass(r.status)}`}>
                                                {statusLabel(r.status)}
                                            </span>
                                            <p className="m-0 mt-1 truncate text-[0.95rem] font-bold text-ink">{svc?.name ?? "Care request"}</p>
                                            <p className="m-0 mt-1 text-[0.78rem] text-[#6a7688]">
                                                {formatShortDate(r.preferred_date)} · {formatWindow(r.window_start, r.window_end)}
                                            </p>
                                        </div>
                                        <ChevronRight className="mt-2 size-5 shrink-0 text-[#b8c2cc]" aria-hidden />
                                    </button>
                                </li>
                            );
                        })
                    )}
                </ul>
            ) : (
                <div>
                    <button
                        type="button"
                        className="mb-4 border-0 bg-transparent p-0 text-[0.88rem] font-semibold text-brand"
                        onClick={() => setSelectedId(null)}
                    >
                        ← Back to list
                    </button>

                    <div className="mb-4 rounded-2xl border border-[#e4e9ec] bg-white px-4 py-4 shadow-sm">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold ${statusPillClass(selected?.status ?? "")}`}>
                            {statusLabel(selected?.status ?? "")}
                        </span>
                        <p className="m-0 mt-2 text-[1.05rem] font-bold text-ink">{service?.name ?? "Care request"}</p>
                        <div className="mt-3 grid gap-2 border-t border-[#eef2f4] pt-3 text-[0.86rem] text-[#3d4a5c]">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="size-4 text-[#6a7688]" />
                                {formatShortDate(selected?.preferred_date ?? null)}
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock3 className="size-4 text-[#6a7688]" />
                                {formatWindow(selected?.window_start ?? null, selected?.window_end ?? null)}
                            </div>
                            {selected?.notes?.trim() ? (
                                <p className="m-0 mt-1 text-[0.85rem] italic text-muted">&ldquo;{selected.notes.trim()}&rdquo;</p>
                            ) : null}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[#e4e9ec] bg-white px-4 py-3 shadow-sm">
                        <p className="m-0 mb-2 text-[0.72rem] font-extrabold uppercase tracking-wide text-[#8b96a8]">Timeline</p>
                        <ul className="m-0 list-none space-y-2 p-0">
                            {events.length === 0 ? (
                                <li className="text-[0.85rem] text-muted">No updates yet.</li>
                            ) : (
                                events.map((ev) => (
                                    <li key={ev.id} className="border-b border-[#f0f3f5] pb-2 last:border-0">
                                        <p className="m-0 text-[0.82rem] font-bold text-ink">{ev.step_label}</p>
                                        {ev.status_note ? (
                                            <p className="m-0 mt-0.5 text-[0.78rem] text-muted">{ev.status_note}</p>
                                        ) : null}
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
