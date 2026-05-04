"use client";

import { useEffect, useState } from "react";
import { Clock3, Plus, Search, SlidersHorizontal } from "lucide-react";
import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";
import { useMotherPageHeader } from "@/components/layout/mother-dashboard-shell";

function MotherAiChatContent() {
    const { setPageHeader } = useMotherPageHeader();
    const [query, setQuery] = useState("");
    const [tab, setTab] = useState<"all" | "active" | "archived">("all");

    useEffect(() => {
        setPageHeader({
            title: "Support Chats",
            layout: "standard",
            showSettings: false,
        });
        return () => setPageHeader(null);
    }, [setPageHeader]);

    return (
        <div className="mx-auto w-full max-w-[520px] pb-24">
            <div className="mb-3 rounded-xl bg-[#f5f7f8] px-3 py-2.5">
                <div className="flex items-center gap-2 text-[#8a93a3]">
                    <Search size={16} />
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full border-0 bg-transparent text-[0.95rem] font-semibold text-[#4f5b6d] outline-none placeholder:text-[#8a93a3]"
                        placeholder="Search conversations..."
                    />
                </div>
            </div>

            <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 rounded-xl bg-[#f3f5f7] p-1">
                    {([
                        ["all", "All"],
                        ["active", "Active"],
                        ["archived", "Archived"],
                    ] as const).map(([id, label]) => {
                        const selected = tab === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setTab(id)}
                                className={`h-8 rounded-lg px-3 text-[0.76rem] font-bold ${selected ? "bg-brand text-white" : "text-[#6a7587]"}`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
                <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#d8e1e4] bg-white px-3 py-1.5 text-[0.8rem] font-bold text-[#5f6c7e]"
                >
                    <SlidersHorizontal size={13} />
                    Sort
                </button>
            </div>

            <p className="mb-3 mt-0 text-[0.72rem] font-extrabold uppercase tracking-wide text-[#7e899a]">Recent conversations</p>

            <section className="rounded-2xl border border-[#e5eaee] bg-white px-4 py-8 text-center shadow-[0_2px_10px_rgba(35,55,65,0.04)]">
                <p className="m-0 text-[1.05rem] font-bold text-[#3e4a5d]">No chat sessions yet</p>
                <p className="mb-0 mt-1 text-[0.88rem] leading-relaxed text-[#768396]">
                    Conversations will appear here once you start messaging your care team.
                </p>
            </section>

            <section className="mt-6 rounded-2xl border border-dashed border-[#dbe3e7] bg-[#f7f9fa] px-4 py-7 text-center">
                <span className="mx-auto mb-2.5 grid size-11 place-items-center rounded-full bg-[#eef2f4] text-[#7f8b9e]">
                    <Clock3 size={20} />
                </span>
                <p className="m-0 text-[1.2rem] font-bold text-[#3e4a5d]">Looking for an older session?</p>
                <p className="mb-0 mt-1 text-[0.85rem] leading-relaxed text-[#768396]">
                    Conversations are automatically archived after 30 days of inactivity.
                </p>
            </section>

            <button
                type="button"
                className="fixed bottom-[calc(88px+env(safe-area-inset-bottom,0))] right-5 z-[35] inline-flex h-14 items-center gap-2 rounded-full border-0 bg-brand px-6 text-[1.05rem] font-extrabold text-white shadow-[0_8px_24px_rgba(46,125,120,0.35)] lg:bottom-8"
            >
                <Plus size={20} />
                New Chat
            </button>
        </div>
    );
}

export default function MotherAiChatPage() {
    return (
        <MotherDashboardShell showMobileAppHeader={false}>
            <MotherAiChatContent />
        </MotherDashboardShell>
    );
}
