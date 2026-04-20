"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Bell,
    CalendarDays,
    ClipboardList,
    Home,
    MessageCircleQuestion,
} from "lucide-react";

const base = "/dashboard/mother";

const items = [
    { href: base, label: "Home", icon: Home, match: (p: string) => p === base || p === `${base}/` },
    { href: `${base}/logs`, label: "Logs", icon: ClipboardList, match: (p: string) => p.startsWith(`${base}/logs`) },
    { href: `${base}/care`, label: "Care", icon: Bell, match: (p: string) => p.startsWith(`${base}/care`) },
    {
        href: `${base}/schedule`,
        label: "Schedule",
        icon: CalendarDays,
        match: (p: string) => p.startsWith(`${base}/schedule`),
    },
    {
        href: `${base}/ai-chat`,
        label: "AI Chat",
        icon: MessageCircleQuestion,
        match: (p: string) => p.startsWith(`${base}/ai-chat`),
    },
] as const;

const itemBase =
    "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 py-1 text-[10px] font-bold text-[#6b7d8a] no-underline [&_span]:max-w-16 [&_span]:truncate [&_span]:text-center [&_span]:leading-[1.15] [&_svg]:opacity-[0.88]";

export function MotherBottomNav() {
    const pathname = usePathname();

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-40 flex h-[72px] items-start justify-between border-t border-[#d8e3e5] bg-white/97 pb-[env(safe-area-inset-bottom,0)] pt-2 backdrop-blur-md lg:hidden"
            aria-label="Mother app navigation"
        >
            {items.map(({ href, label, icon: Icon, match }) => {
                const active = match(pathname);
                return (
                    <Link
                        key={href}
                        href={href}
                        className={`${itemBase} ${active ? "text-brand [&_svg]:opacity-100" : ""}`}
                        prefetch={true}
                    >
                        <Icon size={22} strokeWidth={active ? 2.25 : 2} />
                        <span>{label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}