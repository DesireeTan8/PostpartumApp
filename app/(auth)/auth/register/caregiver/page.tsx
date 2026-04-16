"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, User, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { RegistrationLayout } from "@/components/auth/registration-layout";

type Relationship = "husband" | "partner" | "parent" | "sibling" | "friend" | "other";

const relationshipOptions: Array<{ label: string; value: Relationship }> = [
    { label: "Husband", value: "husband" },
    { label: "Partner", value: "partner" },
    { label: "Parent", value: "parent" },
    { label: "Sibling", value: "sibling" },
    { label: "Friend", value: "friend" },
    { label: "Other", value: "other" },
];

export default function CaregiverRegistrationPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [relationship, setRelationship] = useState<Relationship>("partner");
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

        return () => {
            active = false;
        };
    }, [router]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage("");

        if (!agreeToTerms) {
            setErrorMessage("Please agree to the Terms of Service and Privacy Policy.");
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

        const { error: caregiverError } = await supabase.from("caregiver_profiles").upsert(
            {
                user_id: user.id,
                phone_number: phone.trim() || null,
                relationship,
            },
            { onConflict: "user_id" },
        );

        if (caregiverError) {
            setLoading(false);
            setErrorMessage(caregiverError.message);
            return;
        }

        const { error: appUserError } = await supabase
            .from("app_users")
            .update({ role: "family_member_caregiver", onboarding_completed: true })
            .eq("user_id", user.id);

        setLoading(false);
        if (appUserError) {
            setErrorMessage(appUserError.message);
            return;
        }

        router.push("/dashboard/caregiver");
    };

    const panelClass =
        "rounded-2xl border border-[#e8dfd0] bg-surface p-5 shadow-[0_4px_20px_rgba(45,55,72,0.06)] [&_h3]:mb-2.5 [&_h3]:mt-0 [&_h3]:text-base [&_h3]:font-extrabold [&_h3]:text-ink [&_p]:m-0 [&_p]:text-[0.9rem] [&_p]:leading-normal [&_p]:text-muted [&_ul]:mt-2.5 [&_ul]:list-disc [&_ul]:pl-[1.1rem] [&_ul]:text-[0.9rem] [&_ul]:leading-normal [&_ul]:text-muted [&_li]:mt-0";

    const shellClass =
        "relative [&_svg]:pointer-events-none [&_svg]:absolute [&_svg]:left-3 [&_svg]:top-1/2 [&_svg]:-translate-y-1/2 [&_svg]:text-[#7d8796]";
    const fieldInput =
        "w-full rounded-[11px] border border-line bg-[#f7f9fa] py-4 pl-[38px] pr-3.5 text-sm text-[#4f586b]";

    const sidebar = (
        <>
            <div className={panelClass}>
                <h3>Your role in recovery</h3>
                <ul>
                    <li>Receive real-time updates when the care plan changes.</li>
                    <li>Access shared checklists, education, and appointment reminders.</li>
                    <li>Coordinate tasks with the rest of the support circle.</li>
                </ul>
            </div>
            <div className={`${panelClass} mt-4`}>
                <h3>HIPAA compliant &amp; secure</h3>
                <p>
                    Access is designed to be linked to the mother&apos;s account with clear consent. Only information she chooses
                    to share is visible to you.
                </p>
            </div>
        </>
    );

    return (
        <RegistrationLayout activeRole="caregiver" mobileTitle="New caregiver profile" sidebar={sidebar}>
            <div className="my-5 mb-6 [&_h2]:m-0 [&_h2]:text-[32px] [&_h2]:font-extrabold [&_h2]:leading-[1.12] [&_p]:mt-3 [&_p]:text-[1.12rem] [&_p]:leading-normal [&_p]:text-muted">
                <h2>New caregiver profile</h2>
                <p>Support your loved one&apos;s recovery with shared care plans, education, and guided check-ins.</p>
            </div>

            <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
                <section className="flex flex-col gap-2.5 rounded-[11px] border border-line bg-[#f7f9fa] p-3.5 [&_label]:text-base [&_label]:font-semibold [&_label]:text-[#4e5769]">
                    <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-[#44a8a8]">
                        <User size={16} /> Personal information
                    </h3>
                    <p className="-mt-0.5 mb-1 text-[13px] leading-snug text-muted">Help us identify you in the care network.</p>
                    <label htmlFor="fullName">Full name</label>
                    <div className={shellClass}>
                        <User size={15} />
                        <input
                            id="fullName"
                            className={fieldInput}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            autoComplete="name"
                        />
                    </div>
                    <label htmlFor="email">Email address</label>
                    <div className={shellClass}>
                        <Mail size={15} />
                        <input id="email" className={fieldInput} value={email} disabled readOnly />
                    </div>
                    <label htmlFor="phone">Phone number (optional)</label>
                    <div className={shellClass}>
                        <Phone size={15} />
                        <input
                            id="phone"
                            className={fieldInput}
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            autoComplete="tel"
                        />
                    </div>
                </section>

                <section className="flex flex-col gap-2.5 rounded-[11px] border border-line bg-[#f9f2f6] p-3.5 [&_label]:text-base [&_label]:font-semibold [&_label]:text-[#4e5769]">
                    <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-[#44a8a8]">
                        <Users size={16} /> Relationship
                    </h3>
                    <p className="-mt-0.5 mb-1 text-[13px] leading-snug text-muted">How are you related to the mother?</p>
                    <div className="flex flex-wrap gap-2">
                        {relationshipOptions.map((option) => (
                            <button
                                key={option.value}
                                className={`cursor-pointer rounded-full border px-3 py-2 text-[13px] font-semibold ${relationship === option.value
                                    ? "border-brand bg-[#eaf6f6] text-[#337f7e]"
                                    : "border-line bg-white text-[#4f586b]"
                                    }`}
                                onClick={() => setRelationship(option.value)}
                                type="button"
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </section>

                <label className="flex items-start gap-2.5 text-sm text-[#4f586b] [&_input]:mt-0.5">
                    <input
                        type="checkbox"
                        checked={agreeToTerms}
                        onChange={(event) => setAgreeToTerms(event.target.checked)}
                    />
                    <span>I agree to the Terms of Service and Privacy Policy and understand that access may be linked to the primary
                        mother&apos;s account with her consent.
                    </span>
                </label>

                {errorMessage ? <p className="m-0 text-[0.92rem] text-danger">{errorMessage}</p> : null}
                <button
                    className="h-[54px] w-full cursor-pointer rounded-[11px] border-0 bg-brand text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:bg-brand-disabled"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Saving profile…" : "Create caregiver account"}
                </button>
            </form>
        </RegistrationLayout>
    );
}
