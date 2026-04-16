"use client";

import { useEffect } from "react";

export function PwaProvider() {
    useEffect(() => {
        // Service worker intercepts every fetch; disable in dev to avoid slower HMR and loads.
        if (process.env.NODE_ENV !== "production") {
            return;
        }
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
            return;
        }

        navigator.serviceWorker.register("/sw.js").catch(() => { });
    }, []);

    return null;
}