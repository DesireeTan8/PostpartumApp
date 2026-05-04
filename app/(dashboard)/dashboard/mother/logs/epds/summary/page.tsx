"use client";

import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";
import { EpdsSummaryPage } from "@/components/dashboard/health-logs/epds-db-flow";

export default function MotherEpdsSummaryRoute() {
    return (
        <MotherDashboardShell>
            <EpdsSummaryPage />
        </MotherDashboardShell>
    );
}