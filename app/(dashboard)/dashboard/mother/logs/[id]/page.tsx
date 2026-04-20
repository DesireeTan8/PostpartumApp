"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    Activity,
    ClipboardCheck,
    Droplets,
    Moon,
    Pencil,
    Smile,
    Stethoscope,
    Thermometer,
    Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";
import { useMotherPageHeader } from "@/components/layout/mother-dashboard-header-context";
import { MOTHER_DASHBOARD_HEADER_ICON_LINK } from "@/components/layout/mother-dashboard-header-chrome";

type HealthLogDetailRow = {
    id: string;
    recorded_at: string;
    mood_score: number | null;
    mood_label: string | null;
    pain_level: number | null;
    pain_descriptor: string | null;
    bleeding_level: string | null;
    sleep_hours: number | null;
    sleep_quality: string | null;
    temperature_f: number | null;
    reflections: string | null;
};

type ClinicalNoteRow = {
    author_role_label: string | null;
    note_body: string;
    created_at: string;
};

function formatDateOnly(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function formatTimeOnly(iso: string): string {
    return new Date(iso)
        .toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
        .toUpperCase();
}

function toTitleCase(value: string): string {
    return value
        .split(/[_\s]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

function moodHeadline(log: HealthLogDetailRow): string {
    if (log.mood_label?.trim()) return toTitleCase(log.mood_label.trim());
    const s = log.mood_score;
    if (s == null) return "Mood Not Recorded";
    if (s >= 9) return "Calm & Peaceful";
    if (s >= 7) return "Steady & Positive";
    if (s >= 5) return "Balanced";
    return "Needs Extra Care";
}

function painSummary(log: HealthLogDetailRow): string {
    if (log.pain_level == null) return "Not Recorded";
    if (log.pain_descriptor?.trim()) return toTitleCase(log.pain_descriptor.trim());
    if (log.pain_level >= 7) return "High Discomfort";
    if (log.pain_level >= 4) return "Moderate Discomfort";
    return "Mild Discomfort";
}

function bleedingSummary(level: string | null): string {
    if (!level) return "Not Recorded";
    if (level === "none") return "No Flow";
    if (level === "spotting") return "Spotting";
    if (level === "light") return "Normal Flow";
    if (level === "medium") return "Moderate Flow";
    return "Heavy Flow";
}

function temperatureSummary(t: number | null): string {
    if (t == null) return "Not Recorded";
    if (t >= 97 && t <= 99.5) return "Within Range";
    return "Review Needed";
}

function sleepSummary(hours: number | null, sleepQuality: string | null): string {
    if (sleepQuality?.trim()) return `Rest Quality: ${toTitleCase(sleepQuality.trim())}`;
    if (hours == null) return "Not Recorded";
    if (hours >= 7) return "Rest Quality: Good";
    if (hours >= 5) return "Rest Quality: Fair";
    return "Rest Quality: Low";
}

function formatSleepHoursDisplay(hours: number | null): string {
    if (hours == null) return "—";
    const n = Number(hours);
    if (!Number.isFinite(n)) return "—";
    const text = Math.abs(n % 1) < 0.05 ? String(Math.round(n)) : n.toFixed(1);
    return `${text} hours`;
}

export default function HealthLogDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { setPageHeader } = useMotherPageHeader();
    const id = typeof params.id === "string" ? params.id : "";
    const [userId, setUserId] = useState<string | null>(null);
    const [log, setLog] = useState<HealthLogDetailRow | null>(null);
    const [clinicalNote, setClinicalNote] = useState<ClinicalNoteRow | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let active = true;
        void (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                router.replace("/auth/sign-in");
                return;
            }
            if (!active) return;
            setUserId(user.id);
            const { data, error } = await supabase
                .from("health_logs")
                .select(
                    "id, recorded_at, mood_score, mood_label, pain_level, pain_descriptor, bleeding_level, sleep_hours, sleep_quality, temperature_f, reflections"
                )
                .eq("id", id)
                .eq("mother_user_id", user.id)
                .maybeSingle();

            if (!active) return;
            if (error || !data) {
                setLog(null);
            } else {
                setLog(data as HealthLogDetailRow);
                const { data: note } = await supabase
                    .from("health_log_clinical_notes")
                    .select("author_role_label, note_body, created_at")
                    .eq("health_log_id", (data as HealthLogDetailRow).id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (!active) return;
                setClinicalNote((note as ClinicalNoteRow | null) ?? null);
            }
            setLoading(false);
        })();
        return () => {
            active = false;
        };
    }, [id, router]);

    useEffect(() => {
        if (!id) return;
        setPageHeader({
            title: "Log details",
            layout: "detail",
            backHref: "/dashboard/mother/logs",
            backLabel: "Back to health logs",
            trailing: (
                <Link
                    href={`/dashboard/mother/logs/new?edit=${id}`}
                    className={MOTHER_DASHBOARD_HEADER_ICON_LINK}
                    aria-label="Edit entry"
                >
                    <Pencil size={18} aria-hidden />
                </Link>
            ),
        });
        return () => setPageHeader(null);
    }, [id, setPageHeader]);

    const onDelete = async () => {
        if (!log || !userId || deleting) return;
        if (!confirm("Delete this entry? This cannot be undone.")) return;
        setDeleting(true);
        const { error } = await supabase
            .from("health_logs")
            .delete()
            .eq("id", log.id)
            .eq("mother_user_id", userId);
        setDeleting(false);
        if (error) {
            alert(error.message);
            return;
        }
        router.replace("/dashboard/mother/logs");
    };

    return (
        <MotherDashboardShell>
            <div className="mx-auto max-w-[620px] px-0.5 pb-7 sm:px-1.5 sm:pb-8">
                {loading ? (
                    <p className="text-sm text-[#4f586b]">Loading…</p>
                ) : !log ? (
                    <p className="text-[0.92rem] text-danger">Log not found.</p>
                ) : (
                    <>
                        <section className="mb-5 text-left">
                            <p className="m-0 text-[0.7rem] font-extrabold uppercase tracking-[0.06em] text-[#8b96a8]">
                                Recorded on
                            </p>
                            <p className="my-1.5 mb-1 text-[1.75rem] font-black leading-[1.1] tracking-tight text-[#1a2332] sm:text-[2rem]">
                                {formatDateOnly(log.recorded_at)}
                            </p>
                            <p className="m-0 text-[0.95rem] font-medium text-[#7d8a9c]">{formatTimeOnly(log.recorded_at)}</p>
                        </section>

                        <section className="mb-5 rounded-lg border border-[#e3efee] bg-[#f4f9f9] px-5 py-6 text-center sm:px-6">
                            <div className="mx-auto mb-3 grid size-[56px] place-items-center rounded-full border-[3px] border-brand/55 bg-white text-brand shadow-[inset_0_0_0_1px_rgba(78,168,167,0.12)]">
                                <Smile size={28} strokeWidth={2} aria-hidden />
                            </div>
                            <p className="m-0 mb-3 inline-flex rounded-full bg-white px-3.5 py-1 text-[0.7rem] font-extrabold uppercase tracking-wide text-brand">
                                Emotional State
                            </p>
                            <h2 className="m-0 mb-2 text-[1.45rem] font-black leading-snug text-[#1a2332] sm:text-[1.6rem]">
                                {moodHeadline(log)}
                            </h2>
                            <p className="m-0 text-[0.92rem] text-[#6b7a8c]">
                                Mood Score: {log.mood_score != null ? `${log.mood_score}/10` : "—"}
                            </p>
                        </section>

                        <section className="mb-5 grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-slate-100 bg-white px-3.5 py-3.5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                                <span className="mb-2 inline-flex items-center gap-1.5 text-[0.72rem] font-bold text-[#64748b]">
                                    <Activity size={15} className="shrink-0 text-[#e85d5d]" aria-hidden /> Pain Level
                                </span>
                                <strong className="mb-1 block text-[1.35rem] font-black leading-tight tracking-tight text-[#1a2332]">
                                    {log.pain_level != null ? `${log.pain_level}/10` : "—"}
                                </strong>
                                <p className="m-0 text-[0.8rem] leading-snug text-[#6b7a8c]">{painSummary(log)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-white px-3.5 py-3.5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                                <span className="mb-2 inline-flex items-center gap-1.5 text-[0.72rem] font-bold text-[#64748b]">
                                    <Droplets size={15} className="shrink-0 text-[#e85d5d]" aria-hidden /> Bleeding
                                </span>
                                <strong className="mb-1 block text-[1.35rem] font-black leading-tight tracking-tight text-[#1a2332]">
                                    {log.bleeding_level ? toTitleCase(log.bleeding_level) : "—"}
                                </strong>
                                <p className="m-0 text-[0.8rem] leading-snug text-[#6b7a8c]">{bleedingSummary(log.bleeding_level)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-white px-3.5 py-3.5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                                <span className="mb-2 inline-flex items-center gap-1.5 text-[0.72rem] font-bold text-[#64748b]">
                                    <Moon size={15} className="shrink-0 text-brand" aria-hidden /> Sleep
                                </span>
                                <strong className="mb-1 block text-[1.35rem] font-black leading-tight tracking-tight text-[#1a2332]">
                                    {formatSleepHoursDisplay(log.sleep_hours)}
                                </strong>
                                <p className="m-0 text-[0.8rem] leading-snug text-[#6b7a8c]">{sleepSummary(log.sleep_hours, log.sleep_quality)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-white px-3.5 py-3.5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                                <span className="mb-2 inline-flex items-center gap-1.5 text-[0.72rem] font-bold text-[#64748b]">
                                    <Thermometer size={15} className="shrink-0 text-[#3d4f5f]" aria-hidden /> Temperature
                                </span>
                                <strong className="mb-1 block text-[1.35rem] font-black leading-tight tracking-tight text-[#1a2332]">
                                    {log.temperature_f != null ? `${log.temperature_f}°F` : "—"}
                                </strong>
                                <p className="m-0 text-[0.8rem] leading-snug text-[#6b7a8c]">{temperatureSummary(log.temperature_f)}</p>
                            </div>
                        </section>

                        <section className="mb-5">
                            <h3 className="m-0 mb-2.5 flex items-center gap-2 text-[1.02rem] font-extrabold text-[#1a2332]">
                                <ClipboardCheck size={18} className="shrink-0 text-[#4a5568]" aria-hidden /> Your Reflections
                            </h3>
                            <blockquote className="m-0 rounded-lg border border-slate-100 bg-white px-4 py-3.5 italic leading-[1.6] text-[#2d3748] shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                                {log.reflections?.trim() ? `“${log.reflections.trim()}”` : "No reflections added for this entry."}
                            </blockquote>
                        </section>

                        <section className="mb-5">
                            <h3 className="m-0 mb-2.5 flex items-center gap-2 text-[1.02rem] font-extrabold text-[#1a2332]">
                                <Stethoscope size={18} className="shrink-0 text-[#4a5568]" aria-hidden /> Clinical Insights
                            </h3>
                            {clinicalNote ? (
                                <article className="rounded-lg border border-slate-100 border-l-[5px] border-l-brand bg-slate-50 px-4 py-3.5">
                                    <p className="mb-2 mt-0 text-[0.72rem] font-extrabold uppercase tracking-wide text-brand">
                                        {clinicalNote.author_role_label?.trim()
                                            ? `${clinicalNote.author_role_label.toUpperCase()} NOTES`
                                            : "CLINICAL NOTES"}
                                    </p>
                                    <p className="m-0 text-[0.95rem] leading-relaxed text-[#2d3748]">{clinicalNote.note_body}</p>
                                </article>
                            ) : (
                                <article className="rounded-lg border border-slate-100 border-l-[5px] border-l-brand bg-slate-50 px-4 py-3.5">
                                    <p className="m-0 text-[0.95rem] leading-relaxed text-[#2d3748]">
                                        No clinical insights yet for this entry.
                                    </p>
                                </article>
                            )}
                        </section>

                        <p className="mb-4 text-center text-[0.8rem] leading-relaxed text-[#7a8899]">
                            If any of these metrics feel incorrect, you can edit the entry or remove it entirely.
                        </p>

                        <div className="grid gap-3">
                            <button
                                type="button"
                                className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-[#f0b4b4] bg-white text-[0.92rem] font-extrabold text-[#d24a4a] shadow-[0_1px_0_rgba(15,23,42,0.04)] disabled:opacity-70"
                                onClick={onDelete}
                                disabled={deleting}
                            >
                                <Trash2 size={17} className="text-[#d24a4a]" aria-hidden />
                                {deleting ? "Deleting…" : "Delete Entry"}
                            </button>
                            <Link
                                href="/dashboard/mother/logs"
                                className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-slate-200/80 bg-slate-100 text-[0.92rem] font-extrabold text-[#2d3748] no-underline"
                            >
                                Return to History
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </MotherDashboardShell>
    );
}
