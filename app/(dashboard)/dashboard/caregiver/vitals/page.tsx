"use client";

import { Suspense } from "react";
import { CaregiverVitalsPage } from "@/components/dashboard/caregiver/caregiver-vitals-page";

export default function Page() {
    return (
        <Suspense fallback={<p className="px-6 py-16 text-center text-sm text-muted">Loading…</p>}>
            <CaregiverVitalsPage />
        </Suspense>
    );
}