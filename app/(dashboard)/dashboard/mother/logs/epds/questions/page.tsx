"use client";

import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";
import { EpdsQuestionnairePage } from "@/components/dashboard/health-logs/epds-db-flow";

export default function MotherEpdsQuestionsRoute() {
    return (
        <MotherDashboardShell>
            <EpdsQuestionnairePage />
        </MotherDashboardShell>
    );
}