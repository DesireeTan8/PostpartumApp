"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchLinkedMothers, postpartumDayLabel, type LinkedMother } from "@/lib/caregiver/linked-mothers";

type VitalRow = {
    vital_type: string;
    value_primary: number | null;
    value_secondary: number | null;
    unit: string | null;
    recorded_at: string;
};

export function CaregiverMotherDetail({ motherUserId }: { motherUserId: string }) {
    const [mother, setMother] = useState<LinkedMother | null>(null);
    const [vitals, setVitals] = useState<VitalRow[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const { mothers } = await fetchLinkedMothers(supabase);
        setMother(mothers.find((m) => m.motherUserId === motherUserId) ?? null);
        const { data } = await supabase
            .from("mother_vital_readings")
            .select("vital_type, value_primary, value_secondary, unit, recorded_at")
            .eq("mother_user_id", motherUserId)
            .order("recorded_at", { ascending: false })
            .limit(8);
        setVitals((data ?? []) as VitalRow[]);
        setLoading(false);
    }, [motherUserId]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
        void load();
    }, [load]);

    if (loading) {
        return <p className="px-6 py-16 text-center text-sm text-muted">Loading…</p>;
    }

    if (!mother) {
        return (
            <div className="px-6 py-16 text-center">
                <p className="text-sm text-muted">Patient not found in your linked list.</p>
                <Link href="/dashboard/caregiver/patients" className="mt-4 inline-block font-bold text-brand">
                    Back to patients
                </Link>
            </div>
        );
    }

    const latestBp = vitals.find((v) => v.vital_type === "blood_pressure");
    const latestHr = vitals.find((v) => v.vital_type === "heart_rate");
    const latestTemp = vitals.find((v) => v.vital_type === "temperature");
    const latestSpo2 = vitals.find((v) => v.vital_type === "spo2");

    return (
        <div className="mx-auto max-w-lg px-4 py-6 lg:max-w-xl">
            <Link href="/dashboard/caregiver/patients" className="text-sm font-bold text-brand no-underline">
                ← Patients
            </Link>
            <div className="mt-6 text-center">
                {mother.avatarUrl ? (
                    <img src={mother.avatarUrl} alt="" className="mx-auto size-24 rounded-full object-cover ring-4 ring-brand/20" />
                ) : (
                    <span className="mx-auto grid size-24 place-items-center rounded-full bg-brand/15 text-2xl font-extrabold text-brand">
                        {mother.displayName[0]}
                    </span>
                )}
                <h2 className="m-0 mt-4 text-2xl font-extrabold text-ink">{mother.displayName}</h2>
                {postpartumDayLabel(mother.deliveryDate) ? (
                    <p className="m-0 mt-2 text-sm text-muted">{postpartumDayLabel(mother.deliveryDate)}</p>
                ) : null}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-2">
                <a
                    href={mother.phone ? `tel:${mother.phone}` : undefined}
                    className="flex flex-col items-center gap-1 rounded-xl border border-line bg-white py-3 text-xs font-bold text-brand no-underline"
                >
                    <Phone className="size-5" />
                    Call
                </a>
                <Link
                    href="/dashboard/caregiver/chat"
                    className="flex flex-col items-center gap-1 rounded-xl border border-line bg-white py-3 text-xs font-bold text-brand no-underline"
                >
                    <MessageCircle className="size-5" />
                    Message
                </Link>
                <Link
                    href={`/dashboard/caregiver/vitals?mother=${motherUserId}`}
                    className="flex flex-col items-center gap-1 rounded-xl border border-line bg-white py-3 text-xs font-bold text-brand no-underline"
                >
                    Vitals
                </Link>
            </div>

            <section className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm">
                <h3 className="m-0 text-sm font-extrabold text-ink">Current status</h3>
                <p className="m-0 mt-2 text-sm leading-relaxed text-muted">
                    Recovery notes and daily check-ins from the mother app will surface here as your team documents care.
                </p>
            </section>

            <section className="mt-6">
                <h3 className="m-0 text-sm font-extrabold text-ink">Recent vitals</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-line bg-white p-3 shadow-sm">
                        <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">Blood pressure</p>
                        <p className="m-0 mt-1 text-lg font-extrabold text-ink">
                            {latestBp
                                ? `${latestBp.value_primary ?? "—"}/${latestBp.value_secondary ?? "—"}`
                                : "—"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-line bg-white p-3 shadow-sm">
                        <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">Heart rate</p>
                        <p className="m-0 mt-1 text-lg font-extrabold text-ink">
                            {latestHr?.value_primary != null ? `${latestHr.value_primary} bpm` : "—"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-line bg-white p-3 shadow-sm">
                        <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">Temperature</p>
                        <p className="m-0 mt-1 text-lg font-extrabold text-ink">
                            {latestTemp?.value_primary != null ? `${latestTemp.value_primary}°` : "—"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-line bg-white p-3 shadow-sm">
                        <p className="m-0 text-[0.65rem] font-extrabold uppercase text-muted">SpO₂</p>
                        <p className="m-0 mt-1 text-lg font-extrabold text-ink">
                            {latestSpo2?.value_primary != null ? `${latestSpo2.value_primary}%` : "—"}
                        </p>
                    </div>
                </div>
                <Link
                    href={`/dashboard/caregiver/vitals?mother=${motherUserId}`}
                    className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-brand text-sm font-bold text-white no-underline"
                >
                    Log vitals
                </Link>
            </section>
        </div>
    );
}
