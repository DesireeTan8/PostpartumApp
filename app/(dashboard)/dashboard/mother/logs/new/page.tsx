"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";
import { MotherNewLogDrawer } from "@/components/dashboard/health-logs/mother-new-log-drawer";
import { useMotherPageHeader } from "@/components/layout/mother-dashboard-header-context";

function MotherNewLogFormHeader() {
    const searchParams = useSearchParams();
    const edit = searchParams.get("edit")?.trim() ?? "";
    const { setPageHeader } = useMotherPageHeader();

    useEffect(() => {
        setPageHeader({
            title: edit ? "Edit log" : "New log",
            layout: "detail",
            backHref: "/dashboard/mother/logs",
            backLabel: "Back to health logs",
        });
        return () => setPageHeader(null);
    }, [edit, setPageHeader]);

    return null;
}

export default function MotherNewLogPage() {
    return (
        <MotherDashboardShell>
            <Suspense fallback={<p className="p-8 text-center text-sm text-muted">Loading…</p>}>
                <MotherNewLogFormHeader />
                <MotherNewLogDrawer closeTo="/dashboard/mother/logs" />
            </Suspense>
        </MotherDashboardShell>
    );
}