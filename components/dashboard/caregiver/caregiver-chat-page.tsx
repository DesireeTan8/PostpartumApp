"use client";

import { useEffect, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { fetchLinkedMothers, postpartumDayLabel, type LinkedMother } from "@/lib/caregiver/linked-mothers";
import { supabase } from "@/lib/supabase/client";
import { CaregiverNoLinkedMothersPanel } from "@/components/dashboard/caregiver/caregiver-no-linked-mothers-panel";

type Msg = { id: string; role: "user" | "ai"; text: string; at: string };

const chips = ["Check BP protocol", "Fever guidelines", "Lactation support", "Nutrition tips"];

export function CaregiverChatPage() {
    const [hasMothers, setHasMothers] = useState<boolean | null>(null);
    const [selected, setSelected] = useState<LinkedMother | null>(null);
    const [input, setInput] = useState("");
    const [thinking, setThinking] = useState(false);
    const [showAlert, setShowAlert] = useState(true);
    const [messages, setMessages] = useState<Msg[]>([
        {
            id: "1",
            role: "ai",
            text: "Hi — I’m CareNest. Ask me about postpartum care protocols, warning signs, or documentation tips.",
            at: new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
        },
    ]);
    useEffect(() => {
        void (async () => {
            const { mothers: ms } = await fetchLinkedMothers(supabase);
            setHasMothers(ms.length > 0);
            setSelected(ms[0] ?? null);
        })();
    }, []);

    const send = (text?: string) => {
        const t = (text ?? input).trim();
        if (!t) return;
        const serious = /\b(dizzy|faint|bleeding heavily|sharp pain|suicid)\b/i.test(t);
        if (serious) setShowAlert(true);
        const userMsg: Msg = {
            id: crypto.randomUUID(),
            role: "user",
            text: t,
            at: new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
        };
        setMessages((m) => [...m, userMsg]);
        setInput("");
        setThinking(true);
        setTimeout(() => {
            setThinking(false);
            const reply = serious
                ? "Those symptoms can be urgent. I’m not a substitute for a clinician — please encourage her to contact her OB or emergency services if symptoms are severe or worsening."
                : "Here’s a concise checklist: monitor rest, hydration, mood changes, and incision or bleeding patterns. Document objective findings in a care note for the clinical team.";
            setMessages((m) => [
                ...m,
                {
                    id: crypto.randomUUID(),
                    role: "ai",
                    text: reply,
                    at: new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
                },
            ]);
        }, 900);
    };

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 lg:px-8">
            <div className="flex min-h-[520px] flex-col rounded-2xl border border-line bg-white shadow-sm">
                {showAlert ? (
                    <div className="rounded-t-2xl border-b border-[#fecdd3] bg-[#fff1f2] px-4 py-3">
                        <p className="m-0 text-sm font-extrabold text-[#9f1239]">Serious symptoms detected</p>
                        <p className="m-0 mt-1 text-xs text-[#881337]">
                            If you typed dizziness, sharp pain, or similar red flags, prioritize in-person or emergency evaluation. This assistant provides education only.
                        </p>
                    </div>
                ) : null}
                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    {messages.map((m) =>
                        m.role === "ai" ? (
                            <div key={m.id} className="flex gap-2">
                                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f3f4f6] text-lg" aria-hidden>
                                    🤖
                                </span>
                                <div>
                                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#f8fafc] px-4 py-2.5 text-sm text-ink shadow-sm">
                                        {m.text}
                                    </div>
                                    <p className="m-0 mt-1 text-[0.65rem] text-muted">{m.at}</p>
                                </div>
                            </div>
                        ) : (
                            <div key={m.id} className="flex justify-end">
                                <div>
                                    <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand px-4 py-2.5 text-sm text-white shadow-sm">
                                        {m.text}
                                    </div>
                                    <p className="m-0 mt-1 text-right text-[0.65rem] text-muted">{m.at}</p>
                                </div>
                            </div>
                        )
                    )}
                    {thinking ? (
                        <p className="text-sm italic text-muted">CareNest is thinking…</p>
                    ) : null}
                </div>
                <div className="border-t border-line p-3">
                    <div className="mb-2 flex flex-wrap gap-2">
                        {chips.map((c) => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => send(c)}
                                className="inline-flex items-center gap-1 rounded-full border border-line bg-[#f8fafc] px-3 py-1.5 text-[0.7rem] font-bold text-ink"
                            >
                                <Sparkles className="size-3 text-brand" />
                                {c}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            className="min-h-11 flex-1 rounded-full border border-line px-4 text-sm outline-none focus:ring-2 focus:ring-brand/40"
                            placeholder="Ask about care protocols…"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && send()}
                        />
                        <button
                            type="button"
                            onClick={() => send()}
                            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white shadow-md"
                            aria-label="Send"
                        >
                            <Send className="size-5" />
                        </button>
                    </div>
                </div>
            </div>

            <aside className="mt-6 space-y-4 lg:mt-0">
                {hasMothers === false ? (
                    <CaregiverNoLinkedMothersPanel
                        layout="compact"
                        hint="Chat works now; link a mother to see her snapshot and contact details beside the conversation."
                        className="text-left"
                    />
                ) : null}
                {selected ? (
                    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            {selected.avatarUrl ? (
                                <img src={selected.avatarUrl} alt="" className="size-14 rounded-full object-cover" />
                            ) : (
                                <span className="grid size-14 place-items-center rounded-full bg-brand/15 text-lg font-extrabold text-brand">
                                    {selected.displayName[0]}
                                </span>
                            )}
                            <div>
                                <p className="m-0 font-extrabold text-ink">{selected.displayName}</p>
                                <p className="m-0 text-xs text-muted">Linked for care context</p>
                            </div>
                        </div>
                        {postpartumDayLabel(selected.deliveryDate) ? (
                            <p className="mt-3 inline-block rounded-full bg-brand/15 px-2.5 py-1 text-[0.65rem] font-extrabold text-brand">
                                {postpartumDayLabel(selected.deliveryDate)}
                            </p>
                        ) : null}
                        <div className="mt-4 space-y-2 text-sm">
                            <p className="m-0 text-muted">
                                <span className="font-bold text-ink">Contact: </span>
                                {selected.phone ?? "—"}
                            </p>
                        </div>
                    </div>
                ) : null}
                <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                    <p className="m-0 text-xs font-extrabold uppercase text-muted">Recent notes</p>
                    <p className="mt-2 text-sm text-muted">Open the Notes tab to review the latest chart entries for this mother.</p>
                </div>
                <div className="flex flex-col gap-2">
                    <button type="button" className="h-11 rounded-xl bg-brand text-sm font-bold text-white shadow-sm">
                        Request clinician follow-up
                    </button>
                    <button type="button" className="h-11 rounded-xl border border-[#fecaca] bg-[#fff1f2] text-sm font-bold text-[#be123c]">
                        Escalate issue
                    </button>
                </div>
            </aside>
        </div>
    );
}
