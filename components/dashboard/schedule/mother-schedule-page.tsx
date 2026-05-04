"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    BellRing,
    CalendarCheck2,
    CalendarDays,
    Check,
    ChevronRight,
    Clock3,
    FileText,
    Filter,
    Heart,
    HeartPulse,
    Image as ImageIcon,
    Info,
    MapPin,
    Phone,
    Plus,
    Send,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useMotherPageHeader } from "@/components/layout/mother-dashboard-header-context";

type ScheduleTab = "requests" | "scheduled" | "past";
type ScheduleFilter = "all" | "this_week" | "specialists" | "home";

type ScheduleView =
    | { type: "list" }
    | { type: "request_form"; seedRequestId?: string }
    | { type: "request_status"; requestId: string }
    | { type: "appointment_detail"; appointmentId: string };

type CareServiceOption = {
    id: string;
    name: string;
    description: string | null;
};

type SpecialistOption = {
    userId: string;
    name: string;
    profession: string | null;
    avatarUrl: string | null;
    clinicName: string | null;
    listingBadge: string | null;
    availabilityStatus: "online" | "away" | "offline";
};

type RequestRow = {
    id: string;
    status: "submitted" | "in_review" | "scheduled" | "cancelled" | "completed";
    preferred_date: string | null;
    window_start: string | null;
    window_end: string | null;
    notes: string | null;
    preferred_provider_user_id: string | null;
    created_at: string;
    care_services:
    | { name: string | null; description: string | null }
    | { name: string | null; description: string | null }[]
    | null;
    healthcare_professional_profiles:
    | {
        profession: string | null;
        professional_title: string | null;
        clinic_name: string | null;
        profiles: { full_name: string | null; avatar_url: string | null } | { full_name: string | null; avatar_url: string | null }[] | null;
    }
    | {
        profession: string | null;
        professional_title: string | null;
        clinic_name: string | null;
        profiles: { full_name: string | null; avatar_url: string | null } | { full_name: string | null; avatar_url: string | null }[] | null;
    }[]
    | null;
};

type RequestEventRow = {
    id: string;
    care_request_id: string;
    step_label: string;
    status_note: string | null;
    created_at: string;
};

type AppointmentRow = {
    id: string;
    starts_at: string;
    ends_at: string;
    status: "requested" | "scheduled" | "confirmed" | "completed" | "cancelled";
    location_type: "clinic" | "home" | "virtual";
    location_detail: string | null;
    meeting_url: string | null;
    contact_phone: string | null;
    prep_notes: string | null;
    care_request_id: string | null;
    healthcare_professional_profiles:
    | {
        profession: string | null;
        clinic_name: string | null;
        profiles: { full_name: string | null; avatar_url: string | null } | { full_name: string | null; avatar_url: string | null }[] | null;
    }
    | {
        profession: string | null;
        clinic_name: string | null;
        profiles: { full_name: string | null; avatar_url: string | null } | { full_name: string | null; avatar_url: string | null }[] | null;
    }[]
    | null;
};

function unwrapMaybeArray<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null;
    if (Array.isArray(value)) return value[0] ?? null;
    return value;
}

function specialistAvailabilityDotClass(status: SpecialistOption["availabilityStatus"]): string {
    if (status === "online") return "bg-[#22c55e]";
    if (status === "away") return "bg-amber-400";
    return "bg-[#b8c0cc]";
}

function localDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatAppointmentDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatShortDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string): string {
    return new Date(iso)
        .toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
        .toUpperCase();
}

function formatWindowRange(date: string | null, start: string | null, end: string | null): string {
    if (!date && !start && !end) return "Not specified";
    const datePart = date ? formatShortDate(`${date}T12:00:00`) : "Any day";
    const s = start ? start.slice(0, 5) : "--:--";
    const e = end ? end.slice(0, 5) : "--:--";
    return `${datePart} · ${s} - ${e}`;
}

function formatTimeAmPmFromHhMm(hhmm: string | null): string {
    if (!hhmm) return "";
    const [h, m] = hhmm.slice(0, 5).split(":").map((x) => Number(x));
    if (Number.isNaN(h)) return "";
    const d = new Date();
    d.setHours(h, m || 0, 0, 0);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatRequestWindowOverview(date: string | null, start: string | null, end: string | null): {
    dateLine: string;
    timeLine: string;
} {
    if (!date && !start && !end) {
        return { dateLine: "Not specified", timeLine: "We’ll follow up for availability." };
    }
    const dateLine = date
        ? new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
        })
        : "Flexible date";
    const s = formatTimeAmPmFromHhMm(start);
    const e = formatTimeAmPmFromHhMm(end);
    let band = "Preferred window";
    if (start) {
        const hour = Number(start.slice(0, 2));
        if (!Number.isNaN(hour)) {
            if (hour < 12) band = "Morning";
            else if (hour < 17) band = "Afternoon";
            else band = "Evening";
        }
    }
    const timeLine =
        start && end ? `${band} (${s} – ${e})` : start ? s : "Time flexible";
    return { dateLine, timeLine };
}

function formatRequestReceived(iso: string): string {
    const d = new Date(iso);
    return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true })}`;
}

function careRequestTimelineStepState(
    idx: number,
    status: RequestRow["status"]
): "done" | "current" | "upcoming" {
    if (status === "completed" || status === "scheduled") {
        return "done";
    }
    if (status === "cancelled") {
        if (idx <= 1) return "done";
        return "upcoming";
    }
    if (status === "in_review") {
        if (idx === 0) return "done";
        if (idx === 1) return "current";
        return "upcoming";
    }
    if (idx === 0) return "done";
    if (idx === 1) return "current";
    return "upcoming";
}

function careRequestTimelineDescription(
    step: RequestEventRow,
    serviceTitle: string,
    createdAt: string
): string {
    const label = step.step_label;
    const note = step.status_note?.trim();
    if (label === "Request Submitted") {
        return `Your request for ${serviceTitle} was received on ${formatRequestReceived(createdAt)}.`;
    }
    if (note) return note;
    if (label === "Clinical Review") {
        return "Our care coordination team is currently reviewing your preferences and provider availability.";
    }
    if (label === "Confirmation") {
        return "Once confirmed, you will receive prep instructions and the final location details.";
    }
    return "Status updated by care team.";
}

function toStatusBadge(status: RequestRow["status"] | AppointmentRow["status"]): { label: string; className: string } {
    switch (status) {
        case "in_review":
        case "submitted":
            return { label: "In Review", className: "bg-[#e8f6f5] text-[#2a6b66]" };
        case "scheduled":
            return { label: "Scheduled", className: "bg-[#e8f6f5] text-[#2a6b66]" };
        case "confirmed":
            return { label: "Confirmed", className: "bg-[#e8f6f5] text-[#2a6b66]" };
        case "completed":
            return { label: "Completed", className: "bg-[#eef4ff] text-[#334e9f]" };
        case "cancelled":
            return { label: "Cancelled", className: "bg-[#fdeef1] text-[#a33f58]" };
        case "requested":
        default:
            return { label: "Requested", className: "bg-[#f0f3f5] text-[#5a6672]" };
    }
}

function createGoogleCalendarUrl(appointment: AppointmentRow, providerName: string, location: string): string {
    const start = new Date(appointment.starts_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const end = new Date(appointment.ends_at).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const title = encodeURIComponent(`Appointment with ${providerName}`);
    const details = encodeURIComponent(appointment.prep_notes?.trim() || "Postpartum care appointment");
    const where = encodeURIComponent(location);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${where}`;
}

export function MotherSchedulePageContent() {
    const { setPageHeader } = useMotherPageHeader();
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<ScheduleTab>("scheduled");
    const [filter, setFilter] = useState<ScheduleFilter>("all");
    const [view, setView] = useState<ScheduleView>({ type: "list" });

    const [careServices, setCareServices] = useState<CareServiceOption[]>([]);
    const [specialists, setSpecialists] = useState<SpecialistOption[]>([]);
    const [requests, setRequests] = useState<RequestRow[]>([]);
    const [requestEvents, setRequestEvents] = useState<RequestEventRow[]>([]);
    const [appointments, setAppointments] = useState<AppointmentRow[]>([]);

    const [submitting, setSubmitting] = useState(false);
    const [savingAction, setSavingAction] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);

    const [requestServiceId, setRequestServiceId] = useState<string>("");
    const [requestDate, setRequestDate] = useState<string>(localDateKey(new Date()));
    const [requestWindowStart, setRequestWindowStart] = useState<string>("09:00");
    const [requestWindowEnd, setRequestWindowEnd] = useState<string>("17:00");
    const [requestProviderId, setRequestProviderId] = useState<string>("");
    const [requestNotes, setRequestNotes] = useState<string>("");

    const loadData = useCallback(
        async (uid: string) => {
            const [serviceRes, specialistRes, requestRes, apptRes] = await Promise.all([
                supabase.from("care_services").select("id, name, description").order("name", { ascending: true }),
                supabase
                    .from("healthcare_professional_profiles")
                    .select("user_id, profession, clinic_name, listing_badge, availability_status, profiles(full_name, avatar_url)")
                    .limit(12)
                    .order("created_at", { ascending: true }),
                supabase
                    .from("care_requests")
                    .select(
                        `
            id,
            status,
            preferred_date,
            window_start,
            window_end,
            notes,
            preferred_provider_user_id,
            created_at,
            care_services(name, description),
            healthcare_professional_profiles!care_requests_preferred_provider_user_id_fkey(
              profession,
              professional_title,
              clinic_name,
              profiles(full_name, avatar_url)
            )
          `
                    )
                    .eq("mother_user_id", uid)
                    .order("created_at", { ascending: false })
                    .limit(60),
                supabase
                    .from("appointments")
                    .select(
                        `
            id,
            starts_at,
            ends_at,
            status,
            location_type,
            location_detail,
            meeting_url,
            contact_phone,
            prep_notes,
            care_request_id,
            healthcare_professional_profiles(
              profession,
              clinic_name,
              profiles(full_name, avatar_url)
            )
          `
                    )
                    .eq("mother_user_id", uid)
                    .order("starts_at", { ascending: true })
                    .limit(120),
            ]);

            if (!serviceRes.error) {
                setCareServices((serviceRes.data ?? []) as CareServiceOption[]);
            }
            if (!specialistRes.error) {
                const rows = (specialistRes.data ?? []) as Array<{
                    user_id: string;
                    profession: string | null;
                    clinic_name: string | null;
                    listing_badge: string | null;
                    availability_status: string | null;
                    profiles: { full_name: string | null; avatar_url: string | null } | { full_name: string | null; avatar_url: string | null }[] | null;
                }>;
                const list = rows.map((r) => {
                    const profile = unwrapMaybeArray(r.profiles);
                    const st = r.availability_status;
                    const availability: SpecialistOption["availabilityStatus"] =
                        st === "away" || st === "offline" ? st : "online";
                    return {
                        userId: r.user_id,
                        name: profile?.full_name?.trim() || "Specialist",
                        profession: r.profession,
                        avatarUrl: profile?.avatar_url ?? null,
                        clinicName: r.clinic_name,
                        listingBadge: r.listing_badge,
                        availabilityStatus: availability,
                    } satisfies SpecialistOption;
                });
                setSpecialists(list);
            }
            if (!requestRes.error) {
                const requestRows = (requestRes.data ?? []) as RequestRow[];
                setRequests(requestRows);
                const requestIds = requestRows.map((r) => r.id);
                if (requestIds.length > 0) {
                    const eventsRes = await supabase
                        .from("care_request_events")
                        .select("id, care_request_id, step_label, status_note, created_at")
                        .in("care_request_id", requestIds)
                        .order("created_at", { ascending: true });
                    if (!eventsRes.error) setRequestEvents((eventsRes.data ?? []) as RequestEventRow[]);
                    else setRequestEvents([]);
                } else {
                    setRequestEvents([]);
                }
            }
            if (!apptRes.error) {
                setAppointments((apptRes.data ?? []) as AppointmentRow[]);
            }
        },
        []
    );

    useEffect(() => {
        let active = true;
        void (async () => {
            const { data, error } = await supabase.auth.getUser();
            if (!active) return;
            if (error || !data.user) {
                window.location.href = "/auth/sign-in";
                return;
            }
            setUserId(data.user.id);
            setLoading(true);
            await loadData(data.user.id);
            if (active) {
                setLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [loadData]);

    useEffect(() => {
        if (view.type === "list") {
            setPageHeader({
                title: "Schedule",
                layout: "standard",
                showSettings: false,
            });
            return () => setPageHeader(null);
        }
        if (view.type === "request_form") {
            setPageHeader({
                title: "Request Care",
                layout: "detail",
                backHref: "/dashboard/mother/schedule",
                backLabel: "Back to schedule",
                showSettings: false,
            });
            return () => setPageHeader(null);
        }
        if (view.type === "request_status") {
            setPageHeader({
                title: "Request Status",
                layout: "detail",
                backHref: "/dashboard/mother/schedule",
                backLabel: "Back to schedule",
                showSettings: false,
            });
            return () => setPageHeader(null);
        }
        if (view.type === "appointment_detail") {
            const appointment = appointments.find((a) => a.id === view.appointmentId);
            const providerJoin = unwrapMaybeArray(appointment?.healthcare_professional_profiles ?? null);
            const providerProfile = unwrapMaybeArray(providerJoin?.profiles ?? null);
            const providerName = providerProfile?.full_name?.trim() || "Provider";
            const location = appointment?.location_detail?.trim() || "Care appointment";
            const calendarUrl =
                appointment != null
                    ? createGoogleCalendarUrl(appointment, providerName, location)
                    : "https://calendar.google.com/calendar";
            setPageHeader({
                title: "Appointment Details",
                layout: "detail",
                backHref: "/dashboard/mother/schedule",
                backLabel: "Back to schedule",
                trailing: (
                    <a
                        href={calendarUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[0.82rem] font-bold text-brand no-underline"
                    >
                        Add to Calendar
                    </a>
                ),
                showSettings: false,
            });
            return () => setPageHeader(null);
        }
        return undefined;
    }, [view, setPageHeader, appointments]);

    const specialistMap = useMemo(() => {
        const map = new Map<string, SpecialistOption>();
        for (const s of specialists) map.set(s.userId, s);
        return map;
    }, [specialists]);

    const requestById = useMemo(() => {
        const map = new Map<string, RequestRow>();
        for (const r of requests) map.set(r.id, r);
        return map;
    }, [requests]);

    const requestEventsByRequestId = useMemo(() => {
        const map = new Map<string, RequestEventRow[]>();
        for (const ev of requestEvents) {
            const bucket = map.get(ev.care_request_id) ?? [];
            bucket.push(ev);
            map.set(ev.care_request_id, bucket);
        }
        return map;
    }, [requestEvents]);

    const scheduledAppointments = useMemo(() => {
        const now = Date.now();
        return appointments.filter((a) => {
            if (a.status === "cancelled" || a.status === "completed") return false;
            return new Date(a.ends_at).getTime() >= now;
        });
    }, [appointments]);

    const pastAppointments = useMemo(() => {
        const now = Date.now();
        return appointments.filter((a) => {
            if (a.status === "cancelled" || a.status === "completed") return true;
            return new Date(a.ends_at).getTime() < now;
        });
    }, [appointments]);

    const filteredScheduledAppointments = useMemo(() => {
        let list = tab === "past" ? [...pastAppointments] : [...scheduledAppointments];
        if (filter === "this_week") {
            const now = new Date();
            const weekEnd = new Date(now);
            weekEnd.setDate(now.getDate() + 7);
            list = list.filter((a) => {
                const t = new Date(a.starts_at).getTime();
                return t >= now.getTime() && t <= weekEnd.getTime();
            });
        } else if (filter === "home") {
            list = list.filter((a) => a.location_type === "home");
        } else if (filter === "specialists") {
            list = list.filter((a) => a.location_type !== "home");
        }
        return list.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    }, [scheduledAppointments, pastAppointments, filter, tab]);

    const activeRequests = useMemo(
        () => requests.filter((r) => r.status === "submitted" || r.status === "in_review" || r.status === "scheduled"),
        [requests]
    );

    const selectedRequest = view.type === "request_status" ? requestById.get(view.requestId) ?? null : null;
    const selectedRequestEvents =
        view.type === "request_status" ? requestEventsByRequestId.get(view.requestId) ?? [] : [];
    const selectedAppointment =
        view.type === "appointment_detail" ? appointments.find((a) => a.id === view.appointmentId) ?? null : null;

    const requestTimeline = useMemo(() => {
        if (!selectedRequest) return [];
        const source = selectedRequestEvents;
        if (source.length > 0) return source;
        const seed: RequestEventRow[] = [
            {
                id: `${selectedRequest.id}-submitted`,
                care_request_id: selectedRequest.id,
                step_label: "Request Submitted",
                status_note: "Your request has been received by our care coordination team.",
                created_at: selectedRequest.created_at,
            },
            {
                id: `${selectedRequest.id}-review`,
                care_request_id: selectedRequest.id,
                step_label: "Clinical Review",
                status_note:
                    "Our care coordination team is currently reviewing your preferences and provider availability.",
                created_at: selectedRequest.created_at,
            },
            {
                id: `${selectedRequest.id}-confirm`,
                care_request_id: selectedRequest.id,
                step_label: "Confirmation",
                status_note:
                    "Once confirmed, you will receive prep instructions and the final location details.",
                created_at: selectedRequest.created_at,
            },
        ];
        return seed;
    }, [selectedRequest, selectedRequestEvents]);

    const submitCareRequest = async () => {
        if (!userId || submitting) return;
        setErrorText(null);
        if (!requestProviderId) {
            setErrorText("Select a healthcare professional before submitting your request.");
            return;
        }
        if (specialists.length === 0) {
            setErrorText("No professionals are available to choose yet. Try again later or contact support.");
            return;
        }
        setSubmitting(true);
        try {
            const serviceId = requestServiceId || null;
            const providerId = requestProviderId;
            const payload = {
                mother_user_id: userId,
                service_id: serviceId,
                preferred_date: requestDate || null,
                window_start: requestWindowStart ? `${requestWindowStart}:00` : null,
                window_end: requestWindowEnd ? `${requestWindowEnd}:00` : null,
                preferred_provider_user_id: providerId,
                notes: requestNotes.trim() || null,
                status: "submitted" as const,
            };
            const { data, error } = await supabase.from("care_requests").insert(payload).select("id").maybeSingle();
            if (error || !data?.id) {
                setErrorText(error?.message ?? "Could not submit request.");
                setSubmitting(false);
                return;
            }
            const nowIso = new Date().toISOString();
            await supabase.from("care_request_events").insert([
                {
                    care_request_id: data.id,
                    step_label: "Request Submitted",
                    status_note: "Your request has been received.",
                    created_at: nowIso,
                },
                {
                    care_request_id: data.id,
                    step_label: "Clinical Review",
                    status_note:
                        "Our care coordination team is currently reviewing your preferences and provider availability.",
                    created_at: new Date(Date.now() + 5_000).toISOString(),
                },
                {
                    care_request_id: data.id,
                    step_label: "Confirmation",
                    status_note:
                        "Once confirmed, you will receive prep instructions and the final location details.",
                    created_at: new Date(Date.now() + 10_000).toISOString(),
                },
            ]);
            await loadData(userId);
            setSubmitting(false);
            setView({ type: "request_status", requestId: data.id });
        } catch (e) {
            setSubmitting(false);
            setErrorText(e instanceof Error ? e.message : "Could not submit request.");
        }
    };

    const cancelCurrentRequest = async () => {
        if (!selectedRequest || !userId || savingAction) return;
        if (!confirm("Cancel this care request?")) return;
        setSavingAction(true);
        const { error } = await supabase
            .from("care_requests")
            .update({ status: "cancelled" })
            .eq("id", selectedRequest.id)
            .eq("mother_user_id", userId);
        if (!error) {
            await supabase.from("care_request_events").insert({
                care_request_id: selectedRequest.id,
                step_label: "Request Cancelled",
                status_note: "Request cancelled by mother.",
            });
            await loadData(userId);
            setView({ type: "list" });
        }
        setSavingAction(false);
    };

    const cancelCurrentAppointment = async () => {
        if (!selectedAppointment || !userId || savingAction) return;
        if (!confirm("Cancel this appointment?")) return;
        setSavingAction(true);
        const { error } = await supabase
            .from("appointments")
            .update({ status: "cancelled" })
            .eq("id", selectedAppointment.id)
            .eq("mother_user_id", userId);
        if (!error) {
            await loadData(userId);
            setView({ type: "list" });
        }
        setSavingAction(false);
    };

    if (loading) {
        return <p className="py-10 text-center text-sm text-muted">Loading schedule…</p>;
    }

    if (view.type === "request_form") {
        return (
            <div className="mx-auto w-full max-w-[520px] pb-24 lg:max-w-[760px] xl:max-w-[820px]">
                <article className="mb-5 flex gap-3 rounded-2xl border border-[#c5e4e1] bg-[#eaf6f5] px-4 py-3.5 text-[#325c60] shadow-[0_4px_12px_rgba(45,90,85,0.06)]">
                    <div className="shrink-0">
                        <span className="grid size-10 place-items-center rounded-full bg-white/70 text-brand shadow-sm">
                            <Info className="size-5" strokeWidth={2.25} aria-hidden />
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="m-0 text-[0.95rem] font-bold text-[#2a6b66]">Response Time</p>
                        <p className="mb-0 mt-1 text-[0.85rem] leading-snug text-[#3d4a5c]">
                            Our care team reviews all requests within 2 hours. For immediate medical emergencies, please call 911.
                        </p>
                    </div>
                </article>

                <div className="mb-5 lg:mb-8">
                    <p className="mb-2 text-[0.95rem] font-bold text-ink">Reason for Visit</p>
                    <div className="relative">
                        <Heart
                            className="pointer-events-none absolute left-3.5 top-1/2 z-[1] size-4 -translate-y-1/2 text-brand"
                            strokeWidth={2}
                            aria-hidden
                        />
                        <select
                            className="box-border h-12 w-full cursor-pointer appearance-none rounded-xl border border-[#dce6e9] bg-white py-0 pl-10 pr-3 text-[0.95rem] font-semibold text-ink outline-none"
                            value={requestServiceId}
                            onChange={(e) => setRequestServiceId(e.target.value)}
                        >
                            <option value="">Select a service</option>
                            {careServices.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mb-5 lg:mb-8">
                    <p className="mb-2 text-[0.95rem] font-bold text-ink">Preferred Timeframe</p>
                    <div className="relative mb-2.5">
                        <CalendarDays
                            className="pointer-events-none absolute left-3.5 top-1/2 z-[1] size-[18px] -translate-y-1/2 text-[#6a7688]"
                            strokeWidth={1.75}
                            aria-hidden
                        />
                        <input
                            type="date"
                            className="box-border h-12 w-full rounded-xl border border-[#dce6e9] bg-white py-0 pl-10 pr-3 text-[0.95rem] font-semibold text-ink outline-none"
                            value={requestDate}
                            onChange={(e) => setRequestDate(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="relative">
                            <Clock3
                                className="pointer-events-none absolute left-3.5 top-1/2 z-[1] size-[17px] -translate-y-1/2 text-[#6a7688]"
                                strokeWidth={1.75}
                                aria-hidden
                            />
                            <input
                                type="time"
                                className="box-border h-12 w-full rounded-xl border border-[#dce6e9] bg-white py-0 pl-10 pr-2 text-[0.95rem] font-semibold text-ink outline-none"
                                value={requestWindowStart}
                                onChange={(e) => setRequestWindowStart(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <Clock3
                                className="pointer-events-none absolute left-3.5 top-1/2 z-[1] size-[17px] -translate-y-1/2 text-[#6a7688]"
                                strokeWidth={1.75}
                                aria-hidden
                            />
                            <input
                                type="time"
                                className="box-border h-12 w-full rounded-xl border border-[#dce6e9] bg-white py-0 pl-10 pr-2 text-[0.95rem] font-semibold text-ink outline-none"
                                value={requestWindowEnd}
                                onChange={(e) => setRequestWindowEnd(e.target.value)}
                            />
                        </div>
                    </div>
                    <p className="mb-0 mt-2 text-[0.8rem] italic text-[#5c6a7a]">
                        Select your preferred window. We will match you with the first available specialist.
                    </p>
                </div>

                <div className="mb-5">
                    <div className="mb-2.5 flex items-start justify-between gap-2">
                        <div>
                            <p className="m-0 text-[0.95rem] font-bold text-ink">
                                Preferred healthcare professional{" "}
                                <span className="font-semibold text-[#a33f58]">(required)</span>
                            </p>
                            <p className="mb-0 mt-1 text-[0.8rem] text-muted">Choose who you would like for this visit.</p>
                        </div>
                        <button type="button" className="shrink-0 border-0 bg-transparent p-0 text-[0.82rem] font-semibold text-brand">
                            View All
                        </button>
                    </div>
                    {specialists.length === 0 ? (
                        <p className="m-0 rounded-2xl border border-dashed border-[#d5dde2] bg-[#f8fafb] px-4 py-6 text-center text-[0.86rem] text-muted">
                            No specialists in the directory yet. Ask your team to add healthcare professionals, or run the seed SQL in
                            the project docs.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2">
                            {specialists.map((s) => {
                                const selected = requestProviderId === s.userId;
                                const dot = specialistAvailabilityDotClass(s.availabilityStatus);
                                return (
                                    <button
                                        key={s.userId}
                                        type="button"
                                        className={`flex flex-col items-stretch rounded-2xl border bg-white px-2.5 py-3 text-left shadow-[0_4px_12px_rgba(35,55,65,0.05)] transition-shadow ${selected ? "border-brand ring-1 ring-brand/30" : "border-[#e4e9ec]"
                                            }`}
                                        onClick={() => setRequestProviderId(s.userId)}
                                    >
                                        <div className="relative mx-auto mb-2.5 size-[52px] shrink-0">
                                            {s.avatarUrl ? (
                                                <img src={s.avatarUrl} alt="" className="size-[52px] rounded-full object-cover" />
                                            ) : (
                                                <span className="grid size-[52px] place-items-center rounded-full bg-[#e8ebf0] text-[#9aa3b2]">
                                                    <ImageIcon className="size-6" strokeWidth={1.5} aria-hidden />
                                                </span>
                                            )}
                                            <span
                                                className={`absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-white ${dot}`}
                                                aria-hidden
                                            />
                                        </div>
                                        <p className="m-0 line-clamp-2 text-center text-[0.88rem] font-bold leading-tight text-ink">{s.name}</p>
                                        <p className="mb-2 line-clamp-2 text-center text-[0.75rem] text-[#5c6a7a]">{s.profession}</p>
                                        {s.listingBadge ? (
                                            <span
                                                className={`mt-auto w-full rounded-lg py-1.5 text-center text-[0.65rem] font-bold leading-tight ${s.availabilityStatus === "away"
                                                    ? "border border-[#d5dde2] bg-white text-[#3d4a5c]"
                                                    : "bg-[#d4efed] text-[#1f5c57]"
                                                    }`}
                                            >
                                                {s.listingBadge}
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mb-5 lg:mb-8">
                    <p className="mb-2 text-[0.95rem] font-bold text-ink">Symptoms or Notes</p>
                    <textarea
                        className="min-h-[128px] w-full resize-y rounded-2xl border border-[#dce6e9] bg-white px-3 py-3 text-[0.95rem] leading-snug text-ink placeholder:text-[#8b96a8] outline-none"
                        placeholder="Tell us a little bit about how you're feeling or specific questions you have…"
                        value={requestNotes}
                        onChange={(e) => setRequestNotes(e.target.value)}
                    />
                </div>

                {errorText ? <p className="mb-3 text-[0.9rem] text-danger">{errorText}</p> : null}

                <div className="mb-5 text-center">
                    <div className="mb-2 flex items-center justify-center gap-2 text-[#6a7688]">
                        <ShieldCheck className="size-5 shrink-0 text-[#4ea8a7]" strokeWidth={1.75} aria-hidden />
                        <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.12em] text-[#6a7688]">
                            HIPAA secure portal
                        </span>
                    </div>
                    <p className="m-0 text-[0.8rem] leading-relaxed text-muted">
                        Your medical information is encrypted and only shared with verified professionals assigned to your care.
                    </p>
                </div>

                <button
                    type="button"
                    className="mb-2 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-0 bg-brand text-[1rem] font-bold text-white shadow-[0_4px_14px_rgba(46,125,120,0.28)] disabled:bg-brand-disabled"
                    disabled={submitting || !requestProviderId || specialists.length === 0}
                    onClick={() => void submitCareRequest()}
                >
                    <Send className="size-[18px]" strokeWidth={2.25} aria-hidden />
                    {submitting ? "Submitting…" : "Submit Care Request"}
                </button>
            </div>
        );
    }

    if (view.type === "request_status" && selectedRequest) {
        const serviceJoin = unwrapMaybeArray(selectedRequest.care_services);
        const providerJoin = unwrapMaybeArray(selectedRequest.healthcare_professional_profiles);
        const providerProfile = unwrapMaybeArray(providerJoin?.profiles ?? null);
        const badge = toStatusBadge(selectedRequest.status);
        const serviceTitle = serviceJoin?.name?.trim() || "Postpartum Support";
        const serviceDescription = serviceJoin?.description?.trim() || "General Wellness Check";
        const windowOverview = formatRequestWindowOverview(
            selectedRequest.preferred_date,
            selectedRequest.window_start,
            selectedRequest.window_end
        );
        return (
            <div className="mx-auto w-full max-w-[520px] pb-24 lg:max-w-[900px] xl:max-w-[1100px]">
                <section className="mb-5 lg:mb-8">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h2 className="m-0 text-[1.35rem] font-bold tracking-tight text-ink">Timeline</h2>
                        <span
                            className={`shrink-0 rounded-full px-3 py-1.5 text-[0.72rem] font-bold uppercase tracking-wide ${badge.className}`}
                        >
                            {badge.label}
                        </span>
                    </div>
                    <div className="rounded-2xl border border-[#e4e9ec] bg-white px-4 py-5 shadow-[0_4px_16px_rgba(35,55,65,0.05)] lg:px-10 lg:py-10 xl:px-14">
                        <div className="relative">
                            {/*horizontal line (desktop only) */}
                            <span className="hidden lg:block absolute top-4 left-0 w-full h-[2px] bg-[#e2e8ec]" />
                            <div className="lg:grid lg:grid-cols-3 lg:gap-10 xl:gap-14">
                                {requestTimeline.map((step, idx) => {
                                    const isLast = idx === requestTimeline.length - 1;
                                    const state = careRequestTimelineStepState(idx, selectedRequest.status);
                                    const lineTeal = state === "done" && !isLast;
                                    const titleClass = state === "current" ? "text-brand" : "text-ink";
                                    const description = careRequestTimelineDescription(step, serviceTitle, selectedRequest.created_at);
                                    return (
                                        <div key={step.id} className={`relative pl-[2.125rem] lg:flex-1 lg:pl-0 lg:text-center lg:pt-10 ${idx > 0 ? "mt-5 lg:mt-0" : ""}`}>
                                            {!isLast ? (
                                                <span
                                                    className={`absolute left-[13px] top-[1.75rem] w-0.5 lg:hidden ${lineTeal ? "bg-brand" : "bg-[#e2e8ec]"}`}
                                                    style={{ height: "calc(100% + 0.5rem)" }}
                                                    aria-hidden
                                                />
                                            ) : null}
                                            <span
                                                className="absolute left-0 top-0.5 flex size-7 items-center justify-center rounded-full lg:left-1/2 lg:-translate-x-1/2 lg:top-0"
                                                aria-hidden
                                            >
                                                {state === "done" ? (
                                                    <span className="grid size-7 place-items-center rounded-full bg-brand text-white shadow-sm">
                                                        <Check className="size-4" strokeWidth={2.75} />
                                                    </span>
                                                ) : state === "current" ? (
                                                    <span className="grid size-7 place-items-center rounded-full border-2 border-brand bg-white text-brand">
                                                        <Clock3 className="size-3.5" strokeWidth={2} />
                                                    </span>
                                                ) : (
                                                    <span className="grid size-7 place-items-center rounded-full border-2 border-[#dde3e8] bg-white">
                                                        <span className="size-1.5 rounded-full bg-[#b8c2cc]" />
                                                    </span>
                                                )}
                                            </span>
                                            <p className={`m-0 text-[0.98rem] font-bold leading-snug ${titleClass}`}>{step.step_label}</p>
                                            <p className="mb-0 mt-1.5 text-[0.88rem] leading-relaxed text-[#5c6a7a] lg:text-[0.95rem]">{description}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-5 rounded-2xl border border-[#e4e9ec] bg-white px-4 py-5 shadow-[0_4px_16px_rgba(35,55,65,0.05)] lg:px-10 lg:py-8 xl:px-14">
                    <h3 className="mb-4 mt-0 text-[1.05rem] font-bold text-ink">Request Overview</h3>
                    <div className="mb-5 flex items-start justify-between gap-3 border-b border-[#eef2f4] pb-4">
                        <div className="min-w-0">
                            <p className="m-0 text-[1.05rem] font-bold text-brand">{serviceTitle}</p>
                            <p className="m-0 mt-0.5 text-[0.86rem] text-[#5c6a7a]">{serviceDescription}</p>
                        </div>
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eef5f5] text-brand">
                            <CalendarDays className="size-5" strokeWidth={1.75} aria-hidden />
                        </span>
                    </div>

                    <div className="flex gap-3">
                        <div className="relative shrink-0">
                            {providerProfile?.avatar_url ? (
                                <img
                                    src={providerProfile.avatar_url}
                                    alt=""
                                    className="size-14 rounded-full object-cover"
                                />
                            ) : (
                                <span className="grid size-14 place-items-center rounded-full bg-[#e8ebf0] text-[#8b96a8]">
                                    <UserRound className="size-6" strokeWidth={1.5} aria-hidden />
                                </span>
                            )}
                            <span
                                className="absolute bottom-0.5 right-0.5 size-3 rounded-full border-2 border-white bg-[#22c55e]"
                                aria-hidden
                            />
                        </div>
                        <div className="min-w-0">
                            <p className="m-0 text-[0.65rem] font-extrabold uppercase tracking-[0.08em] text-[#8b96a8]">
                                Preferred provider
                            </p>
                            <p className="m-0 mt-1 text-[0.95rem] font-bold text-ink">
                                {providerProfile?.full_name?.trim() || "Care team match pending"}
                            </p>
                            <p className="m-0 mt-0.5 text-[0.84rem] text-[#5c6a7a]">
                                {providerJoin?.professional_title?.trim() ||
                                    providerJoin?.profession?.trim() ||
                                    "Postpartum specialist"}
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 flex gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eef1f4] text-[#7a8799]">
                            <Clock3 className="size-[18px]" strokeWidth={1.75} aria-hidden />
                        </span>
                        <div className="min-w-0">
                            <p className="m-0 text-[0.65rem] font-extrabold uppercase tracking-[0.08em] text-[#8b96a8]">
                                Requested window
                            </p>
                            <p className="m-0 mt-1 text-[0.95rem] font-bold text-ink">{windowOverview.dateLine}</p>
                            <p className="m-0 mt-0.5 text-[0.84rem] text-[#5c6a7a]">{windowOverview.timeLine}</p>
                        </div>
                    </div>

                    {selectedRequest.notes?.trim() ? (
                        <div className="mt-5 border-t border-[#eef2f4] pt-5">
                            <div className="flex gap-3">
                                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#eef1f4] text-[#7a8799]">
                                    <FileText className="size-[18px]" strokeWidth={1.75} aria-hidden />
                                </span>
                                <div className="min-w-0">
                                    <p className="m-0 text-[0.65rem] font-extrabold uppercase tracking-[0.08em] text-[#8b96a8]">
                                        Notes to care team
                                    </p>
                                    <p className="mb-0 mt-1 text-[0.9rem] italic leading-relaxed text-ink">
                                        &ldquo;{selectedRequest.notes.trim()}&rdquo;
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </section>

                <div className="mb-5 flex gap-3 rounded-2xl border border-[#c5e4e1] bg-[#eaf6f5] px-4 py-3.5 text-[#325c60]">
                    <span className="grid size-9 shrink-0 place-items-center self-start rounded-full bg-white/70 text-brand shadow-sm">
                        <Info className="size-[18px]" strokeWidth={2.25} aria-hidden />
                    </span>
                    <p className="m-0 text-[0.84rem] leading-snug">
                        <span className="font-bold text-[#2a6b66]">Quick Response Promise</span>
                        <span className="text-[#3d4a5c]"> — Requests are typically processed within 2–4 business hours. You’ll be notified
                            immediately after confirmation.</span>
                    </p>
                </div>

                <div className="lg:flex lg:justify-end lg:gap-4">
                    <button
                        type="button"
                        className="mb-2.5 flex h-[52px] w-full items-center justify-center rounded-2xl border border-[#d4dce1] bg-white text-[0.96rem] font-bold text-[#1f232b] lg:mb-0 lg:w-[220px]"
                        onClick={() => {
                            setRequestServiceId(serviceJoin ? (careServices.find((s) => s.name === serviceJoin.name)?.id ?? "") : "");
                            setRequestDate(selectedRequest.preferred_date ?? localDateKey(new Date()));
                            setRequestWindowStart((selectedRequest.window_start ?? "09:00").slice(0, 5));
                            setRequestWindowEnd((selectedRequest.window_end ?? "17:00").slice(0, 5));
                            setRequestProviderId(selectedRequest.preferred_provider_user_id ?? "");
                            setRequestNotes(selectedRequest.notes ?? "");
                            setView({ type: "request_form", seedRequestId: selectedRequest.id });
                        }}
                    >
                        Reschedule Request
                    </button>
                    <button
                        type="button"
                        className="flex h-[52px] w-full items-center justify-center rounded-2xl border border-[#e8a4b8] bg-white text-[0.96rem] font-bold text-[#a33f58] disabled:opacity-60 lg:w-[180px]"
                        disabled={savingAction}
                        onClick={() => void cancelCurrentRequest()}
                    >
                        Cancel Request
                    </button>
                </div>
            </div>
        );
    }

    if (view.type === "appointment_detail" && selectedAppointment) {
        const providerJoin = unwrapMaybeArray(selectedAppointment.healthcare_professional_profiles);
        const providerProfile = unwrapMaybeArray(providerJoin?.profiles ?? null);
        const providerName = providerProfile?.full_name?.trim() || "Assigned Specialist";
        const profession = providerJoin?.profession?.trim() || "Postpartum Recovery Specialist";
        const durationMinutes = Math.max(
            1,
            Math.round((new Date(selectedAppointment.ends_at).getTime() - new Date(selectedAppointment.starts_at).getTime()) / 60000)
        );
        const locationLabel =
            selectedAppointment.location_type === "virtual"
                ? `Virtual Visit${selectedAppointment.meeting_url ? " (Encrypted Video Link)" : ""}`
                : selectedAppointment.location_type === "home"
                    ? "Home Visit"
                    : "Clinic Visit";
        const locationDetails = selectedAppointment.location_detail?.trim() || "Location details shared after confirmation";
        const prepTips = (selectedAppointment.prep_notes?.split(/\n+/).map((x) => x.trim()).filter(Boolean) ?? []).slice(0, 6);

        return (
            <div className="mx-auto w-full max-w-[520px] pb-24">
                <article className="mb-5 rounded-2xl border border-[#e8ecee] bg-white px-4 py-4 text-center shadow-[0_4px_16px_rgba(35,55,65,0.06)]">
                    {providerProfile?.avatar_url ? (
                        <img src={providerProfile.avatar_url} alt="" className="mx-auto mb-2 size-[84px] rounded-full object-cover" />
                    ) : (
                        <span className="mx-auto mb-2 grid size-[84px] place-items-center rounded-full bg-[#eceff2] text-[#8b96a8]">
                            <UserRound size={34} />
                        </span>
                    )}
                    <h2 className="m-0 text-[1.55rem] font-black tracking-tight text-ink">{providerName}</h2>
                    <p className="mb-0 mt-1 text-[0.92rem] font-semibold text-muted">{profession}</p>
                    <span className="mt-2 inline-flex rounded-full bg-[#e8f6f5] px-2.5 py-1 text-[0.72rem] font-extrabold text-brand">
                        Highly Rated
                    </span>
                </article>

                <section className="mb-4 rounded-2xl border border-[#e8ecee] bg-white px-4 py-4 shadow-[0_4px_16px_rgba(35,55,65,0.06)]">
                    <div className="grid gap-3.5">
                        <div className="flex items-start gap-2.5">
                            <CalendarDays className="mt-0.5 text-[#9aa5b5]" size={18} />
                            <div>
                                <p className="m-0 text-[0.68rem] font-extrabold uppercase tracking-wide text-[#8b96a8]">Date</p>
                                <p className="m-0 text-[1rem] font-bold text-ink">{formatAppointmentDate(selectedAppointment.starts_at)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <Clock3 className="mt-0.5 text-[#9aa5b5]" size={18} />
                            <div>
                                <p className="m-0 text-[0.68rem] font-extrabold uppercase tracking-wide text-[#8b96a8]">Time</p>
                                <p className="m-0 text-[1rem] font-bold text-ink">
                                    {formatTime(selectedAppointment.starts_at)} - {formatTime(selectedAppointment.ends_at)} ({durationMinutes} min)
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <MapPin className="mt-0.5 text-[#9aa5b5]" size={18} />
                            <div>
                                <p className="m-0 text-[0.68rem] font-extrabold uppercase tracking-wide text-[#8b96a8]">Location</p>
                                <p className="m-0 text-[1rem] font-bold text-ink">{locationLabel}</p>
                                <p className="m-0 text-[0.84rem] text-muted">{locationDetails}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <Phone className="mt-0.5 text-[#9aa5b5]" size={18} />
                            <div>
                                <p className="m-0 text-[0.68rem] font-extrabold uppercase tracking-wide text-[#8b96a8]">Contact Info</p>
                                <p className="m-0 text-[1rem] font-bold text-ink">{selectedAppointment.contact_phone?.trim() || "Shared after confirmation"}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-4 overflow-hidden rounded-2xl border border-[#f0d7dd] bg-[#fdf2f4]">
                    <div className="bg-[#f8e5e9] px-4 py-2.5">
                        <p className="m-0 text-[0.75rem] font-extrabold uppercase tracking-wide text-[#8b5465]">Preparation Tips</p>
                    </div>
                    <div className="px-4 py-3.5">
                        {(prepTips.length > 0 ? prepTips : [
                            "Find a quiet, comfortable space where you can speak freely.",
                            "Prepare any recent discharge papers or vitals if available.",
                            "Check internet/device connection 5 minutes before the visit.",
                        ]).map((tip) => (
                            <p key={tip} className="mb-2 mt-0 flex items-start gap-2 text-[0.92rem] text-[#5a4a52] last:mb-0">
                                <span className="mt-[7px] size-1.5 rounded-full bg-[#e3a9b8]" aria-hidden />
                                <span>{tip}</span>
                            </p>
                        ))}
                    </div>
                </section>

                <div className="mb-3 rounded-2xl border border-[#e8ecee] bg-white px-4 py-3.5 text-[0.88rem] text-muted">
                    <p className="m-0 font-bold text-ink">Video Link Ready</p>
                    <p className="mb-0 mt-1">
                        The link becomes active 10 minutes before your scheduled time.
                        {selectedAppointment.meeting_url ? (
                            <>
                                {" "}
                                <a href={selectedAppointment.meeting_url} target="_blank" rel="noreferrer" className="font-bold text-brand">
                                    Join meeting
                                </a>
                            </>
                        ) : null}
                    </p>
                </div>

                <a
                    href={createGoogleCalendarUrl(selectedAppointment, providerName, locationDetails)}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border-0 bg-brand text-[0.96rem] font-bold text-white no-underline"
                >
                    <CalendarCheck2 size={18} />
                    Add to My Calendar
                </a>
                <button
                    type="button"
                    className="flex h-[52px] w-full items-center justify-center rounded-xl border border-[#e8a4b8] bg-white text-[0.96rem] font-bold text-[#a33f58] disabled:opacity-60"
                    disabled={savingAction}
                    onClick={() => void cancelCurrentAppointment()}
                >
                    Cancel Appointment
                </button>
            </div>
        );
    }

    return (
        <div className="relative mx-auto w-full max-w-[520px] pb-24 lg:max-w-[720px]">
            <div
                className="mb-4 flex rounded-xl bg-shell-sidebar px-1.5 py-1 shadow-[inset_0_1px_2px_rgba(26,44,52,0.05)] lg:mx-auto lg:max-w-[720px]"
                role="tablist"
                aria-label="Schedule"
            >
                {([
                    ["requests", "Requests"],
                    ["scheduled", "Scheduled"],
                    ["past", "Past"],
                ] as const).map(([id, label]) => {
                    const selected = tab === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            className={`min-h-9 flex-1 rounded-[10px] text-[0.78rem] font-semibold transition-colors ${selected ? "bg-white text-[#2a3340] shadow-sm" : "text-[#6a7486]"
                                }`}
                            onClick={() => setTab(id)}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {(tab === "scheduled" || tab === "past") ? (
                <>
                    <div
                        className="-mx-0.5 mb-4 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:thin]"
                        role="group"
                        aria-label="Filter appointments"
                    >
                        {([
                            ["all", "All"],
                            ["this_week", "This Week"],
                            ["specialists", "Specialists"],
                            ["home", "Home Visits"],
                        ] as const).map(([id, label]) => {
                            const selected = filter === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    aria-pressed={selected}
                                    className={`shrink-0 rounded-full px-4 py-2 text-[0.78rem] font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${selected
                                        ? "bg-brand text-white"
                                        : "bg-[#eef1f3] text-[#2a3340]"
                                        }`}
                                    onClick={() => setFilter(id)}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="m-0 text-[1.3rem] font-bold tracking-tight text-ink">
                            {tab === "past" ? "Past Care" : "Upcoming Care"}
                        </h2>
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full border border-[#d5dde2] bg-white px-3 py-1.5 text-[0.74rem] font-bold uppercase tracking-wide text-[#5c6a7a]"
                        >
                            <Filter size={13} />
                            Sort
                        </button>
                    </div>

                    {filteredScheduledAppointments.length === 0 ? (
                        <div className="rounded-2xl border border-[#e8ecee] bg-white px-4 py-8 text-center text-muted shadow-[0_4px_16px_rgba(35,55,65,0.05)]">
                            {tab === "past" ? "No past appointments yet." : "No upcoming appointments for this filter."}
                        </div>
                    ) : (
                        <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
                            {filteredScheduledAppointments.map((a) => {
                                const providerJoin = unwrapMaybeArray(a.healthcare_professional_profiles);
                                const providerProfile = unwrapMaybeArray(providerJoin?.profiles ?? null);
                                const providerName = providerProfile?.full_name?.trim() || "Assigned Specialist";
                                const profession = providerJoin?.profession?.trim() || "Postpartum Specialist";
                                const badge = toStatusBadge(a.status);
                                return (
                                    <li
                                        key={a.id}
                                        className="rounded-2xl border border-[#e8ecee] bg-white px-4 py-3.5 shadow-[0_4px_16px_rgba(35,55,65,0.06)]"
                                    >
                                        <div className="mb-2.5 flex items-start justify-between gap-2.5">
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                {providerProfile?.avatar_url ? (
                                                    <img src={providerProfile.avatar_url} alt="" className="size-11 rounded-full object-cover" />
                                                ) : (
                                                    <span className="grid size-11 place-items-center rounded-full bg-[#eceff2] text-[#8b96a8]">
                                                        <UserRound size={19} />
                                                    </span>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="m-0 truncate text-[1rem] font-extrabold text-ink">{providerName}</p>
                                                    <p className="m-0 truncate text-[0.84rem] text-muted">{profession}</p>
                                                </div>
                                            </div>
                                            <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-extrabold uppercase tracking-wide ${badge.className}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                        <div className="mb-2.5 border-t border-[#edf1f3] pt-2.5 text-[0.9rem] text-[#33404d]">
                                            <p className="m-0 font-bold">
                                                {formatShortDate(a.starts_at)} · {formatTime(a.starts_at)}
                                            </p>
                                            <p className="m-0 mt-1 text-[0.86rem] text-muted">{a.location_detail?.trim() || "Location pending confirmation"}</p>
                                        </div>
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-[0.88rem] font-bold text-brand"
                                            onClick={() => setView({ type: "appointment_detail", appointmentId: a.id })}
                                        >
                                            View Details
                                            <ChevronRight size={16} />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {tab === "scheduled" ? (
                        <>
                            <div className="mt-5 rounded-2xl border border-[#dbe7e7] bg-[#eff7f7] px-4 py-5 text-center">
                                <span className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-[#ddf1f0] text-brand">
                                    <HeartPulse size={22} />
                                </span>
                                <p className="m-0 text-[1.15rem] font-extrabold text-[#2b3b44]">Need specialized help?</p>
                                <p className="mb-3 mt-1 text-[0.9rem] text-muted">Our on-call nurses are available 24/7 for urgent postpartum guidance.</p>
                                <button type="button" className="h-10 rounded-full border border-[#9ecfca] bg-white px-5 text-[0.86rem] font-bold text-[#2a6b66]">
                                    Speak to Nurse
                                </button>
                            </div>
                            <button
                                type="button"
                                className="fixed bottom-[calc(88px+env(safe-area-inset-bottom,0))] lg:hidden right-5 z-[35] grid size-14 place-items-center rounded-full border-0 bg-brand text-white shadow-[0_8px_24px_rgba(46,125,120,0.35)] lg:bottom-8 lg:right-8"
                                aria-label="Request care"
                                onClick={() => setView({ type: "request_form" })}
                            >
                                <Plus className="size-6 stroke-[2.5]" aria-hidden />
                            </button>
                        </>
                    ) : null}
                </>
            ) : (
                <>
                    <h2 className="mb-3 mt-0 text-[1.3rem] font-bold tracking-tight text-ink">Requests</h2>
                    {activeRequests.length === 0 ? (
                        <div className="rounded-2xl border border-[#e8ecee] bg-white px-4 py-8 text-center text-muted shadow-[0_4px_16px_rgba(35,55,65,0.05)]">
                            No active requests. Tap + in Scheduled tab to request care.
                        </div>
                    ) : (
                        <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
                            {activeRequests.map((r) => {
                                const badge = toStatusBadge(r.status);
                                const serviceJoin = unwrapMaybeArray(r.care_services);
                                const provider = r.preferred_provider_user_id ? specialistMap.get(r.preferred_provider_user_id) : undefined;
                                return (
                                    <li
                                        key={r.id}
                                        className="rounded-2xl border border-[#e8ecee] bg-white px-4 py-3.5 shadow-[0_4px_16px_rgba(35,55,65,0.06)]"
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <p className="m-0 text-[1rem] font-extrabold text-ink">{serviceJoin?.name?.trim() || "Care Request"}</p>
                                            <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-extrabold uppercase tracking-wide ${badge.className}`}>
                                                {badge.label}
                                            </span>
                                        </div>
                                        <p className="m-0 text-[0.84rem] text-muted">
                                            {provider?.name ? `Preferred: ${provider.name}` : "Preferred specialist not selected"}
                                        </p>
                                        <p className="m-0 mt-1 text-[0.84rem] text-muted">
                                            {formatWindowRange(r.preferred_date, r.window_start, r.window_end)}
                                        </p>
                                        <button
                                            type="button"
                                            className="mt-2 inline-flex items-center gap-1 border-0 bg-transparent p-0 text-[0.88rem] font-bold text-brand"
                                            onClick={() => setView({ type: "request_status", requestId: r.id })}
                                        >
                                            View Details
                                            <ChevronRight size={16} />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            )}

            <button
                type="button"
                onClick={() => setView({ type: "request_form" })}
                className="fixed bottom-[calc(88px+env(safe-area-inset-bottom,0))] right-5 z-[35] hidden size-14 place-items-center rounded-full border-0 bg-brand text-white shadow-[0_8px_24px_rgba(46,125,120,0.35)] lg:grid"
                aria-label="Request care"
            >
                <Plus className="size-6 stroke-[2.5]" aria-hidden />
            </button>
        </div>
    );
}

