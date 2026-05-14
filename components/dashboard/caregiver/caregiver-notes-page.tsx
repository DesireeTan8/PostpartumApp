"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchLinkedMothers, type LinkedMother } from "@/lib/caregiver/linked-mothers";
import { CaregiverNoLinkedMothersPanel } from "@/components/dashboard/caregiver/caregiver-no-linked-mothers-panel";

type NoteRow = {
    id: string;
    mother_user_id: string;
    title: string | null;
    body: string;
    category: string;
    review_status: string | null;
    created_at: string;
    author_user_id: string;
};

const filters = [
    { key: "all", label: "All observations" },
    { key: "medical", label: "Med" },
    { key: "feeding", label: "Feed" },
    { key: "sleep", label: "Sleep" },
    { key: "mood", label: "Mood" },
] as const;

function categoryStyle(cat: string) {
    if (cat === "medical" || cat === "clinical") return "bg-brand/15 text-brand";
    if (cat === "feeding") return "bg-sky-100 text-sky-800";
    if (cat === "sleep") return "bg-violet-100 text-violet-800";
    if (cat === "mood" || cat === "behavioral" || cat === "mental_health") return "bg-orange-100 text-orange-800";
    return "bg-[#f0f3f5] text-muted";
}

function categoryLabel(cat: string) {
    if (cat === "clinical") return "Medical";
    if (cat === "behavioral") return "Mood";
    return cat.replace("_", " ");
}

export function CaregiverNotesPage() {
    const [mothers, setMothers] = useState<LinkedMother[]>([]);
    const [notes, setNotes] = useState<NoteRow[]>([]);
    const [authors, setAuthors] = useState<Record<string, string>>({});
    const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("all");
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const { mothers: ms } = await fetchLinkedMothers(supabase);
        setMothers(ms);
        const motherIds = ms.map((m) => m.motherUserId);
        if (motherIds.length === 0) {
            setNotes([]);
            setLoading(false);
            return;
        }

        const { data } = await supabase
            .from("mother_chart_notes")
            .select("id, mother_user_id, title, body, category, review_status, created_at, author_user_id")
            .in("mother_user_id", motherIds)
            .order("created_at", { ascending: false })
            .limit(60);

        const rows = (data ?? []) as NoteRow[];
        setNotes(rows);

        const authorIds = [...new Set(rows.map((r) => r.author_user_id))];
        if (authorIds.length) {
            const { data: profs } = await supabase.from("profiles").select("user_id, full_name").in("user_id", authorIds);
            const map: Record<string, string> = {};
            for (const p of profs ?? []) map[p.user_id] = p.full_name?.trim() || "Author";
            setAuthors(map);
        } else setAuthors({});

        setLoading(false);
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
        void load();
    }, [load]);

    const filtered = notes.filter((n) => {
        if (filter !== "all") {
            if (filter === "medical" && n.category !== "medical" && n.category !== "clinical") return false;
            if (filter !== "medical" && n.category !== filter) return false;
        }
        if (q.trim()) {
            const t = q.toLowerCase();
            const blob = `${n.title ?? ""} ${n.body} ${authors[n.author_user_id] ?? ""}`.toLowerCase();
            if (!blob.includes(t)) return false;
        }
        return true;
    });

    if (loading && mothers.length === 0) {
        return <p className="px-6 py-16 text-center text-sm text-muted">Loading notes…</p>;
    }

    if (mothers.length === 0 && !loading) {
        return (
            <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8">
                <h2 className="m-0 text-xl font-extrabold text-ink">Care Notes</h2>
                <p className="m-0 mt-1 text-sm text-muted">Review and manage documentation.</p>
                <CaregiverNoLinkedMothersPanel
                    className="mt-8"
                    hint="Chart notes and observations you record will be listed here once a mother is linked to your account."
                />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl px-4 py-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="m-0 text-xl font-extrabold text-ink">Care Notes</h2>
                    <p className="m-0 mt-1 text-sm text-muted">Review and manage documentation.</p>
                </div>
                <Link
                    href="/dashboard/caregiver/notes/new"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white no-underline shadow-sm"
                >
                    <Plus className="size-5" />
                    New Note
                </Link>
            </div>

            <div className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm">
                <label className="flex items-center gap-2 rounded-xl border border-line bg-[#f8fafc] px-3">
                    <Search className="size-5 text-muted" />
                    <input
                        className="w-full border-0 bg-transparent py-3 text-sm outline-none"
                        placeholder="Search observations, keywords, or authors…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            type="button"
                            onClick={() => setFilter(f.key)}
                            className={
                                "rounded-full border px-3 py-1.5 text-xs font-extrabold " +
                                (filter === f.key ? "border-brand bg-brand text-white" : "border-line bg-white text-muted")
                            }
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-[0.7rem] font-extrabold uppercase text-muted">
                <span>All observations</span>
                <span>{filtered.length} total</span>
            </div>

            {loading ? (
                <p className="mt-8 text-center text-sm text-muted">Loading…</p>
            ) : (
                <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
                    {filtered.length === 0 ? (
                        <li className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-muted shadow-sm">No notes yet.</li>
                    ) : (
                        filtered.map((n) => (
                            <li key={n.id}>
                                <Link
                                    href={`/dashboard/caregiver/notes/${n.id}`}
                                    className="block rounded-2xl border border-line bg-white p-4 no-underline shadow-sm transition-shadow hover:shadow-md"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className={`rounded-full px-2.5 py-0.5 text-[0.65rem] font-extrabold capitalize ${categoryStyle(n.category)}`}>
                                            {categoryLabel(n.category)}
                                        </span>
                                        <span className="text-xs text-muted">
                                            {new Date(n.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                                        </span>
                                    </div>
                                    <p className="m-0 mt-2 font-extrabold text-ink">{n.title?.trim() || "Observation"}</p>
                                    <p className="m-0 mt-1 line-clamp-2 text-sm text-muted">{n.body}</p>
                                    <div className="mt-3 flex items-center justify-between text-xs">
                                        <span className="font-semibold text-ink">{authors[n.author_user_id] ?? "—"}</span>
                                        {n.review_status === "reviewed" ? (
                                            <span className="rounded-full bg-[#ecfdf5] px-2 py-0.5 font-extrabold text-[#047857]">Reviewed</span>
                                        ) : null}
                                    </div>
                                </Link>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
