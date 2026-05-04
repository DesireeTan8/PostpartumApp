"use client";

import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";
import { MotherSchedulePageContent } from "@/components/dashboard/schedule/mother-schedule-page";

export default function MotherSchedulePage() {
    return (
        <MotherDashboardShell>
            <MotherSchedulePageContent />
        </MotherDashboardShell>
    );
}