"use client";

import { DashboardNav } from "@/components/navigation/dashboard-nav";
import SignOutButton from "@/components/auth/sign-out-button";
import { ProfessionalCareInboxContent } from "@/components/dashboard/professional/professional-care-inbox";

export default function ProfessionalHomePage() {
    return (
        <main className="flex min-h-dvh flex-col bg-gradient-to-b from-[#e9f6f1] via-[#dff0ea] to-[#d4ebe4] pb-[88px]">
            <header className="grid h-[100px] grid-cols-[40px_1fr_40px] items-end border-b border-[#c5ddd4] bg-white/92 px-[18px] pb-4">
                <span />
                <h1 className="m-0 text-center text-[17px] font-extrabold leading-none">Home</h1>
                <SignOutButton />
            </header>
            <ProfessionalCareInboxContent />
            <DashboardNav role="professional" />
        </main>
    );
}