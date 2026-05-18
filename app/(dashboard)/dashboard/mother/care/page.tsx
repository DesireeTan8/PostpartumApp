"use client";

import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";
import { MotherCarePageContent } from "@/components/dashboard/mother/care/mother-care-page";

export default function MotherCarePage() {
    return (
        <MotherDashboardShell>
            <MotherCarePageContent />
        </MotherDashboardShell>
    );
}