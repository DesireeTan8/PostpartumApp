"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useHealthLogsNav } from "@/components/dashboard/health-logs/health-logs-nav-context";
import { useMotherPageHeader } from "@/components/layout/mother-dashboard-header-context";

/**
 * Full-width header row for the health logs list (search, filters, profile).
 * Registered via `setPageHeader({ render: () => <HealthLogsAppBar /> })` from a parent route.
 */
export function HealthLogsAppBar() {
    const pathname = usePathname();
    const healthLogsNav = useHealthLogsNav();
    const { profileSlot } = useMotherPageHeader();
    const healthLogsSearchInputRef = useRef<HTMLInputElement | null>(null);
    const [healthLogsSearchExpanded, setHealthLogsSearchExpanded] = useState(false);

    useEffect(() => {
        queueMicrotask(() => setHealthLogsSearchExpanded(false));
    }, [pathname]);

    const openHealthLogsSearch = () => {
        setHealthLogsSearchExpanded(true);
        requestAnimationFrame(() => {
            healthLogsSearchInputRef.current?.focus();
        });
    };

    return (
        <div className="relative mx-auto flex max-h-[52px] min-h-[52px] max-w-[1200px] shrink-0 items-center gap-2 overflow-hidden px-4 py-0 max-lg:h-[52px] lg:max-h-none lg:min-h-14 lg:gap-3 lg:px-7 lg:py-3">
            <h1
                className={`m-0 shrink-0 self-center text-[1.05rem] font-extrabold leading-tight tracking-tight text-ink transition-opacity max-lg:mr-auto max-lg:leading-tight sm:text-[1.2rem] ${healthLogsSearchExpanded ? "max-lg:opacity-0" : ""
                    }`}
            >
                Health logs
            </h1>
            <label
                className={`relative box-border flex justify-start min-h-10 min-w-0 cursor-text items-center rounded-full border border-line bg-[#f5f8f9] py-0 pl-[38px] pr-3 lg:min-w-0 lg:max-w-[420px] lg:flex-1 ${healthLogsSearchExpanded
                    ? "max-lg:!flex max-lg:absolute max-lg:inset-x-4 max-lg:top-1/2 max-lg:z-50 max-lg:max-w-none max-lg:-translate-y-1/2 max-lg:shadow-[0_8px_24px_rgba(36,65,76,0.16)]"
                    : "max-lg:hidden"
                    }`}
                onClick={() => {
                    if (!healthLogsSearchExpanded) openHealthLogsSearch();
                }}
            >
                <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b96a8]" aria-hidden />
                <input
                    ref={healthLogsSearchInputRef}
                    type="search"
                    className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[0.9rem] leading-snug outline-none"
                    placeholder="Search notes…"
                    aria-label="Search logs"
                    value={healthLogsNav.search}
                    onChange={(e) => healthLogsNav.setSearch(e.target.value)}
                    onFocus={() => setHealthLogsSearchExpanded(true)}
                    onBlur={() => {
                        if (!healthLogsNav.search.trim()) setHealthLogsSearchExpanded(false);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") {
                            setHealthLogsSearchExpanded(false);
                            healthLogsSearchInputRef.current?.blur();
                        }
                    }}
                />
            </label>
            <div
                className={`ml-auto flex shrink-0 items-center gap-2 self-center ${healthLogsSearchExpanded ? "max-lg:invisible max-lg:pointer-events-none" : ""
                    }`}
            >
                <button
                    type="button"
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent text-[#4d5563] hover:bg-[#eef5f5] hover:text-brand lg:hidden ${healthLogsSearchExpanded ? "bg-[#eaf6f5] text-brand" : ""
                        }`}
                    onClick={() => {
                        if (healthLogsSearchExpanded && !healthLogsNav.search.trim()) {
                            setHealthLogsSearchExpanded(false);
                            return;
                        }
                        openHealthLogsSearch();
                    }}
                    aria-label={healthLogsSearchExpanded ? "Collapse search" : "Expand search"}
                    aria-pressed={healthLogsSearchExpanded}
                >
                    <Search size={18} aria-hidden />
                </button>
                <button
                    type="button"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-0 bg-transparent text-[#4d5563] hover:bg-[#eef5f5] hover:text-brand lg:h-11 lg:w-11 ${healthLogsNav.showFilters ? "bg-[#eaf6f5] text-brand" : ""
                        }`}
                    onClick={() => healthLogsNav.setShowFilters((v) => !v)}
                    aria-label="Toggle filters"
                    aria-pressed={healthLogsNav.showFilters}
                >
                    <SlidersHorizontal size={20} strokeWidth={2} aria-hidden />
                </button>
                <div className="hidden lg:contents">{profileSlot}</div>
            </div>
        </div>
    );
}

export function RegisterHealthLogsAppBar() {
    const { setPageHeader, profileSlot } = useMotherPageHeader();
    useEffect(() => {
        setPageHeader({
            title: "Health logs",
            render: () => <HealthLogsAppBar />,
        });
        return () => setPageHeader(null);
    }, [setPageHeader, profileSlot]);
    return null;
}
