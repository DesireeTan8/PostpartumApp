"use client";

import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

export type MotherPageHeaderLayout = "standard" | "detail";

/**
 * Per-page header configuration for `MotherDashboardShell`.
 * Set from any client page via `useMotherPageHeader().setPageHeader` (typically in useEffect).
 */
export type MotherPageHeaderConfig = {
    title: string;
    subtitle?: string;
    /** When set, shows back control */
    backHref?: string;
    backLabel?: string;
    /** `detail` = centered title between back and actions (mobile-first). */
    layout?: MotherPageHeaderLayout;
    /** Extra actions to the right of the title (before the profile avatar on large screens). */
    trailing?: ReactNode;
    /**
     * Default chrome controls (standard / discover layouts only). When `false`, that control is omitted.
     * Custom `render()` manages its own actions.
     */
    showNotifications?: boolean;
    showSettings?: boolean;
    /**
     * Replace the default header inner layout entirely (e.g. health logs search + filters).
     * When provided, `title`, `layout`, `backHref`, and `trailing` are ignored.
     */
    render?: () => ReactNode;
};

export type MotherPageHeaderContextValue = {
    pageHeader: MotherPageHeaderConfig | null;
    setPageHeader: Dispatch<SetStateAction<MotherPageHeaderConfig | null>>;
    /** Profile avatar link — compose into custom `render()` when needed */
    profileSlot: ReactNode;
    /** When no page header is set, show the compact mobile brand row if true */
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
        [pageHeader, profileSlot, showMobileBrandWhenEmpty]
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

/**
 * Call `setPageHeader({ title, ... })` in a page-level `useEffect` and clear on unmount:
 * `return () => setPageHeader(null)` so the next route can define its own bar.
 */
