"use client";

import { CaregiverDashboardShell } from "@/components/layout/caregiver-dashboard-shell";

export default function CaregiverLayout({ children }: { children: React.ReactNode }) {
    return <CaregiverDashboardShell>{children}</CaregiverDashboardShell>;
}