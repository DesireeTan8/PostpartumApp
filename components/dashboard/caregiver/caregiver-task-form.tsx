"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Link2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { fetchLinkedMothers, type LinkedMother } from "@/lib/caregiver/linked-mothers";
import { CaregiverNoLinkedMothersPanel } from "@/components/dashboard/caregiver/caregiver-no-linked-mothers-panel";

type AppointmentMini = {
  id: string;
  starts_at: string;
  location_type: string;
  location_detail: string | null;
};

const priorities = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

export function CaregiverTaskForm() {
  const router = useRouter();
  const [mothers, setMothers] = useState<LinkedMother[]>([]);
  const [appointments, setAppointments] = useState<AppointmentMini[]>([]);
  const [motherId, setMotherId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("09:00");
  const [priority, setPriority] = useState<string>("normal");
  const [apptId, setApptId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount fetch
    void (async () => {
      const { mothers: ms } = await fetchLinkedMothers(supabase);
      setMothers(ms);
      if (ms[0]) setMotherId(ms[0].motherUserId);
    })();
  }, []);

  const loadAppts = useCallback(async (mid: string) => {
    if (!mid) {
      setAppointments([]);
      return;
    }
    const { data } = await supabase
      .from("appointments")
      .select("id, starts_at, location_type, location_detail")
      .eq("mother_user_id", mid)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(20);
    setAppointments((data ?? []) as AppointmentMini[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reload appointments when mother changes
    void loadAppts(motherId);
    setApptId("");
  }, [motherId, loadAppts]);

  const submit = async () => {
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/auth/sign-in");
      return;
    }
    if (!motherId || !title.trim()) {
      setError("Choose a mother and enter a task title.");
      return;
    }
    let dueAt: string | null = null;
    if (dueDate) {
      dueAt = new Date(`${dueDate}T${dueTime || "09:00"}:00`).toISOString();
    }
    setSaving(true);
    const baseRow: Record<string, unknown> = {
      mother_user_id: motherId,
      title: title.trim(),
      description: description.trim() || null,
      created_by_user_id: user.id,
      assigned_to_user_id: user.id,
      due_at: dueAt,
      category: "other",
      status: "pending",
    };
    const fullRow = { ...baseRow, priority, ...(apptId ? { linked_appointment_id: apptId } : {}) };

    let { data: created, error: insErr } = await supabase.from("care_tasks").insert(fullRow).select("id").single();
    if (insErr) {
      const retry = { ...baseRow };
      const second = await supabase.from("care_tasks").insert(retry).select("id").single();
      created = second.data;
      insErr = second.error;
    }
    setSaving(false);
    if (insErr) {
      setError(insErr.message);
      return;
    }
    if (created?.id) router.replace(`/dashboard/caregiver/tasks/${created.id}`);
    else router.replace("/dashboard/caregiver/tasks");
  };

  if (mothers.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8">
        <h2 className="m-0 text-xl font-extrabold text-ink">Create Task</h2>
        <p className="m-0 mt-1 text-sm text-muted">Assign work and due times for your care routine.</p>
        <CaregiverNoLinkedMothersPanel
          className="mt-8"
          hint="You’ll pick which mother a task belongs to once she’s linked."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-8">
      <Link
        href="/dashboard/caregiver/tasks"
        className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-brand no-underline"
      >
        <ArrowLeft className="size-4" />
        Back to Tasks
      </Link>

      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm lg:p-8">
        <h2 className="m-0 text-xl font-extrabold text-ink">Create Task</h2>
        {error ? (
          <p className="mt-3 rounded-lg border border-[#f5c4c4] bg-[#fff5f5] px-3 py-2 text-sm text-[#a33f58]">{error}</p>
        ) : null}

        <label className="mt-6 block text-sm font-bold text-ink">
          Task title
          <span className="ml-2 rounded-md bg-brand/15 px-1.5 py-0.5 text-[0.65rem] font-extrabold text-brand">Required</span>
          <input
            className="mt-2 w-full rounded-xl border border-line px-4 py-3 text-[0.95rem] outline-none focus:ring-2 focus:ring-brand/40"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Prepare postpartum meal"
          />
        </label>

        <label className="mt-5 block text-sm font-bold text-ink">
          Description &amp; details
          <textarea
            className="mt-2 min-h-[120px] w-full resize-y rounded-xl border border-line px-4 py-3 text-[0.95rem] outline-none focus:ring-2 focus:ring-brand/40"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide specific instructions…"
          />
        </label>

        <p className="mt-8 text-[0.7rem] font-extrabold uppercase tracking-wide text-muted">Schedule</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-ink">
            Due date
            <span className="mt-2 flex items-center gap-2 rounded-xl border border-line px-3">
              <Calendar className="size-4 text-muted" />
              <input
                type="date"
                className="w-full border-0 bg-transparent py-3 outline-none"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </span>
          </label>
          <label className="text-sm font-bold text-ink">
            Due time
            <span className="mt-2 flex items-center gap-2 rounded-xl border border-line px-3">
              <Clock className="size-4 text-muted" />
              <input
                type="time"
                className="w-full border-0 bg-transparent py-3 outline-none"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </span>
          </label>
        </div>
        <p className="mt-3 rounded-xl bg-brand/10 px-3 py-2 text-xs text-[#2a6b66]">
          Notifications can be sent before the due time when push is enabled for this mother&apos;s reminders.
        </p>

        <p className="mt-6 text-[0.7rem] font-extrabold uppercase tracking-wide text-muted">Priority</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {priorities.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={
                "rounded-full border px-4 py-2 text-sm font-bold " +
                (priority === p.value ? "border-brand bg-brand text-white" : "border-line bg-white text-muted")
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <p className="m-0 flex items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-wide text-muted">
            <Link2 className="size-4" />
            Link mother
          </p>
          <span className="text-xs font-bold text-muted">Select one</span>
        </div>
        <ul className="mt-3 space-y-2">
          {mothers.map((m) => (
            <li key={m.motherUserId}>
              <button
                type="button"
                onClick={() => setMotherId(m.motherUserId)}
                className={
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left " +
                  (motherId === m.motherUserId ? "border-brand bg-brand/5" : "border-line bg-white")
                }
              >
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt="" className="size-11 rounded-full object-cover" />
                ) : (
                  <span className="grid size-11 place-items-center rounded-full bg-[#eceff2] text-sm font-extrabold text-brand">
                    {m.displayName[0]}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="m-0 font-extrabold text-ink">{m.displayName}</p>
                  <p className="m-0 text-xs text-muted">Linked patient</p>
                </div>
                <span
                  className={
                    "grid size-6 place-items-center rounded-full border-2 " +
                    (motherId === m.motherUserId ? "border-brand bg-brand text-white" : "border-line")
                  }
                >
                  {motherId === m.motherUserId ? "✓" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex items-center justify-between">
          <p className="m-0 flex items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-wide text-muted">
            <Calendar className="size-4" />
            Link appointment
          </p>
          <span className="text-xs font-bold text-muted">Optional</span>
        </div>
        <ul className="mt-3 space-y-2">
          {appointments.length === 0 ? (
            <li className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-sm text-muted">No upcoming visits</li>
          ) : (
            appointments.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setApptId(apptId === a.id ? "" : a.id)}
                  className={
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left " +
                    (apptId === a.id ? "border-brand bg-brand/5" : "border-line bg-white")
                  }
                >
                  <span className="text-brand">🩺</span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-sm font-extrabold text-ink">Visit</p>
                    <p className="m-0 text-xs text-muted">
                      {new Date(a.starts_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · {a.location_type}
                    </p>
                  </div>
                  <span
                    className={
                      "grid size-6 place-items-center rounded-full border-2 " +
                      (apptId === a.id ? "border-brand bg-brand text-white" : "border-line")
                    }
                  />
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/dashboard/caregiver/tasks"
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-line bg-white text-sm font-bold text-ink no-underline sm:flex-none sm:px-8"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit()}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-brand text-sm font-bold text-white disabled:opacity-60 sm:flex-none sm:min-w-[160px]"
          >
            {saving ? "Saving…" : "Save Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
