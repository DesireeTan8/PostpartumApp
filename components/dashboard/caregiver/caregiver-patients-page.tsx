"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchLinkedMothers, type LinkedMother } from "@/lib/caregiver/linked-mothers";
import { CaregiverNoLinkedMothersPanel } from "@/components/dashboard/caregiver/caregiver-no-linked-mothers-panel";

function ageFromDob(dob: string | null): string | null {
    if (!dob) return null;
    const d = new Date(`${dob}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    const diff = Date.now() - d.getTime();
    const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    return `${years}`;
}

export function CaregiverPatientsPage() {
    const [mothers, setMothers] = useState<LinkedMother[]>([]);
    const [q, setQ] = useState("");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        void (async () => {
            const { mothers: ms } = await fetchLinkedMothers(supabase);
            setMothers(ms);
            setReady(true);
        })();
    }, []);

    const filtered = mothers.filter((m) => m.displayName.toLowerCase().includes(q.toLowerCase()));

    if (!ready) {
        return <p className="px-6 py-16 text-center text-sm text-muted">Loading patients…</p>;
    }

    if (mothers.length === 0) {
        return (
            <div className="mx-auto max-w-lg px-4 py-6 lg:max-w-xl lg:px-8">
                <h2 className="m-0 text-xl font-extrabold text-ink">Patients</h2>
                <p className="m-0 mt-1 text-sm text-muted">Everyone you’re connected to as a caregiver.</p>
                <CaregiverNoLinkedMothersPanel
                    className="mt-6"
                    hint="Mother profiles you support will be listed here with search and quick links."
                    showPatientsLink={false}
                />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-lg px-4 py-6 lg:max-w-xl lg:px-8">
            <h2 className="m-0 text-xl font-extrabold text-ink">Patients</h2>
            <label className="mt-4 flex items-center gap-2 rounded-2xl border border-line bg-white px-3 shadow-sm">
                <Search className="size-5 text-muted" />
                <input
                    className="w-full border-0 bg-transparent py-3 text-sm outline-none"
                    placeholder="Search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </label>
            <ul className="m-0 mt-6 flex list-none flex-col gap-3 p-0">
                {filtered.map((m) => {
                    const age = ageFromDob(m.dateOfBirth);
                    const gender = m.gender?.replace("_", " ") ?? null;
                    return (
                        <li key={m.motherUserId}>
                            <Link
                                href={`/dashboard/caregiver/mothers/${m.motherUserId}`}
                                className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 no-underline shadow-sm"
                            >
                                {m.avatarUrl ? (
                                    <img src={m.avatarUrl} alt="" className="size-14 rounded-full object-cover" />
                                ) : (
                                    <span className="grid size-14 place-items-center rounded-full bg-[#eceff2] text-brand">
                                        <UserRound className="size-7" />
                                    </span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="m-0 font-extrabold text-ink">{m.displayName}</p>
                                    <p className="m-0 text-xs text-muted">
                                        {[age ? `${age} yrs` : null, gender].filter(Boolean).join(" · ") || "Patient"}
                                    </p>
                                </div>
                                <span className="rounded-full border border-[#bbf7d0] bg-[#ecfdf5] px-2 py-0.5 text-[0.65rem] font-extrabold text-[#047857]">
                                    Active
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
            {filtered.length === 0 ? (
                <p className="mt-8 text-center text-sm text-muted">No patients match your search.</p>
            ) : null}

            <Link
                href="/dashboard/caregiver"
                className="fixed bottom-24 right-5 grid size-14 place-items-center rounded-full bg-brand text-white shadow-lg no-underline lg:bottom-8"
                aria-label="Add"
            >
                +
            </Link>
        </div>
    );
}
