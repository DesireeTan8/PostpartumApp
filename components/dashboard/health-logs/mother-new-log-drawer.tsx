"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
    Activity,
    ArrowLeft,
    CalendarDays,
    ClipboardCheck,
    Clock,
    Frown,
    Save,
    Smile,
    Thermometer,
    Trash2,
    XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type BleedingLevel = "none" | "spotting" | "light" | "medium" | "heavy";

type MotherNewLogDrawerProps = {
    closeTo?: string;
    onClose?: () => void;
    onSaved?: () => void;
};

function todayLocalISODate(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function padDatePart(n: number): string {
    return String(n).padStart(2, "0");
}

function localISODateFromRecordedAt(iso: string): string {
    const d = new Date(iso);
    return `${d.getFullYear()}-${padDatePart(d.getMonth() + 1)}-${padDatePart(d.getDate())}`;
}

/** Chosen entry day + current local time (avoids every log sharing noon). */
function recordedAtFromEntryDate(entryDate: string): string {
    const parts = entryDate.split("-");
    if (parts.length !== 3) return new Date().toISOString();
    const y = parseInt(parts[0] ?? "", 10);
    const mo = parseInt(parts[1] ?? "", 10);
    const day = parseInt(parts[2] ?? "", 10);
    if (![y, mo, day].every((n) => Number.isFinite(n))) return new Date().toISOString();
    const now = new Date();
    const dt = new Date(y, mo - 1, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return dt.toISOString();
}

/** When editing, keep the same clock time if only the calendar day changes. */
function recordedAtPreservingTime(entryDate: string, previousIso: string | null): string {
    if (!previousIso) return recordedAtFromEntryDate(entryDate);
    const prev = new Date(previousIso);
    const parts = entryDate.split("-");
    if (parts.length !== 3) return previousIso;
    const y = parseInt(parts[0] ?? "", 10);
    const mo = parseInt(parts[1] ?? "", 10);
    const day = parseInt(parts[2] ?? "", 10);
    if (![y, mo, day].every((n) => Number.isFinite(n))) return previousIso;
    const dt = new Date(y, mo - 1, day, prev.getHours(), prev.getMinutes(), prev.getSeconds(), prev.getMilliseconds());
    return dt.toISOString();
}

function moodLabelFromScore(score: number): string {
    if (score >= 8) return "great";
    if (score >= 5) return "stable";
    return "low energy";
}

function moodQualityPhrase(score: number): string {
    if (score >= 9) return "Mostly Excellent";
    if (score >= 7) return "Mostly Steady";
    if (score >= 5) return "Moderately Steady";
    if (score >= 3) return "Needs Attention";
    return "Mostly Low";
}

function normalizeBleeding(level: string | null | undefined): BleedingLevel {
    const v = (level ?? "light").toLowerCase();
    if (v === "none" || v === "spotting" || v === "light" || v === "medium" || v === "heavy") return v;
    return "light";
}

function DrawerCloseControl({
    className,
    children,
    ariaLabel,
    closeTo,
    useButton,
    onAction,
}: {
    className: string;
    children?: ReactNode;
    ariaLabel?: string;
    closeTo: string;
    useButton: boolean;
    onAction: () => void;
}) {
    if (useButton) {
        return (
            <button type="button" className={className} onClick={onAction} aria-label={ariaLabel}>
                {children}
            </button>
        );
    }
    return (
        <Link href={closeTo} className={className} aria-label={ariaLabel}>
            {children}
        </Link>
    );
}

const sectionLabel = "mb-2 flex items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-[#8b96a8]";

export function MotherNewLogDrawer({
    closeTo = "/dashboard/mother/logs",
    onClose,
    onSaved,
}: MotherNewLogDrawerProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit")?.trim() || null;
    const isEditMode = Boolean(editId);

    const [userId, setUserId] = useState<string | null>(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const [formReady, setFormReady] = useState(!isEditMode);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const [originalRecordedAt, setOriginalRecordedAt] = useState<string | null>(null);
    const [entryDate, setEntryDate] = useState(todayLocalISODate());
    const [moodScore, setMoodScore] = useState(7);
    const [painLevel, setPainLevel] = useState(2);
    const [bleedingLevel, setBleedingLevel] = useState<BleedingLevel>("light");
    const [temperatureF, setTemperatureF] = useState("98.6");
    const [sleepHours, setSleepHours] = useState("6");
    const [notes, setNotes] = useState("");
    const dateInputRef = useRef<HTMLInputElement | null>(null);

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
            setLoadingUser(false);
        })();
        return () => {
            active = false;
        };
    }, [router]);

    useEffect(() => {
        if (!isEditMode || !editId || !userId) return;
        let active = true;
        void (async () => {
            setFormReady(false);
            setSaveError(null);
            const { data, error } = await supabase
                .from("health_logs")
                .select(
                    "id, recorded_at, mood_score, mood_label, pain_level, bleeding_level, sleep_hours, temperature_f, reflections"
                )
                .eq("id", editId)
                .eq("mother_user_id", userId)
                .maybeSingle();

            if (!active) return;
            if (error || !data) {
                setSaveError("Could not load this log.");
                setFormReady(true);
                return;
            }
            const row = data as {
                recorded_at: string;
                mood_score: number | null;
                pain_level: number | null;
                bleeding_level: string | null;
                sleep_hours: number | null;
                temperature_f: number | null;
                reflections: string | null;
            };
            setOriginalRecordedAt(row.recorded_at);
            setEntryDate(localISODateFromRecordedAt(row.recorded_at));
            setMoodScore(row.mood_score ?? 7);
            setPainLevel(row.pain_level ?? 0);
            setBleedingLevel(normalizeBleeding(row.bleeding_level));
            setTemperatureF(row.temperature_f != null ? String(row.temperature_f) : "");
            setSleepHours(row.sleep_hours != null ? String(row.sleep_hours) : "");
            setNotes(row.reflections ?? "");
            setFormReady(true);
        })();
        return () => {
            active = false;
        };
    }, [isEditMode, editId, userId]);

    useEffect(() => {
        if (loadingUser || !formReady || isEditMode) return;
        requestAnimationFrame(() => dateInputRef.current?.focus());
    }, [loadingUser, formReady, isEditMode]);

    const canSave = useMemo(
        () => !!userId && !saving && !!entryDate && formReady,
        [userId, saving, entryDate, formReady]
    );

    const closeDrawer = () => {
        if (onClose) onClose();
        else router.replace(closeTo);
    };

    const onDeleteEntry = async () => {
        if (!userId || !editId || deleting) return;
        if (!confirm("Delete this entry permanently? This cannot be undone.")) return;
        setDeleting(true);
        setSaveError(null);
        const { error } = await supabase.from("health_logs").delete().eq("id", editId).eq("mother_user_id", userId);
        setDeleting(false);
        if (error) {
            setSaveError(error.message);
            return;
        }
        closeDrawer();
    };

    const onSave = async () => {
        if (!userId || !entryDate) return;
        setSaving(true);
        setSaveError(null);
        const recordedAt = isEditMode
            ? recordedAtPreservingTime(entryDate, originalRecordedAt)
            : recordedAtFromEntryDate(entryDate);
        const temp = temperatureF.trim() ? Number(temperatureF) : null;
        const sleep = sleepHours.trim() ? Number(sleepHours) : null;
        const painDescriptor = painLevel >= 7 ? "high" : painLevel >= 4 ? "moderate" : "mild";

        const payload = {
            recorded_at: recordedAt,
            mood_score: moodScore,
            mood_label: moodLabelFromScore(moodScore),
            pain_level: painLevel,
            pain_descriptor: painDescriptor,
            bleeding_level: bleedingLevel,
            sleep_hours: Number.isFinite(sleep) ? sleep : null,
            temperature_f: Number.isFinite(temp) ? temp : null,
            reflections: notes.trim() || null,
        };

        const { error } = isEditMode
            ? await supabase.from("health_logs").update(payload).eq("id", editId!).eq("mother_user_id", userId)
            : await supabase.from("health_logs").insert({
                mother_user_id: userId,
                ...payload,
            });

        setSaving(false);
        if (error) {
            setSaveError(error.message);
            return;
        }
        if (onSaved) onSaved();
        closeDrawer();
    };

    const useCloseButton = Boolean(onClose);

    const panelShell =
        "pointer-events-auto flex h-dvh max-h-dvh w-full flex-col bg-[#f4f6f7] lg:mx-auto lg:my-4 lg:h-[min(92dvh,880px)] lg:max-h-[min(92dvh,880px)] lg:w-[min(620px,calc(100vw-48px))] lg:rounded-[20px] lg:shadow-[0_8px_28px_rgba(26,44,52,0.16)]";

    const showLoading = loadingUser || (isEditMode && !formReady);

    return (
        <div className="fixed inset-0 z-[55] overflow-y-auto bg-[#f4f6f7] lg:bg-[rgba(22,35,39,0.12)]">
            <section
                className={panelShell}
                aria-label={isEditMode ? "Edit health log" : "Add new health log"}
            >
                <header className="flex shrink-0 items-center justify-between gap-3 rounded-t-none border-b border-[#dde5e8] bg-white px-4 py-3.5 lg:rounded-t-[20px]">
                    <DrawerCloseControl
                        className="inline-flex size-7 items-center justify-center rounded-full border-0 bg-transparent text-[#3f4858] no-underline"
                        ariaLabel={isEditMode ? "Back" : "Back to health logs"}
                        closeTo={closeTo}
                        useButton={useCloseButton}
                        onAction={closeDrawer}
                    >
                        <ArrowLeft size={18} />
                    </DrawerCloseControl>
                    <h1 className="m-0 flex-1 text-center text-[1.05rem] font-extrabold text-[#2a3340]">
                        {isEditMode ? "Edit Log Entry" : "Add New Log"}
                    </h1>
                    {isEditMode ? (
                        <button
                            type="button"
                            className="inline-flex size-7 items-center justify-center rounded-full border-0 bg-transparent text-[#d24a4a] disabled:opacity-50"
                            aria-label="Delete entry"
                            disabled={deleting || !formReady}
                            onClick={onDeleteEntry}
                        >
                            <Trash2 size={18} />
                        </button>
                    ) : (
                        <span className="inline-flex w-7 shrink-0" aria-hidden />
                    )}
                </header>

                {showLoading ? (
                    <p className="mt-6 text-center text-sm text-[#4f586b]">Loading…</p>
                ) : (
                    <div className="min-h-0 flex-1 overflow-auto px-4 pb-8 pt-4">
                        <section className="mb-5">
                            <div className={sectionLabel}>
                                <CalendarDays size={15} className="text-[#9aa5b5]" aria-hidden />
                                Log timing
                            </div>
                            <div className="flex items-center gap-2 rounded-xl border border-[#dce6e9] bg-white px-3 py-3 text-[#517980]">
                                <CalendarDays size={16} aria-hidden />
                                <input
                                    id="log-entry-date"
                                    ref={dateInputRef}
                                    type="date"
                                    className="w-full border-0 bg-transparent text-[0.95rem] text-[#2f3743] outline-none"
                                    value={entryDate}
                                    onChange={(e) => setEntryDate(e.target.value)}
                                />
                            </div>
                        </section>

                        <section className="mb-5">
                            <div className={sectionLabel}>
                                <Smile size={15} className="text-[#9aa5b5]" aria-hidden />
                                Emotional well-being
                            </div>
                            <article className="rounded-xl border border-[#e6eaed] bg-[#eef1f3] p-4">
                                <p className="m-0 text-[0.95rem] font-extrabold text-[#1e2836]">How are you feeling?</p>
                                <p className="mb-3 mt-1.5 text-[0.82rem] text-[#5e6a7a]">
                                    Based on your mood score: {moodQualityPhrase(moodScore)}
                                </p>
                                <input
                                    type="range"
                                    min={0}
                                    max={10}
                                    value={moodScore}
                                    onChange={(e) => setMoodScore(Number(e.target.value))}
                                    className="w-full accent-brand"
                                />
                                <div className="mt-2 flex items-center justify-between gap-2 text-[0.65rem] font-extrabold uppercase tracking-wide text-[#8b96a8]">
                                    <span className="inline-flex items-center gap-1">
                                        <Frown size={14} className="text-[#8b96a8]" aria-hidden /> Low
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        Excellent <Smile size={14} className="text-[#8b96a8]" aria-hidden />
                                    </span>
                                </div>
                                {!isEditMode ? (
                                    <Link
                                        href="/dashboard/mother/logs/epds"
                                        className="mt-3 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#d7e6ea] bg-white text-[0.8rem] font-bold text-[#5a9392] no-underline"
                                    >
                                        <ClipboardCheck size={14} />
                                        Complete EPDS Questionnaire
                                    </Link>
                                ) : null}
                            </article>
                        </section>

                        <section className="mb-5">
                            <div className={sectionLabel}>
                                <Activity size={15} className="text-[#9aa5b5]" aria-hidden />
                                Physical symptoms
                            </div>
                            <article className="rounded-xl border border-[#e6eaed] bg-white p-4">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <span className="text-[0.86rem] font-semibold text-[#5e6878]">Pain Level</span>
                                    <span className="text-[0.95rem] font-extrabold text-brand">
                                        {painLevel}/10
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={10}
                                    value={painLevel}
                                    onChange={(e) => setPainLevel(Number(e.target.value))}
                                    className="mb-4 w-full accent-brand"
                                />
                                <div className="mb-2 text-[0.86rem] font-semibold text-[#5e6878]">Bleeding Status</div>
                                <div className="grid grid-cols-5 gap-1.5 max-[380px]:grid-cols-3" role="group" aria-label="Bleeding level">
                                    {(["none", "spotting", "light", "medium", "heavy"] as BleedingLevel[]).map((level) => (
                                        <button
                                            type="button"
                                            key={level}
                                            className={`min-h-[32px] rounded-lg border px-0.5 text-center text-[0.65rem] font-bold sm:text-[0.72rem] ${bleedingLevel === level
                                                ? "border-brand bg-brand text-white"
                                                : "border-[#dce3e8] bg-white text-[#415063]"
                                                }`}
                                            onClick={() => setBleedingLevel(level)}
                                        >
                                            {level[0]?.toUpperCase()}
                                            {level.slice(1)}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-2.5">
                                    <label className="rounded-xl border border-[#e3eaed] bg-[#f8fafb] p-2.5">
                                        <span className="mb-2 inline-flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-wide text-[#657384]">
                                            <Thermometer size={14} /> Temp (°F)
                                        </span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            inputMode="decimal"
                                            className="w-full border-0 bg-transparent text-[1.2rem] font-extrabold text-[#2a3340] outline-none"
                                            value={temperatureF}
                                            onChange={(e) => setTemperatureF(e.target.value)}
                                        />
                                    </label>
                                    <label className="rounded-xl border border-[#e3eaed] bg-[#f8fafb] p-2.5">
                                        <span className="mb-2 inline-flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-wide text-[#657384]">
                                            <Clock size={14} /> Sleep (Hrs)
                                        </span>
                                        <input
                                            type="number"
                                            step="0.5"
                                            inputMode="decimal"
                                            className="w-full border-0 bg-transparent text-[1.2rem] font-extrabold text-[#2a3340] outline-none"
                                            value={sleepHours}
                                            onChange={(e) => setSleepHours(e.target.value)}
                                        />
                                    </label>
                                </div>
                            </article>
                        </section>

                        <section className="mb-2">
                            <div className="mb-2 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-[#8b96a8]">
                                Observations &amp; notes
                            </div>
                            <textarea
                                className="min-h-[120px] w-full resize-y rounded-xl border border-[#dce6e9] bg-[#eef1f3] p-3 text-[0.95rem] leading-snug text-[#2f3743] outline-none"
                                placeholder="Share how you’re feeling, symptoms, or anything your care team should know…"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                            <p className="mt-2 text-center text-[0.78rem] italic text-[#8b96a8]">
                                Sharing detailed notes helps your healthcare provider track your recovery more accurately.
                            </p>
                        </section>

                        {saveError ? <p className="m-0 text-[0.92rem] text-danger">{saveError}</p> : null}

                        <div className="mt-6 space-y-3">
                            <button
                                type="button"
                                className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-brand text-[0.95rem] font-bold text-white disabled:cursor-not-allowed disabled:bg-brand-disabled disabled:text-[#d9f3f3]"
                                onClick={onSave}
                                disabled={!canSave}
                            >
                                <Save size={18} aria-hidden />
                                {saving ? "Saving…" : isEditMode ? "Save Changes" : "Save Health Log"}
                            </button>
                            <button
                                type="button"
                                className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cfd8dc] bg-white text-[0.95rem] font-bold text-[#3d4a5c]"
                                onClick={closeDrawer}
                            >
                                <XCircle size={18} className="text-[#5c6a7a]" aria-hidden />
                                {isEditMode ? "Discard Changes" : "Discard & Exit"}
                            </button>
                            {isEditMode ? (
                                <div className="flex justify-center pt-1">
                                    <button
                                        type="button"
                                        className="border-0 bg-transparent p-0 text-[0.88rem] font-bold text-[#d24a4a] underline-offset-2 hover:underline disabled:opacity-50"
                                        disabled={deleting || !formReady}
                                        onClick={onDeleteEntry}
                                    >
                                        Delete this entry permanently
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
