"use client";

import { useParams } from "next/navigation";
import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";
import { MotherReminderDetail } from "@/components/dashboard/care/mother-reminder-detail";

export default function MotherReminderInfoPage() {
    const params = useParams();
    const reminderId = typeof params.reminderId === "string" ? params.reminderId : "";

    return (
        <MotherDashboardShell>
            {reminderId ? <MotherReminderDetail reminderId={reminderId} /> : null}
        </MotherDashboardShell>
    );
}