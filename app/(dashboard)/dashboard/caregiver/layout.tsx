"use client";

import { CaregiverAppShell } from "@/components/dashboard/caregiver/caregiver-app-shell";

export default function CaregiverLayout({ children }: { children: React.ReactNode }) {
    return <CaregiverAppShell>{children}</CaregiverAppShell>;
}