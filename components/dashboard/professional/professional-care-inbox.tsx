"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    CalendarDays,
    ChevronRight,
    Clock3,
    ClipboardList,
    MapPin,
    Stethoscope,
    UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
    declineCareRequest,
    markCareRequestCompleted,
    markCareRequestInReview,
    scheduleAppointmentFromRequest,
} from "@/lib/care-requests/professional-workflow";

type ProfileMini = { full_name: string | null; avatar_url: string | null };
type MotherProfilesJoin = {
    profiles: ProfileMini | ProfileMini[] | null;
} | null;

type CareRequestInboxRow = {
    id: string;
    mother_user_id: string;
    status: string;
    preferred_date: string | null;
    window_start: string | null;
    window_end: string | null;
    notes: string | null;
    created_at: string;
    preferred_provider_user_id: string | null;
    service_id: string | null;
    care_services: { name: string | null; description: string | null } | { name: string | null; description: string | null }[] | null;
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
            return "New";
        case "in_review":
            return "In review";
        case "scheduled":
            return "Scheduled";
        case "completed":
            return "Completed";
        case "cancelled":
            return "Declined";
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

export function ProfessionalCareInboxContent() {
    const [professionalId, setProfessionalId] = useState<string | null>(null);
    const [rows, setRows] = useState<CareRequestInboxRow[]>([]);
    const [events, setEvents] = useState<RequestEventRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [actionBusy, setActionBusy] = useState(false);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [startsLocal, setStartsLocal] = useState("");
    const [endsLocal, setEndsLocal] = useState("");
    const [locType, setLocType] = useState<"virtual" | "clinic" | "home">("virtual");
    const [locDetail, setLocDetail] = useState("");

    const load = useCallback(async () => {
        setError(null);
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        setProfessionalId(uid ?? null);
        if (!uid) {
            setLoading(false);
            setRows([]);
            return;
        }

        const { data: primaryMothers, error: pmErr } = await supabase
            .from("mother_profiles")
            .select("user_id")
            .eq("primary_care_provider_id", uid);

        if (pmErr) {
            setError(pmErr.message);
            setLoading(false);
            return;
        }

        const primaryIds = (primaryMothers ?? []).map((r) => r.user_id).filter(Boolean);

        let q = supabase
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
        preferred_provider_user_id,
        service_id,
        care_services(name, description),
        mother_profiles!care_requests_mother_user_id_fkey(
          profiles(full_name, avatar_url)
        )
      `
            )
            .order("created_at", { ascending: false })
            .limit(80);

        if (primaryIds.length > 0) {
            q = q.or(`preferred_provider_user_id.eq.${uid},mother_user_id.in.(${primaryIds.join(",")})`);
        } else {
            q = q.eq("preferred_provider_user_id", uid);
        }

        const { data, error: qErr } = await q;

        if (qErr) {
            setError(qErr.message);
            setRows([]);
        } else {
            setRows((data ?? []) as CareRequestInboxRow[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
        void load();
    }, [load]);

    const selected = useMemo(
        () => rows.find((r) => r.id === selectedId) ?? null,
        [rows, selectedId]
    );

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

    const motherProfile = selected ? unwrap(unwrap(selected.mother_profiles)?.profiles ?? null) : null;
    const service = selected ? unwrap(selected.care_services) : null;

    const runAction = async (fn: () => ReturnType<typeof markCareRequestInReview>) => {
        if (!selectedId) return;
        setActionBusy(true);
        setError(null);
        const { error: rpcErr } = await fn();
        setActionBusy(false);
        if (rpcErr) {
            setError(rpcErr.message);
            return;
        }
        await load();
        await loadEvents(selectedId);
    };

    const submitSchedule = async () => {
        if (!selectedId || !startsLocal || !endsLocal) {
            setError("Choose a start and end time for the visit.");
            return;
        }
        const start = new Date(startsLocal);
        const end = new Date(endsLocal);
        if (end <= start) {
            setError("End time must be after start time.");
            return;
        }
        setActionBusy(true);
        setError(null);
        const { error: rpcErr } = await scheduleAppointmentFromRequest({
            requestId: selectedId,
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
            locationType: locType,
            locationDetail: locDetail.trim() || null,
        });
        setActionBusy(false);
        if (rpcErr) {
            setError(rpcErr.message);
            return;
        }
        setScheduleOpen(false);
        await load();
        await loadEvents(selectedId);
    };

    if (loading) {
        return <p className="py-10 text-center text-sm text-muted">Loading care requests…</p>;
    }

    return (
        <div className="mx-auto w-full max-w-[520px] px-4 pb-28 pt-2">
            <div className="mb-4 flex items-center gap-2 text-ink">
                <ClipboardList className="size-6 text-brand" strokeWidth={2} aria-hidden />
                <h2 className="m-0 text-[1.15rem] font-bold tracking-tight">Care requests</h2>
            </div>
            <p className="mb-4 text-[0.88rem] leading-relaxed text-muted">
                Review requests where you are the preferred provider or the mother&apos;s primary care clinician.
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
                            No open requests right now.
                        </li>
                    ) : (
                        rows.map((r) => {
                            const mp = unwrap(unwrap(r.mother_profiles)?.profiles ?? null);
                            const svc = unwrap(r.care_services);
                            return (
                                <li key={r.id}>
                                    <button
                                        type="button"
                                        className="flex w-full items-start gap-3 rounded-2xl border border-[#e4e9ec] bg-white px-3.5 py-3.5 text-left shadow-[0_4px_14px_rgba(35,55,65,0.05)] transition-colors hover:border-[#c5ddd4]"
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
                                            <div className="mb-1 flex flex-wrap items-center gap-2">
                                                <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold ${statusPillClass(r.status)}`}>
                                                    {statusLabel(r.status)}
                                                </span>
                                                {professionalId && r.preferred_provider_user_id === professionalId ? (
                                                    <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#6a7688]">
                                                        You are preferred
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="m-0 truncate text-[0.95rem] font-bold text-ink">
                                                {mp?.full_name?.trim() || "Mother"}
                                            </p>
                                            <p className="m-0 truncate text-[0.82rem] text-muted">{svc?.name ?? "Care request"}</p>
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
                        onClick={() => {
                            setSelectedId(null);
                            setScheduleOpen(false);
                            setError(null);
                        }}
                    >
                        ← Back to list
                    </button>

                    <div className="mb-4 rounded-2xl border border-[#e4e9ec] bg-white px-4 py-4 shadow-sm">
                        <div className="mb-3 flex items-start gap-3">
                            {motherProfile?.avatar_url ? (
                                <img src={motherProfile.avatar_url} alt="" className="size-14 rounded-full object-cover" />
                            ) : (
                                <span className="grid size-14 place-items-center rounded-full bg-[#eceff2] text-[#8b96a8]">
                                    <UserRound size={24} />
                                </span>
                            )}
                            <div className="min-w-0">
                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold ${statusPillClass(selected?.status ?? "")}`}>
                                    {statusLabel(selected?.status ?? "")}
                                </span>
                                <p className="m-0 mt-1 text-[1.05rem] font-bold text-ink">
                                    {motherProfile?.full_name?.trim() || "Mother"}
                                </p>
                                <p className="m-0 text-[0.88rem] font-semibold text-brand">{service?.name ?? "Service"}</p>
                                {service?.description ? (
                                    <p className="m-0 mt-0.5 text-[0.82rem] text-muted">{service.description}</p>
                                ) : null}
                            </div>
                        </div>
                        <div className="grid gap-2 border-t border-[#eef2f4] pt-3 text-[0.86rem]">
                            <div className="flex items-center gap-2 text-[#3d4a5c]">
                                <CalendarDays className="size-4 shrink-0 text-[#6a7688]" />
                                Preferred date: {formatShortDate(selected?.preferred_date ?? null)}
                            </div>
                            <div className="flex items-center gap-2 text-[#3d4a5c]">
                                <Clock3 className="size-4 shrink-0 text-[#6a7688]" />
                                Window: {formatWindow(selected?.window_start ?? null, selected?.window_end ?? null)}
                            </div>
                            {selected?.notes?.trim() ? (
                                <div className="flex items-start gap-2 text-[#3d4a5c]">
                                    <Stethoscope className="mt-0.5 size-4 shrink-0 text-[#6a7688]" />
                                    <span className="italic">&ldquo;{selected.notes.trim()}&rdquo;</span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="mb-4 rounded-2xl border border-[#e4e9ec] bg-white px-4 py-3 shadow-sm">
                        <p className="m-0 mb-2 text-[0.72rem] font-extrabold uppercase tracking-wide text-[#8b96a8]">Timeline</p>
                        <ul className="m-0 max-h-[220px] list-none space-y-2 overflow-y-auto p-0">
                            {events.length === 0 ? (
                                <li className="text-[0.85rem] text-muted">No events yet.</li>
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

                    {selected?.status !== "cancelled" && selected?.status !== "completed" ? (
                        <div className="flex flex-col gap-2.5">
                            {selected?.status === "submitted" ? (
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    className="flex h-12 w-full items-center justify-center rounded-2xl border-0 bg-brand text-[0.95rem] font-bold text-white disabled:opacity-60"
                                    onClick={() =>
                                        void runAction(() => markCareRequestInReview(selectedId))
                                    }
                                >
                                    Start review
                                </button>
                            ) : null}

                            {selected?.status === "in_review" || selected?.status === "submitted" ? (
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#c5ddd4] bg-[#f4fbf9] text-[0.95rem] font-bold text-[#1f5c57] disabled:opacity-60"
                                    onClick={() => {
                                        setScheduleOpen((o) => !o);
                                        setError(null);
                                    }}
                                >
                                    <MapPin className="size-4" />
                                    Schedule visit
                                </button>
                            ) : null}

                            {scheduleOpen ? (
                                <div className="rounded-2xl border border-[#dce6e9] bg-[#f8fafb] px-3 py-3">
                                    <p className="m-0 mb-2 text-[0.82rem] font-bold text-ink">Visit time</p>
                                    <label className="mb-2 block text-[0.72rem] font-semibold text-muted">
                                        Starts
                                        <input
                                            type="datetime-local"
                                            className="mt-1 box-border h-11 w-full rounded-xl border border-[#dce6e9] bg-white px-2 text-[0.88rem] outline-none"
                                            value={startsLocal}
                                            onChange={(e) => setStartsLocal(e.target.value)}
                                        />
                                    </label>
                                    <label className="mb-2 block text-[0.72rem] font-semibold text-muted">
                                        Ends
                                        <input
                                            type="datetime-local"
                                            className="mt-1 box-border h-11 w-full rounded-xl border border-[#dce6e9] bg-white px-2 text-[0.88rem] outline-none"
                                            value={endsLocal}
                                            onChange={(e) => setEndsLocal(e.target.value)}
                                        />
                                    </label>
                                    <label className="mb-2 block text-[0.72rem] font-semibold text-muted">
                                        Location type
                                        <select
                                            className="mt-1 box-border h-11 w-full rounded-xl border border-[#dce6e9] bg-white px-2 text-[0.88rem] outline-none"
                                            value={locType}
                                            onChange={(e) => setLocType(e.target.value as typeof locType)}
                                        >
                                            <option value="virtual">Virtual</option>
                                            <option value="clinic">Clinic</option>
                                            <option value="home">Home</option>
                                        </select>
                                    </label>
                                    <label className="mb-3 block text-[0.72rem] font-semibold text-muted">
                                        Location / link notes
                                        <input
                                            type="text"
                                            className="mt-1 box-border h-11 w-full rounded-xl border border-[#dce6e9] bg-white px-2 text-[0.88rem] outline-none"
                                            value={locDetail}
                                            onChange={(e) => setLocDetail(e.target.value)}
                                            placeholder="Address, room, or video instructions"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        disabled={actionBusy}
                                        className="h-11 w-full rounded-xl border-0 bg-brand text-[0.9rem] font-bold text-white disabled:opacity-60"
                                        onClick={() => void submitSchedule()}
                                    >
                                        Confirm schedule
                                    </button>
                                </div>
                            ) : null}

                            {selected?.status === "scheduled" ? (
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    className="flex h-12 w-full items-center justify-center rounded-2xl border border-[#d4dce1] bg-white text-[0.95rem] font-bold text-[#3d4a5c] disabled:opacity-60"
                                    onClick={() => void runAction(() => markCareRequestCompleted(selectedId))}
                                >
                                    Mark request completed
                                </button>
                            ) : null}

                            {selected?.status !== "cancelled" ? (
                                <button
                                    type="button"
                                    disabled={actionBusy}
                                    className="flex h-12 w-full items-center justify-center rounded-2xl border border-[#e8a4b8] bg-white text-[0.95rem] font-bold text-[#a33f58] disabled:opacity-60"
                                    onClick={() => {
                                        if (!confirm("Decline this request? The mother will see it as declined.")) return;
                                        void runAction(() => declineCareRequest(selectedId));
                                    }}
                                >
                                    Decline request
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}