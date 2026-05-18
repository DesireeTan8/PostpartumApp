"use client";

/**
 * Dashboard header system (mother, caregiver, professional).
 *
 * - **`Header`**: sticky shell — **`children`** (mother custom chrome) or **dashboard** mode (`title` + `profileSlot` + optional `desktopTrailing`, caregiver / professional).
 * - **`HeaderBar`**: one row with `leading` | `center` | `trailing`. Mother mobile uses **`shell="page"` + `denseMobile`** (see `mother-dashboard-header`).
 * - **`HeaderGlobalActions`**: notification / settings / avatar cluster — toggle with `showNotifications`, `showSettings`, `showProfile`.
 * - **`HeaderGlobalSearchField`**: full pill search (desktop / dashboard headers). **Mobile** uses **`DashboardMobileSearchBellCluster`** (expandable search + bell + profile).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, Settings } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Mother app route prefix — used by search placeholder and header actions */
export const MOTHER_APP_BASE = "/dashboard/mother";

/**
 * Mobile health logs list header row — keep in sync with `HealthLogsAppBar`.
 * `relative` + horizontal `px-4` on this row is the positioning context for the expanded search pill (`inset-x-4`).
 */
export const HEADER_MOBILE_HEALTH_LOGS_MATCH_ROW_CLASSNAME =
    "relative flex max-h-[52px] min-h-[52px] items-center gap-2 overflow-hidden px-4 py-0 max-lg:h-[52px]";

/** Collapsed mobile search field (in-flow width = desktop pill cap). Must match `HealthLogsAppBar`. */
export const HEADER_MOBILE_HEALTH_LOGS_MATCH_SEARCH_LABEL_BASE_CLASSNAME =
    "relative box-border flex min-h-10 min-w-0 cursor-text items-center rounded-full border border-line bg-white py-0 pl-[38px] pr-3";

/** Expanded mobile search overlay — must match `HealthLogsAppBar` character-for-character. */
export const HEADER_MOBILE_HEALTH_LOGS_MATCH_SEARCH_LABEL_EXPANDED_CLASSNAME =
    "max-lg:!flex max-lg:absolute max-lg:inset-x-4 max-lg:top-1/2 max-lg:z-50 max-lg:max-w-none max-lg:-translate-y-1/2 max-lg:shadow-[0_8px_24px_rgba(36,65,76,0.16)]";

/** Shared classes for circular icon-only controls in header rows */
export const HEADER_ICON_LINK =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#4d5563] no-underline transition-colors hover:bg-[#eef5f5] hover:text-brand lg:h-9 lg:w-9";

export const HEADER_ICON_BUTTON =
    "inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-[#4d5563] transition-colors hover:bg-[#eef5f5] hover:text-brand lg:h-9 lg:w-9";

export function HeaderProfileSlot({ children }: { children: ReactNode }) {
    return <span className="inline-flex shrink-0 items-center">{children}</span>;
}

export type HeaderGlobalSearchFieldProps = {
    /** Widen the pill to the row (e.g. desktop discover / standard center slot). */
    fullWidth?: boolean;
    placeholder?: string;
    ariaLabel?: string;
    /** `name` on the search input (distinct per role if needed). */
    inputName?: string;
};

/**
 * App-wide search field (dashboard shells). Swap implementation here to change behavior everywhere.
 */
export function HeaderGlobalSearchField({
    fullWidth = false,
    placeholder = "Search…",
    ariaLabel = "Search app",
    inputName = "app-search",
}: HeaderGlobalSearchFieldProps = {}) {
    return (
        <label
            className={
                "relative box-border flex h-[42px] min-h-[42px] w-full min-w-0 cursor-text items-center rounded-full border border-line bg-white py-0 pl-[38px] pr-3 " +
                (fullWidth ? "max-w-none" : "max-w-[420px] flex-1")
            }
        >
            <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b96a8]"
                aria-hidden
            />
            <input
                type="search"
                name={inputName}
                className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[0.9rem] leading-snug outline-none"
                placeholder={placeholder}
                aria-label={ariaLabel}
            />
        </label>
    );
}

export type HeaderGlobalActionsProps = {
    profileSlot: ReactNode;
    showNotifications?: boolean;
    showSettings?: boolean;
    /** When false, profile avatar is omitted (e.g. Care Plan: title + page actions only). Default true. */
    showProfile?: boolean;
};

export function HeaderGlobalActions({
    profileSlot,
    showNotifications = true,
    showSettings = true,
    showProfile = true,
}: HeaderGlobalActionsProps) {
    if (!showNotifications && !showSettings && !showProfile) {
        return null;
    }
    return (
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {showNotifications ? (
                <button type="button" className={HEADER_ICON_BUTTON} aria-label="Notifications">
                    <Bell size={18} strokeWidth={2} aria-hidden />
                </button>
            ) : null}
            {showSettings ? (
                <Link href={`${MOTHER_APP_BASE}/profile`} className={HEADER_ICON_LINK} aria-label="Settings">
                    <Settings size={18} strokeWidth={2} aria-hidden />
                </Link>
            ) : null}
            {showProfile ? <HeaderProfileSlot>{profileSlot}</HeaderProfileSlot> : null}
        </div>
    );
}

export type DashboardMobileSearchBellClusterProps = {
    /** When set, wraps full **standard** mobile row with this on the left (e.g. back + title, or title only). */
    leadingContent?: ReactNode;
    beforeSearch?: ReactNode;
    showSearch?: boolean;
    showNotifications?: boolean;
    profileSlot?: ReactNode;
    showProfile?: boolean;
    searchPlaceholder?: string;
    searchAriaLabel?: string;
};

/**
 * Mobile: expand **search** icon + pill overlay, **notification** bell, optional **`profileSlot`**,
 * optional **`beforeSearch`** page actions. With **`leadingContent`**, renders the full title row (mother / rich role headers).
 */
export function DashboardMobileSearchBellCluster({
    leadingContent,
    beforeSearch,
    showSearch = true,
    showNotifications = true,
    profileSlot,
    showProfile = true,
    searchPlaceholder = "Search…",
    searchAriaLabel = "Search app",
}: DashboardMobileSearchBellClusterProps) {
    const pathname = usePathname();
    const [expanded, setExpanded] = useState(false);
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        queueMicrotask(() => setExpanded(false));
    }, [pathname]);

    const openSearch = () => {
        setExpanded(true);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const showAvatar = showProfile !== false && profileSlot != null;

    if (!leadingContent && !showSearch && !showNotifications && beforeSearch == null && !showAvatar) {
        return null;
    }

    const dimActions = showSearch && expanded;

    const overlayAndButtons = (
        <>
            {showSearch ? (
                <label
                    className={
                        HEADER_MOBILE_HEALTH_LOGS_MATCH_SEARCH_LABEL_BASE_CLASSNAME +
                        (expanded
                            ? ` ${HEADER_MOBILE_HEALTH_LOGS_MATCH_SEARCH_LABEL_EXPANDED_CLASSNAME}`
                            : " max-lg:hidden")
                    }
                    onClick={() => {
                        if (!expanded) openSearch();
                    }}
                >
                    <Search
                        size={18}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b96a8]"
                        aria-hidden
                    />
                    <input
                        ref={inputRef}
                        type="search"
                        className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[0.9rem] leading-snug outline-none"
                        placeholder={searchPlaceholder}
                        aria-label={searchAriaLabel}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setExpanded(true)}
                        onBlur={() => {
                            if (!query.trim()) setExpanded(false);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") {
                                setExpanded(false);
                                inputRef.current?.blur();
                            }
                        }}
                    />
                </label>
            ) : null}

            <div
                className={
                    "flex shrink-0 items-center gap-2 self-center " +
                    (dimActions ? "max-lg:invisible max-lg:pointer-events-none" : "")
                }
            >
                {beforeSearch}
                {showSearch ? (
                    <button
                        type="button"
                        className={`${HEADER_ICON_BUTTON} ${expanded ? "bg-[#eaf6f5] text-brand" : ""}`}
                        onClick={() => {
                            if (expanded && !query.trim()) {
                                setExpanded(false);
                                return;
                            }
                            openSearch();
                        }}
                        aria-label={expanded ? "Collapse search" : "Expand search"}
                        aria-pressed={expanded}
                    >
                        <Search size={18} aria-hidden />
                    </button>
                ) : null}
                {showNotifications ? (
                    <button type="button" className={HEADER_ICON_BUTTON} aria-label="Notifications">
                        <Bell size={18} strokeWidth={2} aria-hidden />
                    </button>
                ) : null}
                {showAvatar ? <HeaderProfileSlot>{profileSlot}</HeaderProfileSlot> : null}
            </div>
        </>
    );

    if (leadingContent) {
        return (
            <div className="relative mx-auto max-w-[1200px] shrink-0">
                <div className={HEADER_MOBILE_HEALTH_LOGS_MATCH_ROW_CLASSNAME}>
                    <div
                        className={
                            "flex min-w-0 flex-1 items-center gap-2 transition-opacity " +
                            (showSearch && expanded ? "opacity-0" : "")
                        }
                    >
                        {leadingContent}
                    </div>
                    {overlayAndButtons}
                </div>
            </div>
        );
    }

    return overlayAndButtons;
}

export type HeaderBarShell = "none" | "page";

export type HeaderBarProps = {
    shell: HeaderBarShell;
    denseMobile?: boolean;
    rowClassName?: string;
    leadingClassName?: string;
    centerClassName?: string;
    leading?: ReactNode;
    center?: ReactNode;
    trailing?: ReactNode;
    footer?: ReactNode;
};

/**
 * Single layout primitive for dashboard header rows: `leading` | `center` | `trailing`.
 * All role-specific pages compose this — change spacing/behavior here once.
 */
export function HeaderBar({
    shell,
    denseMobile = false,
    rowClassName = "",
    leadingClassName = "flex min-w-0 flex-1 items-center gap-2",
    centerClassName = "flex min-w-0 flex-1 items-center justify-start gap-2",
    leading,
    center,
    trailing,
    footer,
}: HeaderBarProps) {
    const row = (
        <div
            className={
                "flex w-full min-w-0 items-center gap-2 " +
                (denseMobile ? "min-h-[52px] py-0 sm:min-h-[56px]" : "min-h-14 py-2") +
                (rowClassName ? ` ${rowClassName}` : "")
            }
        >
            {leading != null ? (
                <div className={leadingClassName}>{leading}</div>
            ) : null}
            {center != null ? <div className={centerClassName}>{center}</div> : null}
            {trailing != null ? (
                <div className="ml-auto flex shrink-0 items-center gap-2">{trailing}</div>
            ) : null}
        </div>
    );

    const body = (
        <>
            {row}
            {footer}
        </>
    );

    if (shell === "page") {
        /** Sticky + border live on outer `<Header>` (mother shell); this is in-flow padding only. */
        return (
            <div className="mx-auto w-full max-w-[1200px] px-4 lg:px-7">{body}</div>
        );
    }

    return <>{body}</>;
}

type HeaderTone = "mother" | "default";

function HeaderSurround({
    tone,
    children,
}: {
    tone: HeaderTone;
    children: ReactNode;
}) {
    const toneClass =
        tone === "mother"
            ? "border-b border-[#dbe4e6] bg-[#f4f8f8]/95 backdrop-blur supports-[backdrop-filter]:bg-[#f4f8f8]/90"
            : "border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85";
    return (
        <header className={`sticky top-0 z-30 shrink-0 ${toneClass}`}>
            <div className="w-full">{children}</div>
        </header>
    );
}

type HeaderSlotProps = {
    tone?: HeaderTone;
    children: ReactNode;
    title?: never;
    profileSlot?: never;
    desktopTrailing?: never;
    searchPlaceholder?: never;
    searchAriaLabel?: never;
    searchInputName?: never;
    showSearch?: never;
    showNotifications?: never;
    mobileBeforeSearch?: never;
};

/** Caregiver / professional top bar: mobile search cluster + desktop search + trailing actions. */
export type HeaderDashboardProps = {
    tone?: "default";
    title: string;
    profileSlot: ReactNode;
    desktopTrailing?: ReactNode;
    searchPlaceholder?: string;
    searchAriaLabel?: string;
    searchInputName?: string;
    showSearch?: boolean;
    showNotifications?: boolean;
    mobileBeforeSearch?: ReactNode;
    children?: never;
};

export type HeaderProps = HeaderSlotProps | HeaderDashboardProps;

function isSlotHeader(props: HeaderProps): props is HeaderSlotProps {
    return "children" in props && props.children != null;
}

/**
 * App header: **slot** mode (`children`, mother) or **dashboard** mode (`title` + `profileSlot`, caregiver / professional).
 */
export function Header(props: HeaderProps) {
    if (isSlotHeader(props)) {
        return (
            <HeaderSurround tone={props.tone ?? "mother"}>
                {props.children}
            </HeaderSurround>
        );
    }

    const {
        title,
        profileSlot,
        desktopTrailing,
        searchPlaceholder,
        searchAriaLabel,
        searchInputName,
        showSearch = true,
        showNotifications = true,
        mobileBeforeSearch,
    } = props as HeaderDashboardProps;

    return (
        <HeaderSurround tone="default">
            <div className="lg:hidden">
                <DashboardMobileSearchBellCluster
                    leadingContent={
                        <div className="min-w-0 flex-1">
                            <h1 className="m-0 truncate text-[1.05rem] font-extrabold leading-tight tracking-tight text-ink sm:text-[1.2rem]">
                                {title}
                            </h1>
                        </div>
                    }
                    beforeSearch={mobileBeforeSearch}
                    profileSlot={profileSlot}
                    showSearch={showSearch !== false}
                    showNotifications={showNotifications !== false}
                    searchPlaceholder={searchPlaceholder}
                    searchAriaLabel={searchAriaLabel}
                />
            </div>
            <div className="mx-auto hidden w-full max-w-[1200px] px-4 lg:block lg:px-7">
                <HeaderBar
                    shell="none"
                    denseMobile={false}
                    rowClassName="lg:min-h-14 lg:gap-3 lg:py-3"
                    leading={<span className="sr-only">{title}</span>}
                    leadingClassName="flex shrink-0"
                    center={
                        showSearch !== false ? (
                            <HeaderGlobalSearchField
                                placeholder={searchPlaceholder}
                                ariaLabel={searchAriaLabel}
                                inputName={searchInputName}
                            />
                        ) : undefined
                    }
                    centerClassName="flex min-w-0 flex-1 items-center justify-start gap-2"
                    trailing={
                        desktopTrailing ? (
                            <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">{desktopTrailing}</div>
                        ) : null
                    }
                />
            </div>
        </HeaderSurround>
    );
}
