"use client";

/** Healthcare professional dashboard frame — role shells live in `components/layout/`. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { Bell, Home, Network, UserRound } from "lucide-react";
import { Header, HEADER_ICON_LINK } from "@/components/layout/Header";

function navActive(pathname: string, href: string) {
    if (href === "/dashboard/professional") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
}

const desktopNav = [
    { href: "/dashboard/professional", label: "Dashboard", Icon: Home },
    { href: "/dashboard/professional/network", label: "Patients", Icon: Network },
    { href: "/dashboard/professional/profile", label: "Profile", Icon: UserRound },
] as const;

const pageTitle: Record<string, string> = {
    "/dashboard/professional": "Professional Dashboard",
    "/dashboard/professional/network": "Professional Network",
    "/dashboard/professional/profile": "Profile",
};

function titleFromPath(pathname: string): string {
    return pageTitle[pathname] ?? "Postpartum Pathways";
}

export function ProfessionalDashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const title = titleFromPath(pathname);

    const profileSlot = useMemo(
        () => (
            <Link href="/dashboard/professional/profile" className={HEADER_ICON_LINK} aria-label="Profile">
                <UserRound size={18} strokeWidth={2} aria-hidden />
            </Link>
        ),
        [],
    );

    const desktopTrailing = useMemo(
        () => (
            <>
                <button
                    type="button"
                    className="relative grid size-10 place-items-center rounded-full border-0 bg-[#f3f4f6] text-muted"
                    aria-label="Notifications"
                >
                    <Bell className="size-5" />
                </button>
                {profileSlot}
            </>
        ),
        [profileSlot],
    );

    return (
        <div className="min-h-dvh bg-shell-canvas text-ink lg:flex">
            <aside className="hidden w-[260px] shrink-0 flex-col border-r border-line bg-shell-sidebar lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex">
                <div className="flex h-16 items-center gap-2 border-b border-line/80 px-5">
                    <span className="grid size-9 place-items-center rounded-xl bg-brand/15 text-brand">+</span>
                    <div className="min-w-0">
                        <p className="m-0 truncate text-[0.7rem] font-extrabold uppercase tracking-wide text-muted">Postpartum</p>
                        <p className="m-0 truncate text-sm font-extrabold text-brand">Pathways</p>
                    </div>
                </div>
                <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4" aria-label="Professional menu">
                    <p className="mb-2 px-3 text-[0.65rem] font-bold uppercase tracking-wider text-muted">Menu</p>
                    {desktopNav.map(({ href, label, Icon }) => {
                        const active = navActive(pathname, href);
                        return (
                            <Link
                                key={href}
                                href={href}
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
            </aside>

            <div className="flex min-h-dvh flex-1 flex-col lg:ml-[260px]">
                <Header
                    title={title}
                    profileSlot={profileSlot}
                    desktopTrailing={desktopTrailing}
                    searchPlaceholder="Search patients…"
                    searchAriaLabel="Search professional app"
                    searchInputName="professional-app-search"
                />

                <main className="flex-1 pb-24 lg:pb-10">{children}</main>
            </div>
        </div>
    );
}
