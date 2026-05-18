"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
    createContext,
    useContext,
    useMemo,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from "react";
import {
    HEADER_MOBILE_HEALTH_LOGS_MATCH_ROW_CLASSNAME,
    HeaderBar,
    HeaderGlobalActions,
    HeaderGlobalSearchField,
    HeaderProfileSlot,
    DashboardMobileSearchBellCluster,
    HEADER_ICON_BUTTON,
    HEADER_ICON_LINK,
    MOTHER_APP_BASE,
} from "@/components/layout/Header";

const base = MOTHER_APP_BASE;

// --- Context: per-route header config for `MotherDashboardShell` -----------------------------

export type MotherPageHeaderLayout = "standard" | "detail";

export type MotherPageHeaderConfig = {
    title: string;
    subtitle?: string;
    backHref?: string;
    backAction?: () => void;
    backLabel?: string;
    layout?: MotherPageHeaderLayout;
    trailing?: ReactNode;
    showNotifications?: boolean;
    showSettings?: boolean;
    showProfile?: boolean;
    showSearch?: boolean;
    render?: () => ReactNode;
};

export type MotherPageHeaderContextValue = {
    pageHeader: MotherPageHeaderConfig | null;
    setPageHeader: Dispatch<SetStateAction<MotherPageHeaderConfig | null>>;
    profileSlot: ReactNode;
    showMobileBrandWhenEmpty: boolean;
};

const MotherPageHeaderContext = createContext<MotherPageHeaderContextValue | null>(null);

export function MotherPageHeaderProvider({
    children,
    profileSlot,
    showMobileBrandWhenEmpty,
}: {
    children: ReactNode;
    profileSlot: ReactNode;
    showMobileBrandWhenEmpty: boolean;
}) {
    const [pageHeader, setPageHeader] = useState<MotherPageHeaderConfig | null>(null);
    const value = useMemo(
        () => ({
            pageHeader,
            setPageHeader,
            profileSlot,
            showMobileBrandWhenEmpty,
        }),
        [pageHeader, profileSlot, showMobileBrandWhenEmpty],
    );
    return <MotherPageHeaderContext.Provider value={value}>{children}</MotherPageHeaderContext.Provider>;
}

export function useMotherPageHeader(): MotherPageHeaderContextValue {
    const ctx = useContext(MotherPageHeaderContext);
    if (!ctx) {
        throw new Error("useMotherPageHeader must be used within MotherDashboardShell");
    }
    return ctx;
}

// --- Chrome: default / standard / detail header rows ------------------------------------------

type DefaultDiscoverChromeProps = {
    showMobileBrand: boolean;
    profileSlot: ReactNode;
    showNotifications?: boolean;
    showSettings?: boolean;
    showProfile?: boolean;
    showSearch?: boolean;
};

export function MotherDefaultDiscoverChrome({
    showMobileBrand,
    profileSlot,
    showNotifications = true,
    showSettings = true,
    showProfile = true,
    showSearch = true,
}: DefaultDiscoverChromeProps) {
    const actions = (
        <HeaderGlobalActions
            profileSlot={profileSlot}
            showNotifications={showNotifications}
            showSettings={showSettings}
            showProfile={showProfile}
        />
    );

    return (
        <div className="mx-auto max-w-[1200px]">
            <div className="lg:hidden">
                <div className="relative mx-auto max-w-[1200px] shrink-0">
                    <div className={HEADER_MOBILE_HEALTH_LOGS_MATCH_ROW_CLASSNAME}>
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            {showMobileBrand ? (
                                <Link
                                    href={base}
                                    className="flex min-h-0 min-w-0 flex-1 items-center gap-2 self-center text-[0.95rem] font-extrabold leading-none text-ink no-underline"
                                >
                                    <span
                                        className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#6ec9c6] to-brand text-[1.1rem] text-white"
                                        aria-hidden
                                    >
                                        {"\u2661"}
                                    </span>
                                    <span className="line-clamp-1 min-w-0 leading-tight">Postpartum Pathways</span>
                                </Link>
                            ) : (
                                <span className="w-8 shrink-0" />
                            )}
                        </div>
                        <DashboardMobileSearchBellCluster
                            showSearch={showSearch !== false}
                            showNotifications={showNotifications !== false}
                            profileSlot={profileSlot}
                            showProfile={showProfile !== false}
                        />
                    </div>
                </div>
            </div>
            <div className="hidden lg:block">
                <HeaderBar
                    shell="none"
                    denseMobile={false}
                    rowClassName="px-4 lg:min-h-14 lg:gap-3 lg:px-7 lg:py-3"
                    leading={showSearch ? <HeaderGlobalSearchField /> : undefined}
                    leadingClassName="flex min-w-0 flex-1 items-center justify-start gap-3"
                    trailing={actions}
                />
            </div>
        </div>
    );
}

type StandardPageChromeProps = {
    config: MotherPageHeaderConfig;
    profileSlot: ReactNode;
};

export function MotherStandardPageChrome({ config, profileSlot }: StandardPageChromeProps) {
    const {
        title,
        subtitle,
        backHref,
        backAction,
        backLabel,
        trailing,
        showNotifications,
        showSettings,
        showProfile,
        showSearch,
    } = config;

    const backControl = backAction ? (
        <button type="button" className={HEADER_ICON_BUTTON} aria-label={backLabel ?? "Back"} onClick={backAction}>
            <ArrowLeft size={18} aria-hidden />
        </button>
    ) : backHref ? (
        <Link href={backHref} className={HEADER_ICON_LINK} aria-label={backLabel ?? "Back"}>
            <ArrowLeft size={18} aria-hidden />
        </Link>
    ) : null;

    const desktopTrailing = (
        <>
            {trailing}
            <HeaderGlobalActions
                profileSlot={profileSlot}
                showNotifications={showNotifications}
                showSettings={showSettings !== false}
                showProfile={showProfile !== false}
            />
        </>
    );

    return (
        <>
            <div className="lg:hidden">
                <DashboardMobileSearchBellCluster
                    leadingContent={
                        <>
                            {backControl}
                            <div className="min-w-0 flex-1">
                                <h1 className="m-0 truncate text-[1.05rem] font-extrabold leading-tight tracking-tight text-ink sm:text-[1.2rem]">
                                    {title}
                                </h1>
                            </div>
                        </>
                    }
                    beforeSearch={trailing}
                    showSearch={showSearch !== false}
                    showNotifications={showNotifications !== false}
                    profileSlot={profileSlot}
                    showProfile={showProfile !== false}
                />
            </div>
            <div className="mx-auto hidden w-full max-w-[1200px] px-4 lg:block lg:px-7">
                <HeaderBar
                    shell="none"
                    denseMobile={false}
                    rowClassName="lg:min-h-14 lg:gap-3 lg:py-3"
                    leading={
                        <>
                            {backControl}
                            <span className="sr-only">{title}</span>
                        </>
                    }
                    leadingClassName="flex shrink-0 items-center gap-2"
                    center={showSearch !== false ? <HeaderGlobalSearchField /> : undefined}
                    trailing={desktopTrailing}
                    footer={
                        subtitle ? (
                            <p className="mb-0 mt-1 max-w-full truncate text-[0.8rem] text-muted">{subtitle}</p>
                        ) : null
                    }
                />
            </div>
        </>
    );
}

type DetailPageChromeProps = {
    config: MotherPageHeaderConfig;
    profileSlot: ReactNode;
};

export function MotherDetailPageChrome({ config, profileSlot }: DetailPageChromeProps) {
    const { title, subtitle, backHref, backAction, backLabel, trailing, showSearch, showNotifications, showProfile } =
        config;

    const backControl = backAction ? (
        <button type="button" className={HEADER_ICON_BUTTON} aria-label={backLabel ?? "Back"} onClick={backAction}>
            <ArrowLeft size={18} aria-hidden />
        </button>
    ) : backHref ? (
        <Link href={backHref} className={HEADER_ICON_LINK} aria-label={backLabel ?? "Back"}>
            <ArrowLeft size={18} aria-hidden />
        </Link>
    ) : (
        <span className="inline-flex h-10 w-10 shrink-0 lg:h-9 lg:w-9" aria-hidden />
    );

    const mobileDetailTrailing = (
        <>
            {trailing}
            <DashboardMobileSearchBellCluster
                showSearch={showSearch !== false}
                showNotifications={showNotifications !== false}
                profileSlot={profileSlot}
                showProfile={showProfile !== false}
            />
        </>
    );

    const desktopDetailTrailing = (
        <>
            {trailing}
            <HeaderProfileSlot>{profileSlot}</HeaderProfileSlot>
        </>
    );

    return (
        <>
            <div className="lg:hidden">
                <div className="relative mx-auto max-w-[1200px] shrink-0">
                    <div className={HEADER_MOBILE_HEALTH_LOGS_MATCH_ROW_CLASSNAME}>
                        <div className="flex shrink-0 items-center">{backControl}</div>
                        <div className="m-0 min-w-0 flex-1 text-center">
                            <h1 className="m-0 truncate text-[1.05rem] font-extrabold leading-tight tracking-tight text-ink sm:text-[1.2rem]">
                                {title}
                            </h1>
                            {subtitle ? (
                                <p className="mb-0 mt-0.5 hidden truncate text-[0.78rem] text-muted lg:block">{subtitle}</p>
                            ) : null}
                        </div>
                        {mobileDetailTrailing}
                    </div>
                </div>
            </div>
            <div className="mx-auto hidden w-full max-w-[1200px] px-4 lg:block lg:px-7">
                <HeaderBar
                    shell="none"
                    denseMobile={false}
                    rowClassName="relative lg:min-h-14 lg:gap-3 lg:py-3 lg:justify-between"
                    leadingClassName="flex shrink-0 items-center"
                    leading={
                        <>
                            {backControl}
                            <span className="sr-only">{title}</span>
                        </>
                    }
                    trailing={desktopDetailTrailing}
                />
            </div>
        </>
    );
}

export function motherFallbackPageTitle(pathname: string): string | null {
    const p = pathname.replace(/\/$/, "") || "/";
    if (p === base || p === `${base}/`) return "Home";
    if (p === `${base}/logs`) return "Health logs";
    if (p === `${base}/logs/new`) return "New log";
    if (p.startsWith(`${base}/logs/`)) {
        const rest = p.slice(`${base}/logs/`.length);
        if (rest && !rest.includes("/") && rest !== "new") return "Log details";
    }
    if (p === `${base}/care`) return "Care plan";
    if (p === `${base}/care/new`) return "Reminder";
    if (p.startsWith(`${base}/care/reminders/`)) return "Reminder info";
    if (p === `${base}/profile`) return "Profile";
    if (p === `${base}/schedule`) return "Schedule";
    if (p === `${base}/ai-chat`) return "AI chat";
    if (p === `${base}/network`) return "Network";
    return null;
}
