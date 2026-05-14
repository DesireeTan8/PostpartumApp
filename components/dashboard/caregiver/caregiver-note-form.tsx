"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Heart, Moon, Stethoscope, UtensilsCrossed, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchLinkedMothers, type LinkedMother } from "@/lib/caregiver/linked-mothers";
import { CaregiverNoLinkedMothersPanel } from "@/components/dashboard/caregiver/caregiver-no-linked-mothers-panel";

const categories = [
    { key: "medical", label: "Health", Icon: Stethoscope },
    { key: "mood", label: "Mood", Icon: Heart },
    { key: "sleep", label: "Sleep", Icon: Moon },
    { key: "feeding", label: "Feeding", Icon: UtensilsCrossed },
    { key: "other", label: "Other", Icon: AlertCircle },
] as const;

export function CaregiverNoteForm() {
    const router = useRouter();
    const [mothers, setMothers] = useState<LinkedMother[]>([]);
    const [motherId, setMotherId] = useState("");
    const [category, setCategory] = useState<string>("medical");
    const [body, setBody] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
        void (async () => {
            const { mothers: ms } = await fetchLinkedMothers(supabase);
            setMothers(ms);
            if (ms[0]) setMotherId(ms[0].motherUserId);
        })();
    }, []);

    const save = async () => {
        setError(null);
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            router.replace("/auth/sign-in");
            return;
        }
        if (!motherId || !body.trim()) {
            setError("Select a patient and enter observation details.");
            return;
        }
        const title = body.trim().slice(0, 80) + (body.trim().length > 80 ? "…" : "");
        setSaving(true);
        const row = {
            mother_user_id: motherId,
            author_user_id: user.id,
            category,
            title,
            body: body.trim(),
        };
        const { data, error: e } = await supabase.from("mother_chart_notes").insert(row).select("id").single();
        setSaving(false);
        if (e) {
            setError(e.message);
            return;
        }
        if (data?.id) router.replace(`/dashboard/caregiver/notes/${data.id}`);
        else router.replace("/dashboard/caregiver/notes");
    };

    if (mothers.length === 0) {
        return (
            <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8">
                <h2 className="m-0 text-xl font-extrabold text-ink">New Care Note</h2>
                <p className="m-0 mt-1 text-sm text-muted">Document observations for your care team.</p>
                <CaregiverNoLinkedMothersPanel
                    className="mt-8"
                    hint="Choose who this note is for after a mother is linked to your caregiver account."
                />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl px-4 py-6 lg:grid lg:grid-cols-[1fr_280px] lg:gap-8 lg:px-8">
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <Link
                        href="/dashboard/caregiver/notes"
                        className="inline-flex items-center gap-2 text-sm font-bold text-brand no-underline"
                    >
                        <ArrowLeft className="size-4" />
                        Back
                    </Link>
                    <span className="text-xs text-muted">Draft — saves when you submit</span>
                </div>
                <h2 className="m-0 text-xl font-extrabold text-ink">New Care Note</h2>
                {error ? (
                    <p className="mt-3 rounded-lg border border-[#f5c4c4] bg-[#fff5f5] px-3 py-2 text-sm text-[#a33f58]">{error}</p>
                ) : null}

                <p className="mt-8 text-[0.7rem] font-extrabold uppercase text-muted">Linked patient</p>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                    {mothers.map((m) => (
                        <button
                            key={m.motherUserId}
                            type="button"
                            onClick={() => setMotherId(m.motherUserId)}
                            className={
                                "flex shrink-0 flex-col items-center gap-1 border-0 bg-transparent p-0 " +
                                (motherId === m.motherUserId ? "opacity-100" : "opacity-70")
                            }
                        >
                            <span
                                className={
                                    "grid size-14 place-items-center overflow-hidden rounded-full text-sm font-extrabold " +
                                    (motherId === m.motherUserId ? "ring-[3px] ring-brand" : "ring-1 ring-line")
                                }
                            >
                                {m.avatarUrl ? (
                                    <img src={m.avatarUrl} alt="" className="size-full object-cover" />
                                ) : (
                                    <span className="bg-brand/15 text-brand">{m.displayName[0]}</span>
                                )}
                            </span>
                            <span className="max-w-[72px] truncate text-[0.7rem] font-bold">{m.displayName.split(" ")[0]}</span>
                        </button>
                    ))}
                </div>

                <p className="mt-8 text-[0.7rem] font-extrabold uppercase text-muted">Documentation category</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {categories.map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setCategory(key)}
                            className={
                                "flex flex-col items-center gap-2 rounded-2xl border py-4 " +
                                (category === key ? "border-brand bg-brand/5 text-brand" : "border-line bg-white text-muted")
                            }
                        >
                            <Icon className="size-6" strokeWidth={2} />
                            <span className="text-xs font-extrabold">{label}</span>
                        </button>
                    ))}
                </div>

                <label className="mt-8 block">
                    <span className="flex items-center justify-between text-[0.7rem] font-extrabold uppercase text-muted">
                        Observation details
                        <span className="rounded-md bg-[#f0f3f5] px-1.5 py-0.5 text-[0.6rem]">Required</span>
                    </span>
                    <textarea
                        className="mt-2 min-h-[200px] w-full resize-y rounded-2xl border border-line px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
                        maxLength={2000}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Describe energy levels, appetite, mood changes, or physical symptoms…"
                    />
                    <span className="mt-1 block text-right text-xs text-muted">{body.length} / 2000</span>
                </label>
                <p className="mt-4 rounded-xl bg-sky-50 px-3 py-2 text-xs text-sky-900">
                    Clear, objective documentation helps the clinical team provide the best ongoing support.
                </p>

                <div className="mt-10 flex flex-wrap justify-end gap-3">
                    <Link
                        href="/dashboard/caregiver/notes"
                        className="inline-flex h-12 items-center justify-center rounded-xl border border-line bg-white px-6 text-sm font-bold text-ink no-underline"
                    >
                        Cancel
                    </Link>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => void save()}
                        className="inline-flex h-12 items-center justify-center rounded-xl bg-brand px-6 text-sm font-bold text-white disabled:opacity-60"
                    >
                        {saving ? "Saving…" : "Save Care Note"}
                    </button>
                </div>
            </div>

            <aside className="mt-10 space-y-4 lg:mt-20">
                <div className="rounded-2xl border border-line bg-white p-4 text-sm shadow-sm">
                    <p className="m-0 font-extrabold text-ink">Documentation tips</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-muted">
                        <li>Be specific and note changes from prior visits.</li>
                        <li>Stay objective; record what you observed.</li>
                        <li>Highlight new symptoms or concerns.</li>
                    </ul>
                </div>
                <div className="rounded-2xl border border-line bg-white p-4 text-sm shadow-sm">
                    <p className="m-0 font-extrabold text-ink">Visibility</p>
                    <p className="mt-2 text-muted">
                        This note is stored on the mother&apos;s chart. Visibility follows your care-team access level and clinical policies.
                    </p>
                </div>
            </aside>
        </div>
    );
}
