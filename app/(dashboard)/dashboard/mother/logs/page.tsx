"use client";

import { HealthLogsPageContent } from "@/components/dashboard/health-logs/health-logs-page";
import { RegisterHealthLogsAppBar } from "@/components/dashboard/health-logs/health-logs-app-bar";
import { HealthLogsNavProvider } from "@/components/dashboard/health-logs/health-logs-nav-context";
import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";

export default function MotherLogsPage() {
    return (
        <HealthLogsNavProvider>
            <MotherDashboardShell>
                <RegisterHealthLogsAppBar />
                <HealthLogsPageContent />
            </MotherDashboardShell>
        </HealthLogsNavProvider>
    );
}