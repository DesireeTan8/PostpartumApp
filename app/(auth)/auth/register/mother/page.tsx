"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CalendarDays,
    HeartPulse,
    Mail,
    Phone,
    Stethoscope,
    User,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { RegistrationLayout } from "@/components/auth/registration-layout";

type BirthType = "vaginal" | "c_section";

type ProviderRow = {
    user_id: string;
    profession: string;
    clinic_name: string | null;
    professional_title: string | null;
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
};

function profileFullName(
    profiles: ProviderRow["profiles"],
): string | null {
    if (!profiles) return null;
    const row = Array.isArray(profiles) ? profiles[0] : profiles;
    return row?.full_name?.trim() ?? null;
}

export default function MotherRegistrationPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [deliveryDate, setDeliveryDate] = useState("");
    const [birthType, setBirthType] = useState<BirthType>("vaginal");
    const [primaryCareProviderId, setPrimaryCareProviderId] = useState("");
    const [providers, setProviders] = useState<Array<{ id: string; label: string }>>([]);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let active = true;

        supabase.auth.getUser().then(async ({ data }) => {
            if (!active) return;
            if (!data.user) {
                router.replace("/auth/sign-in");
                return;
            }

            setEmail(data.user.email ?? "");

            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("user_id", data.user.id)
                .maybeSingle();
            if (profile?.full_name) setFullName(profile.full_name);
        });

        supabase
            .from("healthcare_professional_profiles")
            .select("user_id, profession, clinic_name, professional_title, profiles(full_name)")
            .then(({ data }) => {
                if (!active || !data) return;
                const rows = data as unknown as ProviderRow[];
                setProviders(
                    rows.map((r) => {
                        const name = profileFullName(r.profiles);
                        const bits = [name, r.professional_title, r.profession, r.clinic_name].filter(
                            (x) => x && String(x).trim(),
                        );
                        return {
                            id: r.user_id,
                            label: bits.length ? bits.join(" · ") : "Healthcare professional",
                        };
                    }),
                );
            });

        return () => {
            active = false;
        };
    }, [router]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage("");

        if (!agreeToTerms) {
            setErrorMessage(
                "Please agree to the Terms of Service and Privacy Policy.",
            );
            return;
        }

        setLoading(true);
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setLoading(false);
            setErrorMessage("Session expired. Please sign in again.");
            router.replace("/auth/sign-in");
            return;
        }

        const { error: profileError } = await supabase
            .from("profiles")
            .update({ full_name: fullName.trim() || null })
            .eq("user_id", user.id);

        if (profileError) {
            setLoading(false);
            setErrorMessage(profileError.message);
            return;
        }

        const { error: motherError } = await supabase.from("mother_profiles").upsert(
            {
                user_id: user.id,
                phone_number: phone.trim() || null,
                delivery_date: deliveryDate || null,
                birth_type: birthType,
                primary_care_provider_id: primaryCareProviderId || null,
            },
            { onConflict: "user_id" },
        );

        if (motherError) {
            setLoading(false);
            setErrorMessage(motherError.message);
            return;
        }

        const { error: appUserError } = await supabase
            .from("app_users")
            .update({ role: "mother", onboarding_completed: true })
            .eq("user_id", user.id);

        setLoading(false);

        if (appUserError) {
            setErrorMessage(appUserError.message);
            return;
        }

        router.push("/dashboard/mother");
    };

    const panelClass =
        "rounded-2xl border border-[#e8dfd0] bg-surface p-5 shadow-[0_4px_20px_rgba(45,55,72,0.06)] [&_h3]:mb-2.5 [&_h3]:mt-0 [&_h3]:text-base [&_h3]:font-extrabold [&_h3]:text-ink [&_p]:m-0 [&_p]:text-[0.9rem] [&_p]:leading-normal [&_p]:text-muted";

    const sidebar = (
        <>
            <div className={panelClass}>
                <div
                    className="mb-4 h-[72px] rounded-xl bg-gradient-to-br from-[#c5ebe9] via-[#7ecbc8] to-brand opacity-90"
                    aria-hidden
                />
                <h3>Your privacy matters</h3>
                <p>
                    Health information you share is encrypted and used only to personalize your recovery experience. We follow
                    HIPAA-minded practices for sensitive data.
                </p>
            </div>
            <div className={`${panelClass} mt-4`}>
                <h3>Why we ask this</h3>
                <p>
                    Delivery timing and birth type help us tailor daily check-ins, education, and milestone reminders to your
                    postpartum journey.
                </p>
            </div>
        </>
    );

    return (
        <RegistrationLayout activeRole="mother" mobileTitle="New mother profile" sidebar={sidebar}>
            <div className="my-5 mb-6 [&_h2]:m-0 [&_h2]:text-[32px] [&_h2]:font-extrabold [&_h2]:leading-[1.12] [&_p]:mt-3 [&_p]:text-[1.12rem] [&_p]:leading-normal [&_p]:text-muted">
                <h2>New mother profile</h2>
                <p>Let&apos;s set up your profile to personalize your postpartum recovery journey.</p>
            </div>

            <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
                <section className="flex flex-col gap-2.5 rounded-[11px] border border-line bg-[#f7f9fa] p-3.5 [&_label]:text-base [&_label]:font-semibold [&_label]:text-[#4e5769]">
                    <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-[#44a8a8]">
                        <User size={16} /> Personal information
                    </h3>
                    <p className="-mt-0.5 mb-1 text-[13px] leading-snug text-muted">Help us identify you in the care network.</p>
                    <label htmlFor="fullName">Full name</label>
                    <div className="relative [&_svg]:pointer-events-none [&_svg]:absolute [&_svg]:left-3 [&_svg]:top-1/2 [&_svg]:-translate-y-1/2 [&_svg]:text-[#7d8796]">
                        <User size={15} />
                        <input
                            id="fullName"
                            className="w-full rounded-[11px] border border-line bg-[#f7f9fa] py-4 pl-[38px] pr-3.5 text-sm text-[#4f586b]"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            autoComplete="name"
                        />
                    </div>
                    <label htmlFor="email">Email address</label>
                    <div className="relative [&_svg]:pointer-events-none [&_svg]:absolute [&_svg]:left-3 [&_svg]:top-1/2 [&_svg]:-translate-y-1/2 [&_svg]:text-[#7d8796]">
                        <Mail size={15} />
                        <input
                            id="email"
                            className="w-full rounded-[11px] border border-line bg-[#f7f9fa] py-4 pl-[38px] pr-3.5 text-sm text-[#4f586b]"
                            value={email}
                            disabled
                            readOnly
                        />
                    </div>
                    <label htmlFor="phone">Phone number (optional)</label>
                    <div className="relative [&_svg]:pointer-events-none [&_svg]:absolute [&_svg]:left-3 [&_svg]:top-1/2 [&_svg]:-translate-y-1/2 [&_svg]:text-[#7d8796]">
                        <Phone size={15} />
                        <input
                            id="phone"
                            className="w-full rounded-[11px] border border-line bg-[#f7f9fa] py-4 pl-[38px] pr-3.5 text-sm text-[#4f586b]"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            autoComplete="tel"
                        />
                    </div>
                </section>

                <section className="flex flex-col gap-2.5 rounded-[11px] border border-line bg-[#eef6f6] p-3.5 [&_label]:text-base [&_label]:font-semibold [&_label]:text-[#4e5769]">
                    <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-[#44a8a8]">
                        <Stethoscope size={16} /> Healthcare journey
                    </h3>
                    <p className="-mt-0.5 mb-1 text-[13px] leading-snug text-muted">
                        Choose your primary care provider if they are already on Postpartum Pathways.
                    </p>
                    <label htmlFor="pcp">Primary care provider</label>
                    <div className="relative [&_svg]:pointer-events-none [&_svg]:absolute [&_svg]:left-3 [&_svg]:top-1/2 [&_svg]:-translate-y-1/2 [&_svg]:text-[#7d8796]">
                        <Stethoscope size={15} />
                        <select
                            id="pcp"
                            className="w-full cursor-pointer rounded-[11px] border border-line bg-[#f7f9fa] py-3.5 pl-[38px] pr-3 text-sm text-[#4f586b]"
                            value={primaryCareProviderId}
                            onChange={(e) => setPrimaryCareProviderId(e.target.value)}
                        >
                            <option value="">Select healthcare professional (optional)</option>
                            {providers.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {providers.length === 0 ? (
                        <p className="mt-1.5 text-[13px] leading-snug text-muted">
                            No professionals listed yet—you can skip this and update your profile later.
                        </p>
                    ) : null}
                </section>

                <section className="flex flex-col gap-2.5 rounded-[11px] border border-line bg-[#f7f9fa] p-3.5 [&_label]:text-base [&_label]:font-semibold [&_label]:text-[#4e5769]">
                    <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-[#44a8a8]">
                        <HeartPulse size={16} /> Recovery details
                    </h3>
                    <p className="-mt-0.5 mb-1 text-[13px] leading-snug text-muted">
                        This helps us tailor your daily recovery check-ins and milestones.
                    </p>
                    <label htmlFor="deliveryDate">Delivery date (or expected)</label>
                    <div className="relative [&_svg]:pointer-events-none [&_svg]:absolute [&_svg]:left-3 [&_svg]:top-1/2 [&_svg]:-translate-y-1/2 [&_svg]:text-[#7d8796]">
                        <CalendarDays size={15} />
                        <input
                            id="deliveryDate"
                            type="date"
                            className="w-full rounded-[11px] border border-line bg-[#f7f9fa] py-4 pl-[38px] pr-3.5 text-sm text-[#4f586b]"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            required
                        />
                    </div>
                    <label>Birth type</label>
                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            type="button"
                            className={`min-h-[72px] rounded-[11px] border px-3.5 py-3 text-left text-sm font-bold ${birthType === "vaginal"
                                ? "border-[#54aaa7] bg-[#edf9f8] text-[#2f8d8b]"
                                : "border-line bg-white text-[#2e3745]"
                                }`}
                            onClick={() => setBirthType("vaginal")}
                        >
                            Vaginal
                            <small className="mt-1 block text-[11px] font-semibold text-[#6b7688]">Natural or assisted delivery</small>
                        </button>
                        <button
                            type="button"
                            className={`min-h-[72px] rounded-[11px] border px-3.5 py-3 text-left text-sm font-bold ${birthType === "c_section"
                                ? "border-[#54aaa7] bg-[#edf9f8] text-[#2f8d8b]"
                                : "border-line bg-white text-[#2e3745]"
                                }`}
                            onClick={() => setBirthType("c_section")}
                        >
                            C-section
                            <small className="mt-1 block text-[11px] font-semibold text-[#6b7688]">Cesarean delivery</small>
                        </button>
                    </div>
                </section>

                <label className="flex items-start gap-2.5 text-sm text-[#4f586b] [&_input]:mt-0.5 [&_a]:text-[#4da7a7] [&_a]:underline">
                    <input
                        type="checkbox"
                        checked={agreeToTerms}
                        onChange={(event) => setAgreeToTerms(event.target.checked)}
                    />
                    <span>
                        I agree to the{" "}
                        <a href="#" onClick={(e) => e.preventDefault()}>
                            Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" onClick={(e) => e.preventDefault()}>
                            Privacy Policy
                        </a>
                        .
                    </span>
                </label>

                {errorMessage ? <p className="m-0 text-[0.92rem] text-danger">{errorMessage}</p> : null}
                <button
                    className="h-[54px] w-full cursor-pointer rounded-[11px] border-0 bg-brand text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:bg-brand-disabled disabled:text-[#d9f3f3]"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Saving profile…" : "Create account"}
                </button>
            </form>
        </RegistrationLayout>
    );
}