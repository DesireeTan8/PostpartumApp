"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Baby, Bed, Save, Stethoscope, UtensilsCrossed } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchLinkedMothers, postpartumWeekLabel, type LinkedMother } from "@/lib/caregiver/linked-mothers";
import { CaregiverNoLinkedMothersPanel } from "@/components/dashboard/caregiver/caregiver-no-linked-mothers-panel";

type FocusKey = "feeding" | "rest" | "medical" | "household";

const focusCards: { key: FocusKey; label: string; sub: string; Icon: typeof Baby }[] = [
    { key: "feeding", label: "Feeding support", sub: "Lactation & meal help", Icon: Baby },
    { key: "rest", label: "Mother's rest", sub: "Baby monitoring", Icon: Bed },
    { key: "medical", label: "Medical care", sub: "Vitals & medication", Icon: Stethoscope },
    { key: "household", label: "Household", sub: "Light chores & prep", Icon: UtensilsCrossed },
];

export function CaregiverSupportPlanPage() {
    const [primary, setPrimary] = useState<LinkedMother | null>(null);
    const [focus, setFocus] = useState<Record<FocusKey, boolean>>({
        feeding: false,
        rest: false,
        medical: false,
        household: false,
    });
    const [accepting, setAccepting] = useState(true);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const load = useCallback(async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { mothers: ms } = await fetchLinkedMothers(supabase);
        setPrimary(ms[0] ?? null);

        const { data: cg } = await supabase.from("caregiver_profiles").select("*").eq("user_id", user.id).maybeSingle();

        if (cg) {
            const r = cg as Record<string, unknown>;
            setFocus({
                feeding: Boolean(r.support_focus_feeding),
                rest: Boolean(r.support_focus_rest),
                medical: Boolean(r.support_focus_medical),
                household: Boolean(r.support_focus_household),
            });
            setAccepting((r.accepting_new_requests as boolean | undefined) ?? true);
            setNotes((r.support_plan_notes as string | null) ?? "");
        }
        setLoaded(true);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
        void load();
    }, [load]);

    const toggle = (key: FocusKey) => setFocus((f) => ({ ...f, [key]: !f[key] }));

    const save = async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        setSaving(true);
        const patch = {
            support_focus_feeding: focus.feeding,
            support_focus_rest: focus.rest,
            support_focus_medical: focus.medical,
            support_focus_household: focus.household,
            accepting_new_requests: accepting,
            support_plan_notes: notes.trim() || null,
        };
        await supabase.from("caregiver_profiles").update(patch).eq("user_id", user.id);
        setSaving(false);
    };

    if (!loaded) {
        return <p className="px-6 py-16 text-center text-sm text-muted">Loading…</p>;
    }

    return (
        <div className="mx-auto max-w-5xl px-4 py-6 lg:grid lg:grid-cols-[1fr_280px] lg:gap-8 lg:px-8">
            <div>
                <Link
                    href="/dashboard/caregiver"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-brand no-underline"
                >
                    <ArrowLeft className="size-4" />
                    Back to Plans
                </Link>

                {primary ? (
                    <div className="mb-8 flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            {primary.avatarUrl ? (
                                <img src={primary.avatarUrl} alt="" className="size-12 rounded-full object-cover" />
                            ) : (
                                <span className="grid size-12 place-items-center rounded-full bg-brand/15 font-extrabold text-brand">
                                    {primary.displayName[0]}
                                </span>
                            )}
                            <div>
                                <p className="m-0 font-extrabold text-ink">{primary.displayName}</p>
                                <p className="m-0 text-sm text-muted">{postpartumWeekLabel(primary.deliveryDate) ?? "Linked mother"}</p>
                            </div>
                        </div>
                        <span className="text-muted">›</span>
                    </div>
                ) : (
                    <CaregiverNoLinkedMothersPanel
                        className="mb-8"
                        hint="Once a mother is linked, her name appears here. You can still save focus areas and availability for your profile below."
                    />
                )}

                <p className="m-0 text-[0.7rem] font-extrabold uppercase text-muted">Support focus</p>
                <p className="m-0 text-xs text-muted">Select multiple.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {focusCards.map(({ key, label, sub, Icon }) => {
                        const on = focus[key];
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => toggle(key)}
                                className={
                                    "relative flex flex-col items-start rounded-2xl border p-4 text-left transition-colors " +
                                    (on ? "border-brand bg-brand/5" : "border-line bg-white")
                                }
                            >
                                {on ? (
                                    <span className="absolute right-3 top-3 text-brand">✓</span>
                                ) : null}
                                <Icon className={"size-6 " + (on ? "text-brand" : "text-muted")} strokeWidth={2} />
                                <p className="m-0 mt-2 font-extrabold text-ink">{label}</p>
                                <p className="m-0 text-xs text-muted">{sub}</p>
                            </button>
                        );
                    })}
                </div>

                <p className="mt-10 text-[0.7rem] font-extrabold uppercase text-muted">Scheduling</p>
                <div className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-sm">
                    <div>
                        <p className="m-0 font-extrabold text-ink">Currently available</p>
                        <p className="m-0 text-xs text-muted">Receiving new requests</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={accepting}
                        onClick={() => setAccepting((a) => !a)}
                        className={
                            "relative h-7 w-12 rounded-full transition-colors " + (accepting ? "bg-brand" : "bg-[#d1d5db]")
                        }
                    >
                        <span
                            className={
                                "absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform " +
                                (accepting ? "left-6" : "left-0.5")
                            }
                        />
                    </button>
                </div>

                <label className="mt-8 block">
                    <span className="text-[0.7rem] font-extrabold uppercase text-muted">Care notes &amp; preferences</span>
                    <textarea
                        className="mt-2 min-h-[120px] w-full rounded-2xl border border-line px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
                        placeholder="Detail your typical visit schedule, boundaries, or special skills…"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </label>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => void save()}
                        className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white disabled:opacity-60"
                    >
                        <Save className="size-4" />
                        Save Support Plan
                    </button>
                </div>
            </div>

            <aside className="mt-10 space-y-4 lg:mt-24">
                <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                    <p className="m-0 text-sm font-extrabold text-ink">Tips</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
                        <li>Keep notes brief and actionable.</li>
                        <li>Update availability weekly.</li>
                        <li>Highlight your strongest focus areas.</li>
                    </ul>
                </div>
            </aside>
        </div>
    );
}
