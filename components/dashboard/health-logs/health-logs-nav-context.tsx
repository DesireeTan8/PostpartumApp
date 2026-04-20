"use client";

import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

export type HealthLogsNavContextValue = {
    search: string;
    setSearch: Dispatch<SetStateAction<string>>;
    showFilters: boolean;
    setShowFilters: Dispatch<SetStateAction<boolean>>;
};

const HealthLogsNavContext = createContext<HealthLogsNavContextValue | null>(null);

export function HealthLogsNavProvider({ children }: { children: ReactNode }) {
    const [search, setSearch] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const value = useMemo(
        () => ({ search, setSearch, showFilters, setShowFilters }),
        [search, showFilters],
    );
    return <HealthLogsNavContext.Provider value={value}>{children}</HealthLogsNavContext.Provider>;
}

export function useHealthLogsNavOptional() {
    return useContext(HealthLogsNavContext);
}

export function useHealthLogsNav() {
    const ctx = useContext(HealthLogsNavContext);
    if (!ctx) {
        throw new Error("useHealthLogsNav must be used within HealthLogsNavProvider");
    }
    return ctx;
}
