"use client";

import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";
import { EpdsIntroPage } from "@/components/dashboard/mother/health-logs/epds-db-flow";

export default function MotherEpdsIntroRoute() {
    return (
        <MotherDashboardShell>
            <EpdsIntroPage />
        </MotherDashboardShell>
    );
}