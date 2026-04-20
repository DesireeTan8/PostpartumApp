"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
    ArrowLeft,
    CalendarDays,
    Clock,
    Save,
    Trash2,
    XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import {
    type CareReminderCategory,
    type CareReminderRecurrence,
    firstEventDueIso,
    localTimestampIso,
    recurrenceLabel,
} from "@/lib/care-reminders";
import { MotherReminderTypePicker } from "@/components/dashboard/care/mother-reminder-type-picker";

type MotherReminderDrawerProps = {
    closeTo?: string;
    onClose?: () => void;
    onSaved?: () => void;
};

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

function todayLocalISODate(): string {
    const now = new Date();
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function pad2(n: number): string {
    return String(n).padStart(2, "0");
}

function timeInputValueFromDb(time: string): string {
    const parts = time.split(":");
    const h = parts[0] ?? "09";
    const m = parts[1] ?? "00";
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

const sectionLabel =
    "mb-2 flex items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] text-[#8b96a8]";

export function MotherReminderDrawer({
    closeTo = "/dashboard/mother/care",
    onClose,
    onSaved,
}: MotherReminderDrawerProps) {
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

    const [category, setCategory] = useState<CareReminderCategory>("medication");
    const [title, setTitle] = useState("");
    const [instructions, setInstructions] = useState("");
    const [startDate, setStartDate] = useState(todayLocalISODate());
    const [startTime, setStartTime] = useState("09:00");
    const [recurrence, setRecurrence] = useState<CareReminderRecurrence>("daily");
    const [endDate, setEndDate] = useState<string | null>(null);
    const [hasEndDate, setHasEndDate] = useState(false);
    const titleInputRef = useRef<HTMLInputElement | null>(null);

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
                .from("care_reminders")
                .select(
                    "id, category, title, instructions, reminder_time, start_date, end_date, recurrence, mother_user_id"
                )
                .eq("id", editId)
                .eq("mother_user_id", userId)
                .maybeSingle();

            if (!active) return;
            if (error || !data) {
                setSaveError("Could not load this reminder.");
                setFormReady(true);
                return;
            }
            const row = data as {
                category: CareReminderCategory;
                title: string;
                instructions: string | null;
                reminder_time: string;
                start_date: string;
                end_date: string | null;
                recurrence: CareReminderRecurrence;
            };
            setCategory(row.category);
            setTitle(row.title);
            setInstructions(row.instructions ?? "");
            setStartDate(row.start_date);
            setStartTime(timeInputValueFromDb(row.reminder_time));
            setRecurrence(row.recurrence);
            if (row.end_date) {
                setHasEndDate(true);
                setEndDate(row.end_date);
            } else {
                setHasEndDate(false);
                setEndDate(null);
            }
            setFormReady(true);
        })();
        return () => {
            active = false;
        };
    }, [isEditMode, editId, userId]);

    useEffect(() => {
        if (loadingUser || !formReady || isEditMode) return;
        requestAnimationFrame(() => titleInputRef.current?.focus());
    }, [loadingUser, formReady, isEditMode]);

    const canSave = useMemo(
        () => !!userId && !saving && !!title.trim() && !!startDate && !!startTime && formReady,
        [userId, saving, title, startDate, startTime, formReady]
    );

    const closeDrawer = () => {
        if (onClose) onClose();
        else router.replace(closeTo);
    };

    const notificationPreview = useMemo(() => {
        const when = new Date(localTimestampIso(startDate, startTime));
        const day = when.toLocaleDateString(undefined, { weekday: "long" });
        const time = when.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
        if (recurrence === "once") {
            return `We’ll remind you once on ${day} at ${time}.`;
        }
        return `We’ll remind you ${recurrenceLabel(recurrence).toLowerCase()} at ${time} (starting ${day}).`;
    }, [startDate, startTime, recurrence]);

    const onDelete = async () => {
        if (!userId || !editId || deleting) return;
        if (!confirm("Delete this reminder and all of its history? This cannot be undone.")) return;
        setDeleting(true);
        setSaveError(null);
        const { error } = await supabase.from("care_reminders").delete().eq("id", editId).eq("mother_user_id", userId);
        setDeleting(false);
        if (error) {
            setSaveError(error.message);
            return;
        }
        closeDrawer();
    };

    const onSave = async () => {
        if (!userId || !title.trim() || !startDate || !startTime) return;
        setSaving(true);
        setSaveError(null);

        let normalizedTime = startTime.trim();
        if (/^\d{2}:\d{2}$/.test(normalizedTime)) normalizedTime = `${normalizedTime}:00`;
        else if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(normalizedTime)) normalizedTime = "09:00:00";

        const payload = {
            category,
            title: title.trim(),
            instructions: instructions.trim() || null,
            reminder_time: normalizedTime,
            start_date: startDate,
            end_date: hasEndDate && endDate ? endDate : null,
            recurrence,
            is_active: true,
        };

        if (isEditMode && editId) {
            const { error } = await supabase.from("care_reminders").update(payload).eq("id", editId).eq("mother_user_id", userId);
            setSaving(false);
            if (error) {
                setSaveError(error.message);
                return;
            }
            if (onSaved) onSaved();
            closeDrawer();
            return;
        }

        const { data: inserted, error: insertError } = await supabase
            .from("care_reminders")
            .insert({
                mother_user_id: userId,
                ...payload,
            })
            .select("id")
            .maybeSingle();

        if (insertError || !inserted?.id) {
            setSaving(false);
            setSaveError(insertError?.message ?? "Could not create reminder.");
            return;
        }

        const reminderId = inserted.id as string;
        const dueAt = firstEventDueIso({
            startDate,
            reminderTime: normalizedTime,
            recurrence,
        });

        const { error: evError } = await supabase.from("care_reminder_events").insert({
            reminder_id: reminderId,
            due_at: dueAt,
            status: "pending",
        });

        setSaving(false);
        if (evError) {
            setSaveError(evError.message);
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
            <section className={panelShell} aria-label={isEditMode ? "Edit reminder" : "New reminder"}>
                <header className="flex shrink-0 items-center justify-between gap-3 rounded-t-none border-b border-[#dde5e8] bg-white px-4 py-3.5 lg:rounded-t-[20px]">
                    <DrawerCloseControl
                        className="inline-flex size-7 items-center justify-center rounded-full border-0 bg-transparent text-[#3f4858] no-underline"
                        ariaLabel={isEditMode ? "Back" : "Close"}
                        closeTo={closeTo}
                        useButton={useCloseButton}
                        onAction={closeDrawer}
                    >
                        <ArrowLeft size={18} />
                    </DrawerCloseControl>
                    <h1 className="m-0 flex-1 text-center text-[1.05rem] font-extrabold text-[#2a3340]">
                        {isEditMode ? "Edit Reminder" : "New Reminder"}
                    </h1>
                    {isEditMode ? (
                        <button
                            type="button"
                            className="inline-flex size-7 items-center justify-center rounded-full border-0 bg-transparent text-[#d24a4a] disabled:opacity-50"
                            aria-label="Delete reminder"
                            disabled={deleting || !formReady}
                            onClick={onDelete}
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
                            <div className={sectionLabel}>Reminder type</div>
                            <MotherReminderTypePicker value={category} onChange={setCategory} />
                        </section>

                        <section className="mb-5">
                            <div className={sectionLabel}>Title</div>
                            <input
                                ref={titleInputRef}
                                type="text"
                                className="box-border w-full rounded-xl border border-[#dce6e9] bg-white px-3.5 py-3 text-[0.95rem] text-[#2f3743] outline-none placeholder:text-[#9aa5b5]"
                                placeholder="e.g., Take Iron Supplement"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </section>

                        <section className="mb-5">
                            <div className={sectionLabel}>Instructions (optional)</div>
                            <textarea
                                className="min-h-[100px] w-full resize-y rounded-xl border border-[#dce6e9] bg-[#eef1f3] p-3 text-[0.95rem] leading-snug text-[#2f3743] outline-none placeholder:text-[#9aa5b5]"
                                placeholder="Dosage, food pairing, or where to go…"
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                            />
                        </section>

                        <section className="mb-5">
                            <div className={sectionLabel}>Schedule</div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <label className="flex flex-col gap-1.5 rounded-xl border border-[#e3eaed] bg-white p-3">
                                    <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-wide text-[#657384]">
                                        <CalendarDays size={14} aria-hidden />
                                        Start date
                                    </span>
                                    <input
                                        type="date"
                                        className="w-full border-0 bg-transparent text-[0.92rem] font-semibold text-[#2a3340] outline-none"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 rounded-xl border border-[#e3eaed] bg-white p-3">
                                    <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-wide text-[#657384]">
                                        <Clock size={14} aria-hidden />
                                        Time
                                    </span>
                                    <input
                                        type="time"
                                        className="w-full border-0 bg-transparent text-[0.92rem] font-semibold text-[#2a3340] outline-none"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </label>
                            </div>

                            <label className="mt-3 flex flex-col gap-1.5 rounded-xl border border-[#e3eaed] bg-white p-3">
                                <span className="text-[0.68rem] font-extrabold uppercase tracking-wide text-[#657384]">Repeat</span>
                                <select
                                    className="w-full cursor-pointer border-0 bg-transparent text-[0.92rem] font-semibold text-[#2a3340] outline-none"
                                    value={recurrence}
                                    onChange={(e) => setRecurrence(e.target.value as CareReminderRecurrence)}
                                >
                                    <option value="once">One time</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </label>

                            <div className="mt-3 rounded-xl border border-[#e3eaed] bg-[#f8fafb] p-3">
                                <label className="flex cursor-pointer items-center gap-2 text-[0.86rem] font-semibold text-[#415063]">
                                    <input
                                        type="checkbox"
                                        className="size-4 accent-brand"
                                        checked={hasEndDate}
                                        onChange={(e) => {
                                            setHasEndDate(e.target.checked);
                                            if (!e.target.checked) setEndDate(null);
                                            else if (!endDate) setEndDate(todayLocalISODate());
                                        }}
                                    />
                                    End date (optional)
                                </label>
                                {hasEndDate ? (
                                    <input
                                        type="date"
                                        className="mt-2 w-full rounded-lg border border-[#dce6e9] bg-white px-3 py-2 text-[0.92rem] outline-none"
                                        value={endDate ?? ""}
                                        onChange={(e) => setEndDate(e.target.value || null)}
                                    />
                                ) : (
                                    <p className="mb-0 mt-2 text-[0.82rem] text-[#6a7486]">Never</p>
                                )}
                            </div>
                        </section>

                        <div className="mb-6 rounded-xl border border-[#c5e8e6] bg-[#e8f6f5] px-3.5 py-3 text-[0.82rem] leading-snug text-[#1f5c59]">
                            <span className="font-extrabold text-brand">Notification preview · </span>
                            {notificationPreview}
                        </div>

                        {saveError ? <p className="m-0 text-[0.92rem] text-danger">{saveError}</p> : null}

                        <div className="space-y-3">
                            <button
                                type="button"
                                className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-brand text-[0.95rem] font-bold text-white disabled:cursor-not-allowed disabled:bg-brand-disabled disabled:text-[#d9f3f3]"
                                onClick={onSave}
                                disabled={!canSave}
                            >
                                <Save size={18} aria-hidden />
                                {saving ? "Saving…" : isEditMode ? "Save Changes" : "Save Reminder"}
                            </button>
                            <button
                                type="button"
                                className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#cfd8dc] bg-white text-[0.95rem] font-bold text-[#3d4a5c]"
                                onClick={closeDrawer}
                            >
                                <XCircle size={18} className="text-[#5c6a7a]" aria-hidden />
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
