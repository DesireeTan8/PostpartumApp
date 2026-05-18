"use client";

import Link from "next/link";
import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";

export default function MotherNetworkPage() {
    return (
        <MotherDashboardShell>
            <div className="max-w-[520px] py-2 pb-8">
                <h1 className="mb-3 text-2xl font-extrabold">Network</h1>
                <p className="mb-5 leading-[1.55] text-muted">
                    Your care circle and shared connections will appear here. For now, use{" "}
                    <Link href="/dashboard/mother/schedule" className="font-bold text-[#44a8a8] underline underline-offset-2">
                        Schedule
                    </Link>{" "}
                    for appointments.
                </p>
            </div>
        </MotherDashboardShell>
    );
}