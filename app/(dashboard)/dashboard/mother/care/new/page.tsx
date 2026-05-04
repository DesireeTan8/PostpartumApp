"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";
import { MotherReminderDrawer } from "@/components/dashboard/care/mother-reminder-drawer";
import { useMotherPageHeader } from "@/components/layout/mother-dashboard-header-context";

function MotherCareReminderFormHeader() {
    const searchParams = useSearchParams();
    const edit = searchParams.get("edit")?.trim() ?? "";
    const { setPageHeader } = useMotherPageHeader();

    useEffect(() => {
        setPageHeader({
            title: edit ? "Edit reminder" : "New reminder",
            layout: "detail",
            backHref: "/dashboard/mother/care",
            backLabel: "Back to care plan",
        });
        return () => setPageHeader(null);
    }, [edit, setPageHeader]);

    return null;
}

export default function MotherNewReminderPage() {
    return (
        <MotherDashboardShell>
            <Suspense fallback={<p className="p-8 text-center text-sm text-muted">Loading…</p>}>
                <MotherCareReminderFormHeader />
                <MotherReminderDrawer closeTo="/dashboard/mother/care" />
            </Suspense>
        </MotherDashboardShell>
    );
}