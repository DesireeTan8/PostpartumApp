"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchLinkedMothers, type LinkedMother } from "@/lib/caregiver/linked-mothers";

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

export function CaregiverNoteDetail({ noteId }: { noteId: string }) {
    const router = useRouter();
    const [note, setNote] = useState<NoteRow | null>(null);
    const [mothers, setMothers] = useState<LinkedMother[]>([]);
    const [authorName, setAuthorName] = useState<string>("");
    const [selfId, setSelfId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        setSelfId(user?.id ?? null);

        const { mothers: ms } = await fetchLinkedMothers(supabase);
        setMothers(ms);

        const { data, error: e } = await supabase
            .from("mother_chart_notes")
            .select("id, mother_user_id, title, body, category, review_status, created_at, author_user_id")
            .eq("id", noteId)
            .maybeSingle();

        if (e || !data) {
            setError(e?.message ?? "Note not found");
            setNote(null);
            return;
        }
        setNote(data as NoteRow);

        const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", data.author_user_id).maybeSingle();
        setAuthorName(p?.full_name?.trim() ?? "Caregiver");
    }, [noteId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
        void load();
    }, [load]);

    const mother = mothers.find((m) => m.motherUserId === note?.mother_user_id);

    const del = async () => {
        if (!note || note.author_user_id !== selfId) return;
        if (!confirm("Delete this note?")) return;
        await supabase.from("mother_chart_notes").delete().eq("id", note.id);
        router.replace("/dashboard/caregiver/notes");
    };

    if (error || !note) {
        return (
            <div className="px-6 py-16 text-center">
                <p className="text-sm text-[#a33f58]">{error ?? "Loading…"}</p>
                <Link href="/dashboard/caregiver/notes" className="mt-4 inline-block text-sm font-bold text-brand">
                    Back to notes
                </Link>
            </div>
        );
    }

    const created = new Date(note.created_at);

    return (
        <div className="mx-auto max-w-5xl px-4 py-6 lg:grid lg:grid-cols-[1fr_300px] lg:gap-8 lg:px-8">
            <div>
                <Link
                    href="/dashboard/caregiver/notes"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-brand no-underline"
                >
                    <ArrowLeft className="size-4" />
                    Back to Notes Archive
                </Link>

                <article className="rounded-2xl border border-line bg-white p-6 shadow-sm lg:p-8">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full bg-brand/15 px-3 py-1 text-[0.7rem] font-extrabold capitalize text-brand">
                            {note.category.replace("_", " ")}
                        </span>
                        {note.review_status === "reviewed" ? (
                            <span className="text-[0.7rem] font-extrabold uppercase text-[#047857]">Reviewed</span>
                        ) : null}
                    </div>
                    <h1 className="m-0 text-2xl font-extrabold text-ink">{note.title?.trim() || "Observation"}</h1>
                    <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-muted">{note.body}</div>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8fafc] px-3 py-1.5 text-xs font-bold text-muted">
                            <Calendar className="size-3.5" />
                            {created.toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f8fafc] px-3 py-1.5 text-xs font-bold text-muted">
                            <Clock className="size-3.5" />
                            {created.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                        </span>
                    </div>
                </article>
            </div>

            <aside className="mt-8 space-y-4 lg:mt-16">
                <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                    <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">Linked information</p>
                    {mother ? (
                        <Link
                            href={`/dashboard/caregiver/mothers/${mother.motherUserId}`}
                            className="mt-3 flex items-center gap-3 rounded-xl border border-line px-3 py-2 no-underline"
                        >
                            {mother.avatarUrl ? (
                                <img src={mother.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
                            ) : (
                                <span className="grid size-10 place-items-center rounded-full bg-brand/15 text-sm font-extrabold text-brand">
                                    {mother.displayName[0]}
                                </span>
                            )}
                            <div>
                                <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">Assigned mother</p>
                                <p className="m-0 font-bold text-ink">{mother.displayName}</p>
                            </div>
                        </Link>
                    ) : null}
                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-line px-3 py-2">
                        <span className="grid size-10 place-items-center rounded-full bg-[#eceff2] text-xs font-extrabold">👤</span>
                        <div>
                            <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">Recorded by</p>
                            <p className="m-0 font-bold text-ink">{authorName}</p>
                        </div>
                    </div>
                </div>

                {note.author_user_id === selfId ? (
                    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                        <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">Manage note</p>
                        <button
                            type="button"
                            onClick={() => void del()}
                            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#fecaca] bg-[#fff1f2] py-3 text-sm font-bold text-[#e11d48]"
                        >
                            <Trash2 className="size-4" />
                            Delete Note
                        </button>
                    </div>
                ) : null}
            </aside>
        </div>
    );
}
