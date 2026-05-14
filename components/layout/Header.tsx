"use client"
import Link from "next/link";
import { Bell, Search, Settings } from "lucide-react";
import type { ReactNode } from "react";

/** Mother app route prefix — used by search placeholder and header actions */
export const MOTHER_APP_BASE = "/dashboard/mother";

/** Shared classes for circular icon-only controls in header rows */
export const HEADER_ICON_LINK =
    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#4d5563] no-underline transition-colors hover:bg-[#eef5f5] hover:text-brand lg:h-9 lg:w-9";

export const HEADER_ICON_BUTTON =
    "inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-[#4d5563] transition-colors hover:bg-[#eef5f5] hover:text-brand lg:h-9 lg:w-9";


export const MOTHER_APP_HEADER_ICON_LINK = HEADER_ICON_LINK;
export const MOTHER_APP_HEADER_ICON_BUTTON = HEADER_ICON_BUTTON;

export function HeaderProfileSlot({ children }: { children: ReactNode }) {
    return <span className="inline-flex shrink-0 items-center">{children}</span>;
}

export const MotherAppHeaderProfileSlot = HeaderProfileSlot;

/**
 * App-wide search field (mother shell). Swap implementation here to change behavior everywhere.
 */
export function HeaderGlobalSearchField() {
    return (
        <label className="relative box-border flex h-[42px] min-h-[42px] w-full min-w-0 max-w-[420px] flex-1 cursor-text items-center rounded-full border border-line bg-white py-0 pl-[38px] pr-3">
            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b96a8]" aria-hidden />
            <input
                type="search"
                name="app-search"
                className="min-w-0 flex-1 border-0 bg-transparent py-2 text-[0.9rem] leading-snug outline-none"
                placeholder="Search…"
                aria-label="Search app"
            />
        </label>
    );
}

export const MotherGlobalSearchField = HeaderGlobalSearchField;

export type HeaderGlobalActionsProps = {
    profileSlot: ReactNode;
    showNotifications?: boolean;
    showSettings?: boolean;
};

export function HeaderGlobalActions({
    profileSlot,
    showNotifications = true,
    showSettings = true,
}: HeaderGlobalActionsProps) {
    return (
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {showNotifications ? (
                <button
                    type="button"
                    className={HEADER_ICON_BUTTON}
                    aria-label="Notifications"
                >
                    <Bell size={18} strokeWidth={2} aria-hidden />
                </button>
            ) : null}
            {showSettings ? (
                <Link
                    href={`${MOTHER_APP_BASE}/profile`}
                    className={HEADER_ICON_LINK}
                    aria-label="Settings"
                >
                    <Settings size={18} strokeWidth={2} aria-hidden />
                </Link>
            ) : null}
            <HeaderProfileSlot>{profileSlot}</HeaderProfileSlot>
        </div>
    );
}

export const MotherAppHeaderGlobalActions = HeaderGlobalActions;

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

export function HeaderBar({
    shell,
    denseMobile = false,
    rowClassName = "",
    leadingClassName = "flex min-w-0 flex-1 items-center gap-2",
    centerClassName = "flex min-w-0 flex-1 items-center justify-center gap-2",
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
                <div className="flex shrink-0 items-center gap-2">{trailing}</div>
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

export const MotherAppHeaderBar = HeaderBar;

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
    mobileStart?: never;
    mobileEnd?: never;
    desktopEnd?: never;
};

type HeaderDashboardProps = {
    tone?: "default";
    title: string;
    mobileStart?: ReactNode;
    mobileEnd?: ReactNode;
    desktopEnd?: ReactNode;
    children?: never;
};

export type HeaderProps = HeaderSlotProps | HeaderDashboardProps;

function isSlotHeader(props: HeaderProps): props is HeaderSlotProps {
    return "children" in props && props.children != null;
}

/**
 * App header: either a **shell** wrapping custom dashboard chrome (`children`, used by mother),
 * or a **simple title bar** for caregiver / professional (`title` + optional ends).
 */
export function Header(props: HeaderProps) {
    if (isSlotHeader(props)) {
        return (
            <HeaderSurround tone={props.tone ?? "mother"}>
                {props.children}
            </HeaderSurround>
        );
    }

    const { title, mobileStart, mobileEnd, desktopEnd } = props;

    return (
        <HeaderSurround tone="default">
            <div className="mx-auto flex w-full max-w-[1200px] min-h-12 items-center gap-2 px-4 py-3 lg:min-h-14 lg:gap-4 lg:px-8">
                {mobileStart ? (
                    <div className="shrink-0 lg:hidden">{mobileStart}</div>
                ) : null}
                <h1 className="m-0 min-w-0 flex-1 truncate text-center text-[1.05rem] font-extrabold tracking-tight text-ink lg:text-left lg:text-lg">
                    {title}
                </h1>
                <div className="flex shrink-0 items-center gap-2">
                    {desktopEnd ? (
                        <div className="hidden items-center gap-2 lg:flex">
                            {desktopEnd}
                        </div>
                    ) : null}
                    {mobileEnd ? (
                        <div className="flex items-center lg:hidden">{mobileEnd}</div>
                    ) : null}
                </div>
            </div>
        </HeaderSurround>
    );
}