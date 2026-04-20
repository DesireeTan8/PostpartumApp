"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    CalendarDays,
    ClipboardList,
    HeartPulse,
    Home,
    LogOut,
    MessageCircleQuestion,
    PlusCircle,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { MotherBottomNav } from "@/components/dashboard/mother/mother-bottom-nav";
import {
    MotherPageHeaderProvider,
    useMotherPageHeader,
} from "@/components/layout/mother-dashboard-header-context";
import {
    MotherDefaultDiscoverChrome,
    MotherDetailPageChrome,
    MotherStandardPageChrome,
    motherFallbackPageTitle,
} from "@/components/layout/mother-dashboard-header-chrome";

const base = "/dashboard/mother";

function initials(name: string | null | undefined): string {
    if (!name?.trim()) return "?";
    const parts = name.trim().split(/\s+/);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (a + b).toUpperCase();
}

const sidebarRecovery = [
    { href: base, label: "Dashboard", icon: Home },
    { href: `${base}/logs`, label: "Health logs", icon: ClipboardList },
    { href: `${base}/logs/new`, label: "New log", icon: PlusCircle },
];

const sidebarCare = [
    { href: `${base}/care`, label: "Care plan", icon: HeartPulse },
    { href: `${base}/schedule`, label: "Appointments", icon: CalendarDays },
    { href: `${base}/ai-chat`, label: "Ask care team", icon: MessageCircleQuestion },
];

type MotherDashboardShellProps = {
    children: ReactNode;
    showMobileAppHeader?: boolean;
};

function MotherDashboardHeaderHost({ showMobileBrandWhenEmpty }: { showMobileBrandWhenEmpty: boolean }) {
    const pathname = usePathname();
    const { pageHeader, profileSlot } = useMotherPageHeader();

    const inner = useMemo(() => {
        if (pageHeader?.render) {
            return pageHeader.render();
        }

        if (pageHeader) {
            const layout = pageHeader.layout ?? (pageHeader.backHref ? "detail" : "standard");
            if (layout === "detail") {
                return <MotherDetailPageChrome config={pageHeader} profileSlot={profileSlot} />;
            }
            return <MotherStandardPageChrome config={pageHeader} profileSlot={profileSlot} />;
        }

        const isMotherHome = pathname.replace(/\/$/, "") === base || pathname.replace(/\/$/, "") === `${base}/`;
        if (isMotherHome && showMobileBrandWhenEmpty) {
            return <MotherDefaultDiscoverChrome showMobileBrand profileSlot={profileSlot} />;
        }

        const fallback = motherFallbackPageTitle(pathname);
        const title = fallback ?? "Home";
        return (
            <MotherStandardPageChrome
                config={{ title, layout: "standard" }}
                profileSlot={profileSlot}
            />
        );
    }, [pageHeader, pathname, profileSlot, showMobileBrandWhenEmpty]);

    return (
        <header className="sticky top-0 z-30 max-lg:overflow-hidden border-b border-[#e0e8ea] bg-white/94 backdrop-blur-md">
            {inner}
        </header>
    );
}

function MotherDashboardShellInner({
    children,
    showMobileAppHeader,
}: {
    children: ReactNode;
    showMobileAppHeader: boolean;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [navAvatarUrl, setNavAvatarUrl] = useState<string | null>(null);
    const [navInitials, setNavInitials] = useState("?");

    const signOut = async () => {
        await supabase.auth.signOut();
        router.replace("/auth/sign-in");
    };

    useEffect(() => {
        let active = true;
        void (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!active || !user) return;
            const { data } = await supabase
                .from("profiles")
                .select("avatar_url, full_name")
                .eq("user_id", user.id)
                .maybeSingle();
            if (!active) return;
            const row = (data ?? null) as { avatar_url?: string | null; full_name?: string | null } | null;
            setNavAvatarUrl(row?.avatar_url ?? null);
            setNavInitials(initials(row?.full_name ?? null));
        })();

        const onAvatarUpdated = (event: Event) => {
            const customEvent = event as CustomEvent<{ avatarUrl?: string | null }>;
            const nextUrl = customEvent.detail?.avatarUrl ?? null;
            setNavAvatarUrl(nextUrl);
        };
        window.addEventListener("profile-avatar-updated", onAvatarUpdated);
        return () => {
            active = false;
            window.removeEventListener("profile-avatar-updated", onAvatarUpdated);
        };
    }, []);

    const profileSlot = useMemo(
        () => (
            <Link
                href={`${base}/profile`}
                className="relative inline-flex h-[42px] w-[42px] shrink-0 rounded-full bg-gradient-to-br from-[#c5e8e6] to-brand"
                aria-label="Profile"
            >
                <span className="block size-full overflow-hidden rounded-[inherit]">
                    {navAvatarUrl ? (
                        <img src={navAvatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                        <span
                            className="inline-flex size-full items-center justify-center bg-gradient-to-br from-[#d3eeed] to-[#b5e1df] text-[0.75rem] font-extrabold text-[#0f6160]"
                            aria-hidden
                        >
                            {navInitials}
                        </span>
                    )}
                </span>
                <span
                    className="absolute bottom-0.5 right-0.5 size-2.5 rounded-full border-2 border-white bg-[#3cb371]"
                    title="Online"
                />
            </Link>
        ),
        [navAvatarUrl, navInitials]
    );

    const isActive = (href: string) =>
        href === base ? pathname === base || pathname === `${base}/` : pathname.startsWith(href);

    const navLinkBase =
        "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[0.92rem] font-semibold text-[#3d4a5c] no-underline hover:bg-white/60 hover:text-brand";
    const navLinkActive = "bg-white text-brand shadow-[0_2px_8px_rgba(45,90,85,0.12)]";

    return (
        <MotherPageHeaderProvider
            profileSlot={profileSlot}
            showMobileBrandWhenEmpty={showMobileAppHeader}
        >
            <div className="flex min-h-dvh flex-col bg-shell-canvas text-ink lg:flex-row">
                <aside
                    className="hidden min-h-dvh w-[260px] shrink-0 flex-col border-r border-[#d5dde2] bg-shell-sidebar px-4 pb-6 pt-5 lg:flex"
                    aria-label="Main navigation"
                >
                    <Link href={base} className="mb-7 flex items-center gap-2.5 px-2 py-1 text-base font-bold text-ink no-underline">
                        <span
                            className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#6ec9c6] to-brand text-[1.1rem] text-white"
                            aria-hidden
                        >
                            {"\u2661"}
                        </span>
                        <span className="inline-flex flex-wrap items-center gap-x-1 leading-tight">
                            Postpartum <strong className="font-extrabold text-brand">Pathways</strong>
                        </span>
                    </Link>
                    <div className="mb-[22px]">
                        <p className="mb-2.5 ml-2 mt-0 text-[0.68rem] font-extrabold uppercase tracking-wider text-[#7a8799]">
                            Recovery tracking
                        </p>
                        <nav>
                            {sidebarRecovery.map(({ href, label, icon: Icon }) => (
                                <Link key={href} href={href} className={`${navLinkBase} ${isActive(href) ? navLinkActive : ""}`}>
                                    <Icon size={18} />
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                    <div className="mb-[22px]">
                        <p className="mb-2.5 ml-2 mt-0 text-[0.68rem] font-extrabold uppercase tracking-wider text-[#7a8799]">
                            Care &amp; support
                        </p>
                        <nav>
                            {sidebarCare.map(({ href, label, icon: Icon }) => (
                                <Link key={href} href={href} className={`${navLinkBase} ${isActive(href) ? navLinkActive : ""}`}>
                                    <Icon size={18} />
                                    {label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                    <button
                        type="button"
                        className="mt-auto flex cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent px-3 py-2.5 text-[0.92rem] font-semibold text-[#8a5a5a] hover:bg-white/50"
                        onClick={signOut}
                    >
                        <LogOut size={18} />
                        Sign out
                    </button>
                </aside>

                <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
                    <MotherDashboardHeaderHost showMobileBrandWhenEmpty={showMobileAppHeader} />

                    <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 pb-24 pt-4 lg:px-8 lg:pb-10 lg:pt-7">{children}</div>

                    <footer className="mt-auto hidden border-t border-[#e0e8ea] bg-[#f8fafb] px-6 py-4 lg:block">
                        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 text-[0.8rem] text-muted">
                            <span>© {new Date().getFullYear()} Postpartum Pathways. All rights reserved.</span>
                            <div className="flex gap-4">
                                <a className="text-brand no-underline hover:underline" href="#">
                                    Privacy Policy
                                </a>
                                <a className="text-brand no-underline hover:underline" href="#">
                                    Terms of Service
                                </a>
                                <a className="text-brand no-underline hover:underline" href="#">
                                    Help Center
                                </a>
                            </div>
                        </div>
                    </footer>
                </div>

                <MotherBottomNav />
            </div>
        </MotherPageHeaderProvider>
    );
}

export function MotherDashboardShell({
    children,
    showMobileAppHeader = true,
}: MotherDashboardShellProps) {
    return <MotherDashboardShellInner showMobileAppHeader={showMobileAppHeader}>{children}</MotherDashboardShellInner>;
}

// Re-export for pages that configure the shared header
export { useMotherPageHeader } from "@/components/layout/mother-dashboard-header-context";
