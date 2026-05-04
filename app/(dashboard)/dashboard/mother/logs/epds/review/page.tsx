"use client";

import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";
import { EpdsReviewPage } from "@/components/dashboard/health-logs/epds-db-flow";

export default function MotherEpdsReviewRoute() {
    return (
        <MotherDashboardShell>
            <EpdsReviewPage />
        </MotherDashboardShell>
    );
}