"use client";

import Link from "next/link";
import { HeartHandshake } from "lucide-react";

const defaultHint =
    "When someone adds you to her care team or you set a supported mother in your profile, this section will fill in with real data.";

type CaregiverNoLinkedMothersPanelProps = {
    /** `compact` fits inside dashboard strips; `full` is for dedicated empty pages. */
    layout?: "full" | "compact";
    /** Extra context for this screen (shown instead of default copy). */
    hint?: string;
    className?: string;
    /** Show a third CTA to the patients list (default true for full, false for compact). */
    showPatientsLink?: boolean;
    /** Show link back to caregiver home (default true). */
    showDashboardLink?: boolean;
};

export function CaregiverNoLinkedMothersPanel({
    layout = "full",
    hint,
    className = "",
    showPatientsLink,
    showDashboardLink = true,
}: CaregiverNoLinkedMothersPanelProps) {
    const compact = layout === "compact";
    const patients = showPatientsLink ?? !compact;

    return (
        <div
            className={
                "rounded-2xl border border-dashed border-line bg-white text-center shadow-sm " +
                (compact ? "px-4 py-7 " : "mx-auto max-w-lg px-6 py-10 ") +
                className
            }
            role="status"
            aria-label="No linked mothers"
        >
            <span
                className={
                    "mx-auto grid place-items-center rounded-2xl bg-brand/12 text-brand " +
                    (compact ? "mb-3 size-11" : "mb-5 size-14")
                }
            >
                <HeartHandshake className={compact ? "size-5" : "size-7"} strokeWidth={2} aria-hidden />
            </span>
            <h2 className={"m-0 font-extrabold text-ink " + (compact ? "text-[0.95rem]" : "text-lg")}>No linked mothers yet</h2>
            <p className={"mx-auto mt-2 max-w-md leading-relaxed text-muted " + (compact ? "text-xs" : "text-sm")}>
                {hint ?? defaultHint}
            </p>
            <div className={"flex flex-wrap justify-center gap-2 " + (compact ? "mt-4" : "mt-6")}>
                <Link
                    href="/dashboard/caregiver/profile"
                    className={
                        "inline-flex items-center justify-center rounded-xl bg-brand font-bold text-white no-underline " +
                        (compact ? "h-9 px-4 text-xs" : "h-11 px-5 text-sm")
                    }
                >
                    Open profile
                </Link>
                {showDashboardLink ? (
                    <Link
                        href="/dashboard/caregiver"
                        className={
                            "inline-flex items-center justify-center rounded-xl border border-line bg-[#f8fafc] font-bold text-ink no-underline " +
                            (compact ? "h-9 px-4 text-xs" : "h-11 px-5 text-sm")
                        }
                    >
                        Dashboard
                    </Link>
                ) : null}
                {patients ? (
                    <Link
                        href="/dashboard/caregiver/patients"
                        className={
                            "inline-flex items-center justify-center rounded-xl border border-line bg-white font-bold text-muted no-underline " +
                            (compact ? "h-9 px-4 text-xs" : "h-11 px-5 text-sm")
                        }
                    >
                        Patients
                    </Link>
                ) : null}
            </div>
        </div>
    );
}
