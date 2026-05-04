"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AlertCircle, Clock3, Lock, MessageCircle, ShieldCheck } from "lucide-react";
import { concernLabel, epdsOptionsForOrdinal, type EpdQuestion } from "@/lib/epds";
import { supabase } from "@/lib/supabase/client";
import { useMotherPageHeader } from "@/components/layout/mother-dashboard-header-context";

type ConcernLevel = "low" | "moderate" | "high";

type AssessmentResultRow = {
  session_id: string;
  total_score: number;
  concern_level: ConcernLevel;
  computed_at: string;
  next_checkin_at: string | null;
};

function pageWrap(children: ReactNode) {
  return <div className="mx-auto w-full max-w-[760px] pb-6">{children}</div>;
}

async function getAuthedUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

async function loadEpdsDefinitionAndQuestions() {
  const { data: definition, error: defError } = await supabase
    .from("assessment_definitions")
    .select("id, slug, title, question_count, max_score, version")
    .eq("slug", "epds")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (defError || !definition) throw new Error("EPDS assessment definition not found.");

  const { data: questions, error: questionsError } = await supabase
    .from("assessment_questions")
    .select("id, ordinal, prompt, option_max")
    .eq("definition_id", definition.id)
    .order("ordinal", { ascending: true });

  if (questionsError || !questions) throw new Error("EPDS questions are not available.");

  return {
    definitionId: definition.id as string,
    maxScore: definition.max_score as number,
    questions: questions as EpdQuestion[],
  };
}

export function EpdsIntroPage() {
  const router = useRouter();
  const { setPageHeader } = useMotherPageHeader();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageHeader({
      title: "Emotional Wellbeing Check",
      layout: "detail",
      backHref: "/dashboard/mother/logs/new",
      backLabel: "Back to new log",
    });
    return () => setPageHeader(null);
  }, [setPageHeader]);

  const startAssessment = async () => {
    if (starting) return;
    setStarting(true);
    setError(null);

    try {
      const userId = await getAuthedUserId();
      if (!userId) {
        router.replace("/auth/sign-in");
        return;
      }

      const { definitionId } = await loadEpdsDefinitionAndQuestions();
      const { data: session, error: sessionError } = await supabase
        .from("assessment_sessions")
        .insert({
          mother_user_id: userId,
          definition_id: definitionId,
          status: "in_progress",
        })
        .select("id")
        .single();

      if (sessionError || !session) throw new Error(sessionError?.message ?? "Could not start assessment.");

      router.push(`/dashboard/mother/logs/epds/questions?q=1&s=${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start assessment.");
    } finally {
      setStarting(false);
    }
  };

  return pageWrap(
    <section className="flex min-h-[70vh] flex-col justify-center rounded-none border-0 bg-transparent p-0 text-center md:min-h-0 md:rounded-2xl md:border md:border-[#dfe7ea] md:bg-white md:p-7">
      <h1 className="m-0 text-[1.15rem] font-extrabold tracking-tight text-[#1f232b]">Emotional Wellbeing Check</h1>
      <p className="mb-0 mt-4 text-[1.04rem] leading-relaxed text-muted">
        This 10-question assessment helps us understand how you&apos;ve been feeling over the past 7 days.
      </p>
      <p className="mb-0 mt-2 flex items-center justify-center gap-2 text-[1.04rem] text-[#4a5568]">
        <Clock3 size={18} />
        Estimated time: 3-5 minutes
      </p>
      <p className="mb-0 mt-6 flex items-start justify-center gap-2 text-left text-[1.04rem] leading-relaxed text-[#4a5568]">
        <Lock size={18} className="mt-1 shrink-0" />
        Your responses are confidential and will help us provide personalized insights into your emotional wellbeing.
      </p>
      {error ? <p className="mb-0 mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-10 space-y-3">
        <button
          type="button"
          onClick={startAssessment}
          disabled={starting}
          className="flex h-[54px] w-full items-center justify-center rounded-xl border-0 bg-brand text-[1rem] font-bold text-white disabled:bg-brand-disabled"
        >
          {starting ? "Starting..." : "Start Assessment"}
        </button>
        <Link
          href="/dashboard/mother/logs/new"
          className="flex h-[50px] w-full items-center justify-center rounded-xl border border-[#d5dde2] bg-white text-[1rem] font-semibold text-[#4a5568] no-underline"
        >
          Back
        </Link>
      </div>
    </section>
  );
}

export function EpdsQuestionnairePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { setPageHeader } = useMotherPageHeader();

  const sessionId = params.get("s")?.trim() ?? "";
  const questionNumber = Math.max(1, Number(params.get("q") || "1"));

  const [questions, setQuestions] = useState<EpdQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const total = questions.length || 10;
    const safe = Math.min(questionNumber, total);
    setPageHeader({
      title: `Question ${safe} of ${total}`,
      layout: "detail",
      backHref: "/dashboard/mother/logs/epds",
      backLabel: "Back to intro",
    });
    return () => setPageHeader(null);
  }, [questionNumber, questions.length, setPageHeader]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (!sessionId) {
          setError("Missing assessment session.");
          return;
        }
        const { questions: dbQuestions } = await loadEpdsDefinitionAndQuestions();
        if (!active) return;
        setQuestions(dbQuestions);

        const { data: dbAnswers, error: answersError } = await supabase
          .from("assessment_answers")
          .select("question_id, value_int")
          .eq("session_id", sessionId);
        if (answersError) throw answersError;

        const mapped: Record<string, number> = {};
        for (const row of dbAnswers ?? []) {
          mapped[row.question_id as string] = row.value_int as number;
        }
        if (active) setAnswers(mapped);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load questionnaire.");
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const totalQuestions = questions.length || 10;
  const boundedQuestionNumber = Math.min(questionNumber, totalQuestions);
  const currentQuestion = questions[boundedQuestionNumber - 1];
  const selected = currentQuestion ? answers[currentQuestion.id] : undefined;
  const progress = (boundedQuestionNumber / totalQuestions) * 100;

  const saveAnswer = async (value: number) => {
    if (!currentQuestion || saving) return;
    setSaving(true);
    setError(null);
    const { error: saveError } = await supabase.from("assessment_answers").upsert(
      {
        session_id: sessionId,
        question_id: currentQuestion.id,
        value_int: value,
      },
      { onConflict: "session_id,question_id" }
    );
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const onNext = () => {
    if (!currentQuestion || selected == null) return;
    if (boundedQuestionNumber >= totalQuestions) {
      router.push(`/dashboard/mother/logs/epds/review?s=${sessionId}`);
      return;
    }
    router.push(`/dashboard/mother/logs/epds/questions?q=${boundedQuestionNumber + 1}&s=${sessionId}`);
  };

  if (!currentQuestion) {
    return pageWrap(
      <section className="rounded-none border-0 bg-transparent p-0 md:rounded-2xl md:border md:border-[#dfe7ea] md:bg-white md:p-7">
        <p className="m-0 text-sm text-muted">{error ?? "Loading questionnaire..."}</p>
      </section>
    );
  }

  return pageWrap(
    <section className="rounded-none border-0 bg-transparent p-0 md:rounded-2xl md:border md:border-[#dfe7ea] md:bg-white md:p-7">
      <p className="mb-2 mt-0 text-[1.05rem] font-bold text-[#4e5565]">
        Question {boundedQuestionNumber} of {totalQuestions}
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[#d9dee5]">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
      </div>
      <h1 className="mb-0 mt-7 text-[1.15rem] font-extrabold leading-tight">{currentQuestion.prompt}</h1>

      <div className="mt-8 space-y-3">
        {epdsOptionsForOrdinal(currentQuestion.ordinal).map((option) => {
          const active = selected === option.value;
          return (
            <button
              key={`${currentQuestion.id}-${option.value}`}
              type="button"
              onClick={() => void saveAnswer(option.value)}
              className={`flex min-h-[64px] w-full items-center gap-3 rounded-xl border px-4 text-left text-[1.05rem] ${active ? "border-brand bg-[#e8f4f4]" : "border-[#d3dbe1] bg-white"
                }`}
            >
              <span
                aria-hidden="true"
                className={`inline-block h-5 w-5 shrink-0 rounded-full border-2 ${active ? "border-brand bg-brand ring-1 ring-inset ring-white" : "border-[#b3bdc9] bg-transparent"
                  }`}
              />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      {error ? <p className="mb-0 mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          disabled={selected == null || saving}
          onClick={onNext}
          className="h-[50px] min-w-[110px] rounded-xl border-0 bg-brand px-6 text-[1rem] font-bold text-white disabled:bg-brand-disabled"
        >
          {boundedQuestionNumber >= totalQuestions ? "Review" : "Next"}
        </button>
      </div>
    </section>
  );
}

export function EpdsReviewPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { setPageHeader } = useMotherPageHeader();
  const sessionId = params.get("s")?.trim() ?? "";

  const [questions, setQuestions] = useState<EpdQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageHeader({
      title: "Review Your Answer",
      layout: "detail",
      backHref: `/dashboard/mother/logs/epds/questions?q=10&s=${sessionId}`,
      backLabel: "Back to questions",
    });
    return () => setPageHeader(null);
  }, [sessionId, setPageHeader]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (!sessionId) {
          setError("Missing assessment session.");
          return;
        }
        const { questions: dbQuestions } = await loadEpdsDefinitionAndQuestions();
        if (!active) return;
        setQuestions(dbQuestions);
        const { data: dbAnswers, error: answersError } = await supabase
          .from("assessment_answers")
          .select("question_id, value_int")
          .eq("session_id", sessionId);
        if (answersError) throw answersError;
        const mapped: Record<string, number> = {};
        for (const row of dbAnswers ?? []) mapped[row.question_id as string] = row.value_int as number;
        if (active) setAnswers(mapped);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Could not load review.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] != null);

  const onSubmit = async () => {
    if (!sessionId || !allAnswered || submitting) return;
    setSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("assessment_sessions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push(`/dashboard/mother/logs/epds/summary?s=${sessionId}`);
  };

  return pageWrap(
    <section className="rounded-none border-0 bg-transparent p-0 md:rounded-2xl md:border md:border-[#dfe7ea] md:bg-white md:p-7">
      {loading ? (
        <p className="m-0 text-sm text-muted">Loading review...</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-[#e6ebef] p-0">
          {questions.map((question) => {
            const value = answers[question.id];
            const selected = epdsOptionsForOrdinal(question.ordinal).find((opt) => opt.value === value)?.label ?? "Not answered";
            return (
              <li key={question.id} className="flex items-start justify-between gap-3 py-3.5">
                <div>
                  <p className="m-0 text-[1rem] font-bold text-[#252a33]">
                    {question.ordinal}. {question.prompt}
                  </p>
                  <p className="mb-0 mt-1 text-[0.95rem] text-muted">{selected}</p>
                </div>
                <Link
                  href={`/dashboard/mother/logs/epds/questions?q=${question.ordinal}&s=${sessionId}`}
                  className="inline-flex h-9 items-center rounded-xl border border-[#bdd7d5] px-3 text-[0.9rem] font-semibold text-brand no-underline"
                >
                  Edit
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !allAnswered ? (
        <p className="mt-3 flex items-center gap-2 text-[0.9rem] text-[#b45309]">
          <AlertCircle size={16} />
          Complete all questions before submitting.
        </p>
      ) : null}
      {error ? <p className="mb-0 mt-3 text-sm text-danger">{error}</p> : null}

      <button
        type="button"
        onClick={() => void onSubmit()}
        disabled={!allAnswered || submitting}
        className="mt-8 h-[52px] w-full rounded-xl border-0 bg-brand text-[1rem] font-bold text-white disabled:bg-brand-disabled"
      >
        {submitting ? "Submitting..." : "Submit Answers"}
      </button>
    </section>
  );
}

export function EpdsSummaryPage() {
  const params = useSearchParams();
  const { setPageHeader } = useMotherPageHeader();
  const sessionId = params.get("s")?.trim() ?? "";
  const [result, setResult] = useState<AssessmentResultRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageHeader({
      title: "Your Emotional Wellbeing",
      layout: "detail",
      backHref: "/dashboard/mother/logs",
      backLabel: "Back to health logs",
    });
    return () => setPageHeader(null);
  }, [setPageHeader]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("assessment_results")
        .select("session_id, total_score, concern_level, computed_at, next_checkin_at")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (active) {
        setResult((data as AssessmentResultRow | null) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const score = result?.total_score ?? 0;
  const concern = (result?.concern_level ?? "low") as ConcernLevel;
  const concernText = concernLabel(concern);

  return pageWrap(
    <section className="rounded-none border-0 bg-transparent p-0 md:rounded-2xl md:border md:border-[#dfe7ea] md:bg-white md:p-7">
      <p className="mx-auto mb-0 mt-1 max-w-[480px] text-center text-[1.05rem] text-[#444f60]">
        Thank you for completing the assessment. Here&apos;s a summary of your emotional wellbeing.
      </p>
      {loading ? <p className="mt-4 text-center text-sm text-muted">Loading results...</p> : null}
      <article className="mx-auto mt-6 max-w-[500px] rounded-none border-0 bg-transparent p-0 text-center md:rounded-2xl md:border md:border-[#eceff2] md:bg-[#fbfcfc] md:p-5">
        <p className="m-0 text-[3rem] font-extrabold leading-none text-[#d64040]">{score} / 30</p>
        <p className="mb-0 mt-2 text-[1.45rem] font-extrabold text-[#202633]">Your EPDS Score</p>
        <span className="mt-3 inline-flex rounded-full bg-[#f7e5e5] px-3 py-1 text-[0.9rem] font-semibold text-[#bb5252]">
          {concernText}
        </span>
      </article>

      {concern === "high" ? (
        <div className="mt-4 rounded-xl border border-[#f0c8c8] bg-[#fff4f4] px-4 py-3 text-[0.95rem] font-semibold text-[#b45353]">
          Your score indicates a higher level of concern. We recommend consulting a healthcare professional.
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        <div className="rounded-xl border border-[#dfe6ea] bg-[#f9fbfc] p-4">
          <h3 className="m-0 text-[1.28rem] font-extrabold">Low concern</h3>
          <p className="mb-0 mt-1.5 text-[0.97rem] leading-relaxed text-[#515b69]">
            Your responses suggest a low level of concern regarding your emotional wellbeing. Continue to monitor your feelings and
            practice self-care.
          </p>
        </div>
        <div className="rounded-xl border border-[#dfe6ea] bg-[#f9fbfc] p-4">
          <h3 className="m-0 text-[1.28rem] font-extrabold">Moderate concern</h3>
          <p className="mb-0 mt-1.5 text-[0.97rem] leading-relaxed text-[#515b69]">
            Your responses indicate some moderate concerns about your emotional wellbeing. It might be helpful to reach out for support
            or explore coping strategies.
          </p>
        </div>
        <div className={`rounded-xl border p-4 ${concern === "high" ? "border-[#9bc2bd] bg-[#edf6f5]" : "border-[#dfe6ea] bg-[#f9fbfc]"}`}>
          <h3 className="m-0 text-[1.28rem] font-extrabold">High concern</h3>
          <p className="mb-0 mt-1.5 text-[0.97rem] leading-relaxed text-[#515b69]">
            Your responses suggest a higher level of concern regarding your emotional wellbeing. We strongly recommend speaking with a
            healthcare professional soon.
          </p>
        </div>
      </div>

      <h2 className="mb-0 mt-8 text-[1.5rem] font-extrabold">Suggested Next Steps</h2>
      <ul className="mb-0 mt-3 list-none space-y-2.5 p-0 text-[1.05rem]">
        <li className="flex items-center gap-2 text-[#335b57]">
          <ShieldCheck size={19} className="text-brand" />
          Talk to a healthcare professional
        </li>
        <li className="flex items-center gap-2 text-[#335b57]">
          <MessageCircle size={19} className="text-brand" />
          Chat with AI support
        </li>
        <li className="flex items-center gap-2 text-[#335b57]">
          <ShieldCheck size={19} className="text-brand" />
          View coping tips
        </li>
      </ul>

      <div className="mt-6 space-y-3">
        <Link
          href="/dashboard/mother/ai-chat"
          className="flex h-[52px] w-full items-center justify-center rounded-xl bg-brand text-[1rem] font-bold text-white no-underline"
        >
          Talk to AI
        </Link>
        <Link
          href="/dashboard/mother/schedule"
          className="flex h-[52px] w-full items-center justify-center rounded-xl bg-brand text-[1rem] font-bold text-white no-underline"
        >
          Schedule Appointment
        </Link>
      </div>
    </section>
  );
}

export function EpdsHistoryPage() {
  const { setPageHeader } = useMotherPageHeader();
  const [records, setRecords] = useState<AssessmentResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageHeader({
      title: "Your History",
      layout: "detail",
      backHref: "/dashboard/mother",
      backLabel: "Back to dashboard",
    });
    return () => setPageHeader(null);
  }, [setPageHeader]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const userId = await getAuthedUserId();
      if (!userId) {
        if (active) setLoading(false);
        return;
      }

      const { data: sessions } = await supabase
        .from("assessment_sessions")
        .select("id")
        .eq("mother_user_id", userId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(40);

      const sessionIds = (sessions ?? []).map((s) => s.id as string);
      if (sessionIds.length === 0) {
        if (active) {
          setRecords([]);
          setLoading(false);
        }
        return;
      }

      const { data: results } = await supabase
        .from("assessment_results")
        .select("session_id, total_score, concern_level, computed_at, next_checkin_at")
        .in("session_id", sessionIds)
        .order("computed_at", { ascending: false });

      if (active) {
        setRecords((results as AssessmentResultRow[] | null) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const latest = records[0] ?? null;
  const trendPoints = records.slice(0, 10).reverse();
  const maxScore = 30;

  const path = trendPoints
    .map((item, idx) => {
      const x = trendPoints.length <= 1 ? 16 : 16 + (idx * 288) / (trendPoints.length - 1);
      const y = 188 - (item.total_score / maxScore) * 150;
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const nextCheckInText =
    latest?.next_checkin_at != null
      ? `${Math.max(0, Math.ceil((new Date(latest.next_checkin_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days`
      : "—";

  return pageWrap(
    <section className="space-y-4">
      <article className="rounded-none border-0 bg-transparent p-0 md:rounded-2xl md:border md:border-[#e4eaee] md:bg-white md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="m-0 text-[1.75rem] font-extrabold">Latest Assessment</h1>
          <span className="text-[1rem] text-[#5a6672]">
            {latest ? new Date(latest.computed_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "No records yet"}
          </span>
        </div>
        <p className="mb-0 mt-4 text-[1.6rem] font-extrabold">Your Risk Level</p>
        <p className="mb-0 mt-2 text-[1.5rem] text-[#2f3a49]">
          {latest ? concernLabel(latest.concern_level) : "Not assessed"}
        </p>
        <p className="mb-0 mt-5 text-[1.6rem] font-extrabold">Next Check-in</p>
        <p className="mb-0 mt-2 text-[2rem] font-extrabold text-[#d96b6b]">{nextCheckInText}</p>
      </article>

      <article className="rounded-none border-0 bg-transparent p-0 md:rounded-2xl md:border md:border-[#e4eaee] md:bg-white md:p-5">
        <h2 className="m-0 text-[1.6rem] font-extrabold">EPDS Score History</h2>
        <p className="mb-0 mt-1 text-[1rem] text-[#5d6877]">Trend of your emotional wellbeing over time</p>
        {loading ? <p className="mt-4 text-sm text-muted">Loading history...</p> : null}
        <svg viewBox="0 0 320 220" className="mt-4 block h-auto w-full" role="img" aria-label="EPDS score history chart">
          <line x1="16" y1="38" x2="304" y2="38" stroke="#d9dee5" strokeDasharray="4 4" />
          <line x1="16" y1="88" x2="304" y2="88" stroke="#d9dee5" strokeDasharray="4 4" />
          <line x1="16" y1="138" x2="304" y2="138" stroke="#d9dee5" strokeDasharray="4 4" />
          <line x1="16" y1="188" x2="304" y2="188" stroke="#d9dee5" strokeDasharray="4 4" />
          {path ? <path d={path} fill="none" stroke="#e4a8a8" strokeWidth="2.5" strokeLinecap="round" /> : null}
          {trendPoints.map((item, idx) => {
            const x = trendPoints.length <= 1 ? 16 : 16 + (idx * 288) / (trendPoints.length - 1);
            const y = 188 - (item.total_score / maxScore) * 150;
            return <circle key={item.session_id} cx={x} cy={y} r={4.5} fill="#eab7b7" />;
          })}
        </svg>
      </article>
    </section>
  );
}
