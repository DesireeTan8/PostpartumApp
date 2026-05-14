"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    CalendarDays,
    CheckSquare,
    HeartHandshake,
    Home,
    LayoutDashboard,
    MessageCircle,
    UserRound,
    FileText,
    HelpCircle,
    Bell,
    Sparkles,
} from "lucide-react";
import SignOutButton from "@/components/auth/sign-out-button";
import { Header } from "@/components/layout/Header";

function navActive(pathname: string, href: string) {
    if (href === "/dashboard/caregiver") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
}

const desktopNav = [
    { href: "/dashboard/caregiver", label: "Dashboard", Icon: LayoutDashboard },
    { href: "/dashboard/caregiver/tasks", label: "Tasks", Icon: CheckSquare },
    { href: "/dashboard/caregiver/support-plan", label: "Support Plan", Icon: HeartHandshake },
    { href: "/dashboard/caregiver/appointments", label: "Appointments", Icon: CalendarDays },
    { href: "/dashboard/caregiver/notes", label: "Notes", Icon: FileText },
    { href: "/dashboard/caregiver/chat", label: "Care Chat", Icon: MessageCircle },
    { href: "/dashboard/caregiver/profile", label: "Profile", Icon: UserRound },
] as const;

const mobileNav = [
    { href: "/dashboard/caregiver", label: "Home", Icon: Home },
    { href: "/dashboard/caregiver/notes", label: "Notes", Icon: FileText },
    { href: "/dashboard/caregiver/tasks", label: "Tasks", Icon: CheckSquare },
    { href: "/dashboard/caregiver/appointments", label: "Appts", Icon: CalendarDays },
    { href: "/dashboard/caregiver/chat", label: "AI Chat", Icon: Sparkles },
] as const;

const pageTitle: Record<string, string> = {
    "/dashboard/caregiver": "Caregiver",
    "/dashboard/caregiver/tasks": "Support Tasks",
    "/dashboard/caregiver/tasks/new": "Create Task",
    "/dashboard/caregiver/appointments": "Appointments",
    "/dashboard/caregiver/notes": "Care Notes",
    "/dashboard/caregiver/notes/new": "New Care Note",
    "/dashboard/caregiver/chat": "Care Chat (AI Assistant)",
    "/dashboard/caregiver/support-plan": "Edit Support Plan",
    "/dashboard/caregiver/schedule": "Schedule",
    "/dashboard/caregiver/patients": "Patients",
    "/dashboard/caregiver/profile": "Profile",
    "/dashboard/caregiver/network": "Network",
    "/dashboard/caregiver/vitals": "Log Vitals",
};

function titleFromPath(pathname: string): string {
    if (pageTitle[pathname]) return pageTitle[pathname];
    if (pathname.startsWith("/dashboard/caregiver/tasks/")) {
        if (pathname.endsWith("/new")) return "Create Task";
        return "Task Details";
    }
    if (pathname.startsWith("/dashboard/caregiver/notes/")) {
        if (pathname.endsWith("/new")) return "New Care Note";
        return "Care Note";
    }
    if (pathname.startsWith("/dashboard/caregiver/mothers/")) return "Patient";
    return "Postpartum Pathways";
}

export function CaregiverAppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const title = titleFromPath(pathname);

    const desktopEnd = (
        <>
            <button
                type="button"
                className="grid size-10 place-items-center rounded-full border-0 bg-[#f3f4f6] text-muted"
                aria-label="Help"
            >
                <HelpCircle className="size-5" />
            </button>
            <button
                type="button"
                className="relative grid size-10 place-items-center rounded-full border-0 bg-[#f3f4f6] text-muted"
                aria-label="Notifications"
            >
                <Bell className="size-5" />
                <span className="absolute right-2 top-2 size-2 rounded-full bg-[#e11d48]" aria-hidden />
            </button>
            <Link
                href="/dashboard/caregiver/profile"
                className="flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 no-underline shadow-sm"
            >
                <span className="relative">
                    <span className="grid size-9 place-items-center rounded-full bg-brand/15 text-xs font-extrabold text-brand">
                        Me
                    </span>
                    <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-[#22c55e]" aria-hidden />
                </span>
                <span className="hidden text-left xl:block">
                    <span className="block text-xs font-extrabold text-ink">Account</span>
                    <span className="block text-[0.65rem] text-muted">Caregiver</span>
                </span>
            </Link>
        </>
    );

    const mobileEnd = (
        <button
            type="button"
            className="grid size-9 place-items-center rounded-full border-0 bg-[#f3f4f6] text-muted"
            aria-label="Notifications"
        >
            <Bell className="size-5" />
        </button>
    );

    return (
        <div className="min-h-dvh bg-[#f8f9fa] text-ink lg:flex">
            {/* Desktop sidebar */}
            <aside className="hidden w-[260px] shrink-0 flex-col border-r border-line bg-[#f3f4f6] lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex">
                <div className="flex h-16 items-center gap-2 border-b border-line/80 px-5">
                    <span className="grid size-9 place-items-center rounded-xl bg-brand/15 text-brand">
                        <HeartHandshake className="size-5" strokeWidth={2} aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <p className="m-0 truncate text-[0.7rem] font-extrabold uppercase tracking-wide text-muted">Postpartum</p>
                        <p className="m-0 truncate text-sm font-extrabold text-brand">Pathways</p>
                    </div>
                </div>
                <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4" aria-label="Caregiver menu">
                    <p className="mb-2 px-3 text-[0.65rem] font-bold uppercase tracking-wider text-muted">Menu</p>
                    {desktopNav.map(({ href, label, Icon }) => {
                        const active = navActive(pathname, href);
                        return (
                            <Link
                                key={href}
                                href={href}
                                prefetch
                                className={
                                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.9rem] font-semibold no-underline transition-colors " +
                                    (active
                                        ? "border-l-[3px] border-brand bg-white text-brand shadow-sm"
                                        : "border-l-[3px] border-transparent text-muted hover:bg-white/70 hover:text-ink")
                                }
                            >
                                <Icon className="size-[18px] shrink-0 opacity-90" strokeWidth={active ? 2.25 : 2} aria-hidden />
                                {label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="border-t border-line/80 p-3">
                    <SignOutButton className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-white py-2.5 text-[0.85rem] font-bold text-muted" />
                </div>
            </aside>

            <div className="flex min-h-dvh flex-1 flex-col lg:ml-[260px]">
                <Header
                    title={title}
                    mobileStart={
                        <Link href="/dashboard/caregiver/profile" className="text-ink no-underline" aria-label="Profile">
                            <UserRound className="size-6" strokeWidth={2} />
                        </Link>
                    }
                    desktopEnd={desktopEnd}
                    mobileEnd={mobileEnd}
                />

                <main className="flex-1 pb-24 lg:pb-10">{children}</main>
            </div>

            {/* Mobile bottom nav */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-40 flex h-[68px] items-start justify-around border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom,0)] pt-2 backdrop-blur-md lg:hidden"
                aria-label="Main navigation"
            >
                {mobileNav.map(({ href, label, Icon }) => {
                    const active = navActive(pathname, href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            prefetch
                            className={
                                "flex min-w-[56px] flex-col items-center gap-0.5 text-[10px] font-bold no-underline " +
                                (active ? "text-brand" : "text-[#6b8a84]")
                            }
                        >
                            <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 2} aria-hidden />
                            {label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
