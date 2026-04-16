"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    BriefcaseBusiness,
    Building2,
    ChevronDown,
    Mail,
    Phone,
    ShieldCheck,
    User,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { RegistrationLayout } from "@/components/auth/registration-layout";

const PROFESSION_OPTIONS = [
    "OB/GYN",
    "Nurse practitioner",
    "Certified nurse midwife",
    "Doula",
    "Lactation consultant (IBCLC)",
    "Mental health / therapist",
    "Pediatrician",
    "Family medicine",
    "Other",
] as const;

export default function ProfessionalRegistrationPage() {
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [profession, setProfession] = useState<string>(PROFESSION_OPTIONS[0]);
    const [professionOther, setProfessionOther] = useState("");
    const [professionalTitle, setProfessionalTitle] = useState("");
    const [clinicName, setClinicName] = useState("");
    const [licenseNumber, setLicenseNumber] = useState("");
    const [workEmail, setWorkEmail] = useState("");
    const [officePhone, setOfficePhone] = useState("");
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

    const resolvedProfession =
        profession === "Other" ? professionOther.trim() || "Other" : profession;

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage("");

        if (!licenseNumber.trim()) {
            setErrorMessage("Please enter your license or registration number.");
            return;
        }

        if (profession === "Other" && !professionOther.trim()) {
            setErrorMessage("Please describe your profession.");
            return;
        }

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

        const { error: professionalError } = await supabase.from("healthcare_professional_profiles").upsert(
            {
                user_id: user.id,
                phone_number: phone.trim() || null,
                professional_title: professionalTitle.trim() || null,
                profession: resolvedProfession,
                clinic_name: clinicName.trim() || null,
                license_number: licenseNumber.trim(),
                work_email: workEmail.trim() || null,
                office_phone: officePhone.trim() || null,
            },
            { onConflict: "user_id" },
        );

        if (professionalError) {
            setLoading(false);
            setErrorMessage(professionalError.message);
            return;
        }

        const { error: appUserError } = await supabase
            .from("app_users")
            .update({ role: "healthcare_professional", onboarding_completed: true })
            .eq("user_id", user.id);

        setLoading(false);
        if (appUserError) {
            setErrorMessage(appUserError.message);
            return;
        }

        router.push("/dashboard/professional");
    };

    const panelClass =
        "rounded-2xl border border-[#e8dfd0] bg-surface p-5 shadow-[0_4px_20px_rgba(45,55,72,0.06)] [&_h3]:mb-2.5 [&_h3]:mt-0 [&_h3]:text-base [&_h3]:font-extrabold [&_h3]:text-ink [&_p]:m-0 [&_p]:text-[0.9rem] [&_p]:leading-normal [&_p]:text-muted";

    const shellClass =
        "relative [&_svg:first-child]:pointer-events-none [&_svg:first-child]:absolute [&_svg:first-child]:left-3 [&_svg:first-child]:top-1/2 [&_svg:first-child]:z-[1] [&_svg:first-child]:-translate-y-1/2 [&_svg:first-child]:text-[#7d8796]";
    const fieldInput =
        "w-full rounded-[11px] border border-line bg-[#f7f9fa] py-4 pl-[38px] pr-3.5 text-sm text-[#4f586b]";

    const sidebar = (
        <>
            <div className={panelClass}>
                <h3>Commitment to trust &amp; safety</h3>
                <p>
                    We verify professional credentials so families can connect with confidence. You may be asked for additional
                    documentation after signup.
                </p>
            </div>
            <div className={`${panelClass} mt-4`}>
                <h3>Verification process</h3>
                <ol className="mt-2.5 list-decimal pl-[1.1rem] text-[0.9rem] leading-[1.55] text-muted">
                    <li>Submit registration</li>
                    <li>Credential review (typically within 48 hours)</li>
                    <li>Profile activation</li>
                </ol>
                <p className="mt-3 text-[0.9rem] text-muted">
                    <a className="text-[#44a8a8] underline" href="#">
                        Contact provider support
                    </a>{" "}
                    if you need help with onboarding.
                </p>
            </div>
        </>
    );

    return (
        <RegistrationLayout activeRole="professional" mobileTitle="Professional registration" sidebar={sidebar}>
            <div className="my-5 mb-6 [&_h2]:m-0 [&_h2]:text-[32px] [&_h2]:font-extrabold [&_h2]:leading-[1.12] [&_p]:mt-3 [&_p]:text-[1.12rem] [&_p]:leading-normal [&_p]:text-muted">
                <h2>Join our professional network</h2>
                <p>Connect with mothers and families to provide essential postpartum care and clinical guidance.</p>
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

                <section className="flex flex-col gap-2.5 rounded-[11px] border border-line bg-[#eef6f6] p-3.5 [&_label]:text-base [&_label]:font-semibold [&_label]:text-[#4e5769]">
                    <h3 className="m-0 flex items-center gap-2 text-lg font-bold text-[#44a8a8]">
                        <ShieldCheck size={16} /> Professional credentials
                    </h3>
                    <p className="-mt-0.5 mb-1 text-[13px] leading-snug text-muted">Information families see on your public profile.</p>
                    <label htmlFor="professionalTitle">Professional title (optional)</label>
                    <div className={shellClass}>
                        <BriefcaseBusiness size={15} />
                        <input
                            id="professionalTitle"
                            className={fieldInput}
                            value={professionalTitle}
                            onChange={(e) => setProfessionalTitle(e.target.value)}
                            placeholder="e.g. Senior obstetrician"
                        />
                    </div>
                    <label htmlFor="profession">Specialization / profession</label>
                    <div className="relative">
                        <BriefcaseBusiness
                            className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[#7d8796]"
                            size={15}
                        />
                        <ChevronDown
                            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7d8796]"
                            size={16}
                        />
                        <select
                            id="profession"
                            className="w-full cursor-pointer appearance-none rounded-[11px] border border-line bg-[#f7f9fa] py-3.5 pl-[38px] pr-10 text-sm text-[#4f586b]"
                            value={profession}
                            onChange={(e) => setProfession(e.target.value)}
                        >
                            {PROFESSION_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                    </div>
                    {profession === "Other" ? (
                        <>
                            <label htmlFor="professionOther">Describe your profession</label>
                            <input
                                id="professionOther"
                                className="w-full rounded-[11px] border border-line bg-[#f7f9fa] px-3.5 py-4 text-sm text-[#4f586b]"
                                value={professionOther}
                                onChange={(e) => setProfessionOther(e.target.value)}
                                placeholder="Your specialty"
                            />
                        </>
                    ) : null}
                    <label htmlFor="clinicName">Clinic / hospital affiliation (optional)</label>
                    <div className={shellClass}>
                        <Building2 size={15} />
                        <input
                            id="clinicName"
                            className={fieldInput}
                            value={clinicName}
                            onChange={(e) => setClinicName(e.target.value)}
                        />
                    </div>
                    <label htmlFor="licenseNumber">License or registration number</label>
                    <div className={shellClass}>
                        <ShieldCheck size={15} />
                        <input
                            id="licenseNumber"
                            className={fieldInput}
                            value={licenseNumber}
                            onChange={(e) => setLicenseNumber(e.target.value)}
                            required
                            autoComplete="off"
                        />
                    </div>
                    <label htmlFor="workEmail">Work email (optional)</label>
                    <div className={shellClass}>
                        <Mail size={15} />
                        <input
                            id="workEmail"
                            type="email"
                            className={fieldInput}
                            value={workEmail}
                            onChange={(e) => setWorkEmail(e.target.value)}
                            autoComplete="email"
                        />
                    </div>
                    <label htmlFor="officePhone">Office / mobile work line (optional)</label>
                    <div className={shellClass}>
                        <Phone size={15} />
                        <input
                            id="officePhone"
                            className={fieldInput}
                            value={officePhone}
                            onChange={(e) => setOfficePhone(e.target.value)}
                            autoComplete="tel"
                        />
                    </div>
                </section>

                <label className="flex items-start gap-2.5 text-sm text-[#4f586b] [&_input]:mt-0.5">
                    <input
                        type="checkbox"
                        checked={agreeToTerms}
                        onChange={(event) => setAgreeToTerms(event.target.checked)}
                    />
                    <span>
                        I agree to the Terms of Service and Privacy Policy and certify that my professional credentials are accurate
                        to the best of my knowledge.
                    </span>
                </label>

                {errorMessage ? <p className="m-0 text-[0.92rem] text-danger">{errorMessage}</p> : null}
                <button
                    className="h-[54px] w-full cursor-pointer rounded-[11px] border-0 bg-brand text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:bg-brand-disabled"
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Saving profile…" : "Create HCP account"}
                </button>
            </form>
        </RegistrationLayout>
    );
}
