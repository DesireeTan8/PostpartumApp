"use client";

import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";
import { EpdsHistoryPage } from "@/components/dashboard/mother/health-logs/epds-db-flow";

export default function MotherEpdsHistoryRoute() {
    return (
        <MotherDashboardShell>
            <EpdsHistoryPage />
        </MotherDashboardShell>
    );
}