"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export type RegistrationRoleTab = "mother" | "caregiver" | "professional";

const roleTabs: Array<{ href: string; label: string; id: RegistrationRoleTab }> = [
    { href: "/auth/register/mother", label: "Mother", id: "mother" },
    { href: "/auth/register/caregiver", label: "Caregiver", id: "caregiver" },
    { href: "/auth/register/professional", label: "Professional", id: "professional" },
];

type RegistrationLayoutProps = {
    activeRole: RegistrationRoleTab;
    mobileTitle: string;
    sidebar: ReactNode;
    children: ReactNode;
};

const logoClass = "text-[1.15rem] font-extrabold tracking-tight text-ink [&_span]:text-brand";

export function RegistrationLayout({
    activeRole,
    mobileTitle,
    sidebar,
    children,
}: RegistrationLayoutProps) {
    const router = useRouter();

    return (
        <div className="flex min-h-dvh flex-col bg-warm-canvas">
            <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-[#f0e4d4] bg-white/85 px-5 py-4 backdrop-blur-sm">
                <Link href="/auth/welcome" className={logoClass}>
                    Postpartum <span>Pathways</span>
                </Link>
                <nav className="flex flex-wrap gap-1.5 rounded-full bg-[#f3ebe0] p-1" aria-label="Registration role">
                    {roleTabs.map((tab) => (
                        <Link
                            key={tab.id}
                            href={tab.href}
                            className={`cursor-pointer whitespace-nowrap rounded-full border-0 px-3.5 py-2 text-[13px] font-bold no-underline transition-colors ${activeRole === tab.id
                                ? "bg-white text-brand shadow-sm"
                                : "bg-transparent text-[#5c6474] hover:text-brand"
                                }`}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </nav>
            </header>

            <div className="flex flex-1 flex-col">
                <header className="grid min-[900px]:hidden grid-cols-[40px_1fr_40px] items-end border-b border-[#d5dbe2] bg-[#f8f9fa] px-[18px] pb-4">
                    <button
                        type="button"
                        className="h-10 w-10 cursor-pointer border-0 bg-transparent text-[28px] leading-none text-[#4d5563]"
                        onClick={() => router.back()}
                        aria-label="Back"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="m-0 text-center text-[17px] font-extrabold leading-none">{mobileTitle}</h1>
                    <span />
                </header>

                <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col gap-6 px-5 py-5 pb-8 min-[900px]:flex-row min-[900px]:items-start min-[900px]:gap-10 min-[900px]:px-7 min-[900px]:pb-12">
                    <div className="min-[900px]:min-w-0 min-[900px]:flex-1">
                        <div className="rounded-2xl border border-[#eee6d8] bg-surface p-5 pb-7 shadow-[0_8px_32px_rgba(45,55,72,0.08)] min-[900px]:p-8 min-[900px]:pb-9">
                            {children}
                        </div>
                    </div>
                    <aside className="min-[900px]:sticky min-[900px]:top-6 min-[900px]:w-[340px] min-[900px]:max-w-full min-[900px]:shrink-0">
                        {sidebar}
                    </aside>
                </div>
            </div>

            <footer className="mt-auto bg-[#1c2130] px-5 py-7 pb-8 text-[0.82rem] text-[#c5cad6]">
                <div className="mx-auto grid max-w-[1120px] gap-6 sm:grid-cols-[1.2fr_repeat(3,1fr)]">
                    <div>
                        <div className={`${logoClass} text-[#e8ecf4]`}>
                            Postpartum <span>Pathways</span>
                        </div>
                        <p className="mt-2.5 max-w-[280px] leading-normal">
                            Supporting mothers, caregivers, and clinicians through the fourth trimester.
                        </p>
                        <span className="mt-2.5 inline-block rounded-lg bg-brand/20 px-2.5 py-1.5 text-[0.72rem] font-bold text-[#9ee5e3]">
                            HIPAA-minded design
                        </span>
                    </div>
                    <div>
                        <h4 className="mb-2.5 mt-0 text-[0.75rem] font-normal uppercase tracking-wide text-[#8b93a8]">
                            Support
                        </h4>
                        <div className="flex flex-col gap-1.5">
                            <a className="text-[#9ee5e3] no-underline hover:underline" href="#">
                                Help Center
                            </a>
                            <a className="text-[#9ee5e3] no-underline hover:underline" href="#">
                                Contact Us
                            </a>
                        </div>
                    </div>
                    <div>
                        <h4 className="mb-2.5 mt-0 text-[0.75rem] font-normal uppercase tracking-wide text-[#8b93a8]">
                            Privacy &amp; Legal
                        </h4>
                        <div className="flex flex-col gap-1.5">
                            <a className="text-[#9ee5e3] no-underline hover:underline" href="#">
                                Terms of Service
                            </a>
                            <a className="text-[#9ee5e3] no-underline hover:underline" href="#">
                                Privacy Policy
                            </a>
                        </div>
                    </div>
                    <div>
                        <h4 className="mb-2.5 mt-0 text-[0.75rem] font-normal uppercase tracking-wide text-[#8b93a8]">
                            Trust
                        </h4>
                        <p className="m-0 leading-snug">Encrypted data in transit and at rest. You control what you share.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}