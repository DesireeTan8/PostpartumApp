"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Network, UserRound } from "lucide-react";

type DashboardRole = "mother" | "caregiver" | "professional";

const basePaths: Record<DashboardRole, string> = {
    mother: "/dashboard/mother",
    caregiver: "/dashboard/caregiver",
    professional: "/dashboard/professional",
};

type DashboardNavProps = {
    role: DashboardRole;
};

const navItemBase =
    "flex min-w-[72px] cursor-pointer flex-col items-center gap-1 border-0 bg-transparent text-[11px] font-bold text-[#6b8a84] no-underline [&_svg]:opacity-85";

export function DashboardNav({ role }: DashboardNavProps) {
    const pathname = usePathname();
    const base = basePaths[role];

    const isHome = pathname === base;
    const isNetwork = pathname === `${base}/network`;
    const isProfile = pathname === `${base}/profile`;

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-40 flex h-[72px] items-start justify-around border-t border-[#c5ddd4] bg-white/95 pb-[env(safe-area-inset-bottom,0)] pt-2.5 backdrop-blur-md"
            aria-label="Main navigation"
        >
            <Link
                href={base}
                className={`${navItemBase} ${isHome ? "text-brand [&_svg]:opacity-100" : ""}`}
                prefetch={true}
            >
                <Home size={22} strokeWidth={isHome ? 2.25 : 2} />
                Home
            </Link>
            <Link
                href={`${base}/network`}
                className={`${navItemBase} ${isNetwork ? "text-brand [&_svg]:opacity-100" : ""}`}
                prefetch={true}
            >
                <Network size={22} strokeWidth={isNetwork ? 2.25 : 2} />
                Network
            </Link>
            <Link
                href={`${base}/profile`}
                className={`${navItemBase} ${isProfile ? "text-brand [&_svg]:opacity-100" : ""}`}
                prefetch={true}
            >
                <UserRound size={22} strokeWidth={isProfile ? 2.25 : 2} />
                Profile
            </Link>
        </nav>
    );
}