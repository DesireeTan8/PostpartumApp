"use client";

import Link from "next/link";
import { CaregiverNoLinkedMothersPanel } from "@/components/dashboard/caregiver/caregiver-no-linked-mothers-panel";

export default function CaregiverNetworkPage() {
    return (
        <div className="mx-auto max-w-lg px-5 py-8">
            <section className="text-center text-muted">
                <h2 className="mb-2.5 mt-0 text-xl text-ink">Care network</h2>
                <p className="m-0 leading-relaxed">Shared updates and invitations will show here as your circle grows.</p>
            </section>
            <CaregiverNoLinkedMothersPanel
                className="mt-8"
                hint="Link a mother first — then you’ll see shortcuts to her care activity and team from this area."
            />
            <Link href="/dashboard/caregiver/patients" className="mt-6 block text-center text-sm font-bold text-brand no-underline">
                View linked patients
            </Link>
        </div>
    );
}