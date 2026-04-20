"use client";

import {
    Activity,
    CalendarDays,
    Droplets,
    MoreHorizontal,
    Pill,
    Sparkles,
} from "lucide-react";
import type { CareReminderCategory } from "@/lib/care-reminders";

const types: { id: CareReminderCategory; label: string; Icon: typeof Pill }[] = [
    { id: "medication", label: "Medications", Icon: Pill },
    { id: "hydration", label: "Hydration", Icon: Droplets },
    { id: "movement", label: "Movement", Icon: Activity },
    { id: "appointment", label: "Checkups", Icon: CalendarDays },
    { id: "vitamin", label: "Vitamins", Icon: Sparkles },
    { id: "other", label: "Other", Icon: MoreHorizontal },
];

type Props = {
    value: CareReminderCategory;
    onChange: (c: CareReminderCategory) => void;
};

export function MotherReminderTypePicker({ value, onChange }: Props) {
    return (
        <div
            className="-mx-1 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]"
            role="listbox"
            aria-label="Reminder category"
        >
            {types.map(({ id, label, Icon }) => {
                const selected = value === id;
                return (
                    <button
                        key={id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`flex min-w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-xl border-2 px-2.5 py-2.5 text-center transition-colors ${selected
                            ? "border-brand bg-[#eaf6f5] text-[#1f5c59]"
                            : "border-[#e3eaed] bg-white text-[#415063] hover:border-[#c5ddd4]"
                            }`}
                        onClick={() => onChange(id)}
                    >
                        <span
                            className={`grid size-10 place-items-center rounded-full ${selected ? "bg-brand/15 text-brand" : "bg-[#f0f3f5] text-[#5c6a7a]"
                                }`}
                        >
                            <Icon size={20} strokeWidth={2} aria-hidden />
                        </span>
                        <span className="text-[0.65rem] font-bold leading-tight">{label}</span>
                    </button>
                );
            })}
        </div>
    );
}
