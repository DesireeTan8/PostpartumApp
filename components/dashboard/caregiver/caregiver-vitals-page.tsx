"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchLinkedMothers, type LinkedMother } from "@/lib/caregiver/linked-mothers";
import { CaregiverNoLinkedMothersPanel } from "@/components/dashboard/caregiver/caregiver-no-linked-mothers-panel";

export function CaregiverVitalsPage() {
    const searchParams = useSearchParams();
    const preMother = searchParams.get("mother");
    const [mothers, setMothers] = useState<LinkedMother[]>([]);
    const [motherId, setMotherId] = useState("");
    const [sys, setSys] = useState("");
    const [dia, setDia] = useState("");
    const [hr, setHr] = useState("");
    const [spo2, setSpo2] = useState("");
    const [temp, setTemp] = useState("");
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        void (async () => {
            const { mothers: ms } = await fetchLinkedMothers(supabase);
            setMothers(ms);
            const initial = preMother && ms.some((m) => m.motherUserId === preMother) ? preMother : ms[0]?.motherUserId ?? "";
            setMotherId(initial);
            setReady(true);
        })();
    }, [preMother]);

    const mother = mothers.find((m) => m.motherUserId === motherId);

    if (!ready) {
        return <p className="px-6 py-16 text-center text-sm text-muted">Loading…</p>;
    }

    if (mothers.length === 0) {
        return (
            <div className="mx-auto max-w-lg px-4 py-6 lg:px-8">
                <Link href="/dashboard/caregiver" className="inline-flex items-center gap-2 text-sm font-bold text-brand no-underline">
                    <ArrowLeft className="size-4" />
                    Back
                </Link>
                <h2 className="m-0 mt-4 text-xl font-extrabold text-ink">Log vitals</h2>
                <p className="m-0 mt-1 text-sm text-muted">Record blood pressure, heart rate, and more for your care notes.</p>
                <CaregiverNoLinkedMothersPanel
                    className="mt-8"
                    hint="Vitals are saved on a specific mother’s chart. Link someone first, then return here to log readings."
                />
            </div>
        );
    }

    const save = async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user || !motherId) return;
        setSaving(true);
        setMsg(null);
        const rows: { mother_user_id: string; vital_type: string; value_primary: number; value_secondary?: number; unit: string | null; recorded_by_user_id: string; source: string }[] = [];
        if (sys && dia) {
            rows.push({
                mother_user_id: motherId,
                vital_type: "blood_pressure",
                value_primary: Number(sys),
                value_secondary: Number(dia),
                unit: "mmHg",
                recorded_by_user_id: user.id,
                source: "caregiver_app",
            });
        }
        if (hr) {
            rows.push({
                mother_user_id: motherId,
                vital_type: "heart_rate",
                value_primary: Number(hr),
                unit: "bpm",
                recorded_by_user_id: user.id,
                source: "caregiver_app",
            });
        }
        if (spo2) {
            rows.push({
                mother_user_id: motherId,
                vital_type: "spo2",
                value_primary: Number(spo2),
                unit: "%",
                recorded_by_user_id: user.id,
                source: "caregiver_app",
            });
        }
        if (temp) {
            rows.push({
                mother_user_id: motherId,
                vital_type: "temperature",
                value_primary: Number(temp),
                unit: "F",
                recorded_by_user_id: user.id,
                source: "caregiver_app",
            });
        }
        if (rows.length === 0) {
            setMsg("Enter at least one measurement.");
            setSaving(false);
            return;
        }
        const { error } = await supabase.from("mother_vital_readings").insert(rows);
        setSaving(false);
        if (error) setMsg(error.message);
        else {
            setMsg("Saved.");
            setSys("");
            setDia("");
            setHr("");
            setSpo2("");
            setTemp("");
        }
    };

    return (
        <div className="mx-auto max-w-lg px-4 py-6 lg:px-8">
            <Link href="/dashboard/caregiver" className="inline-flex items-center gap-2 text-sm font-bold text-brand no-underline">
                <ArrowLeft className="size-4" />
                Back
            </Link>
            <h2 className="m-0 mt-4 text-xl font-extrabold text-ink">Log vitals{mother ? ` · ${mother.displayName}` : ""}</h2>

            {mothers.length > 1 ? (
                <label className="mt-6 block text-sm font-bold text-ink">
                    Patient
                    <select
                        className="mt-2 w-full rounded-xl border border-line px-3 py-3 text-sm"
                        value={motherId}
                        onChange={(e) => setMotherId(e.target.value)}
                    >
                        {mothers.map((m) => (
                            <option key={m.motherUserId} value={m.motherUserId}>
                                {m.displayName}
                            </option>
                        ))}
                    </select>
                </label>
            ) : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                    <p className="m-0 text-xs font-extrabold uppercase text-muted">Blood pressure</p>
                    <div className="mt-2 flex gap-2">
                        <input
                            className="w-full rounded-lg border border-line px-2 py-2 text-sm"
                            inputMode="numeric"
                            placeholder="Sys"
                            value={sys}
                            onChange={(e) => setSys(e.target.value)}
                        />
                        <input
                            className="w-full rounded-lg border border-line px-2 py-2 text-sm"
                            inputMode="numeric"
                            placeholder="Dia"
                            value={dia}
                            onChange={(e) => setDia(e.target.value)}
                        />
                    </div>
                </div>
                <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                    <p className="m-0 text-xs font-extrabold uppercase text-muted">Heart rate</p>
                    <input
                        className="mt-2 w-full rounded-lg border border-line px-2 py-2 text-sm"
                        inputMode="numeric"
                        placeholder="BPM"
                        value={hr}
                        onChange={(e) => setHr(e.target.value)}
                    />
                </div>
                <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                    <p className="m-0 text-xs font-extrabold uppercase text-muted">SpO₂</p>
                    <input
                        className="mt-2 w-full rounded-lg border border-line px-2 py-2 text-sm"
                        inputMode="numeric"
                        placeholder="%"
                        value={spo2}
                        onChange={(e) => setSpo2(e.target.value)}
                    />
                </div>
                <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                    <p className="m-0 text-xs font-extrabold uppercase text-muted">Temperature (°F)</p>
                    <input
                        className="mt-2 w-full rounded-lg border border-line px-2 py-2 text-sm"
                        inputMode="decimal"
                        placeholder="98.6"
                        value={temp}
                        onChange={(e) => setTemp(e.target.value)}
                    />
                </div>
            </div>

            {msg ? <p className="mt-4 text-sm text-muted">{msg}</p> : null}

            <button
                type="button"
                disabled={saving || !motherId}
                onClick={() => void save()}
                className="mt-8 flex h-12 w-full items-center justify-center rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-50"
            >
                {saving ? "Saving…" : "Save vitals"}
            </button>
        </div>
    );
}
