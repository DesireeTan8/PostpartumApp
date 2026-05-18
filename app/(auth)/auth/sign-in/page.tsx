"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, EyeOff, HeartPulse } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const roleRouteMap: Record<string, string> = {
    mother: "/auth/register/mother",
    family_member_caregiver: "/auth/register/caregiver",
    healthcare_professional: "/auth/register/professional",
};

const roleDashboardMap: Record<string, string> = {
    mother: "/dashboard/mother",
    family_member_caregiver: "/dashboard/caregiver",
    healthcare_professional: "/dashboard/professional",
};

const inputClass =
    "w-full rounded-[11px] border border-line bg-[#f7f9fa] px-3.5 py-4 text-sm text-[#4f586b] lg:py-2.5";

const submitClass =
    "mt-3.5 grid h-13.5 w-full cursor-pointer place-items-center rounded-[11px] border-0 bg-brand text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:bg-brand-disabled disabled:text-[#d9f3f3]";

export default function SignInPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage("");
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setLoading(false);
            setErrorMessage(error.message);
            return;
        }

        const user = data.user;

        if (!user?.email_confirmed_at) {
            setLoading(false);
            router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
            return;
        }

        const { data: profile } = await supabase
            .from("app_users")
            .select("role,onboarding_completed")
            .eq("user_id", user.id)
            .maybeSingle();

        setLoading(false);
        if (!profile?.role) {
            router.push("/auth/select-role");
            return;
        }
        if (!profile.onboarding_completed) {
            router.push(roleRouteMap[profile.role] ?? "/auth/select-role");
            return;
        }
        router.push(roleDashboardMap[profile.role] ?? "/auth/welcome");
    };

    return (
        <main className="flex min-h-dvh w-full flex-col bg-canvas">
            <header className="grid h-[100px] grid-cols-[40px_1fr_40px] items-end border-b border-[#d5dbe2] bg-[#f8f9fa] px-[18px] pb-4 lg:hidden">
                <button
                    type="button"
                    className="flex h-10 w-10 cursor-pointer items-center justify-center border-0 bg-transparent text-[#4d5563]"
                    onClick={() => router.back()}
                    aria-label="Back"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="m-0 text-center text-[17px] font-extrabold leading-none">Sign In</h1>
                <span />
            </header>

            <section className="mx-auto flex w-full max-w-97.5 flex-1 flex-col justify-center gap-5 px-6 pb-10 pt-6 max-lg:min-h-0 lg:min-h-[calc(100dvh-76px)] lg:max-w-[980px] lg:px-8 lg:py-12">
                <div className="lg:grid lg:min-h-[680px] lg:grid-cols-2 lg:overflow-hidden lg:rounded-[18px] lg:border lg:border-[#dbe4e7] lg:bg-white lg:shadow-[0_22px_55px_rgba(15,23,42,0.13)]">
                    {/* left form */}
                    <div className="flex flex-col justify-center lg:px-16 lg:py-14">
                        <div className="hidden w-full lg:block">
                            <button
                                type="button"
                                className="mb-10 inline-flex cursor-pointer items-center gap-0.5 border-0 bg-transparent p-0 text-[0.92rem] font-semibold text-[#4f586b] hover:text-brand"
                                onClick={() => router.back()}
                                aria-label="Back"
                            >
                                <ChevronLeft size={20} aria-hidden />
                                Back
                            </button>
                        </div>

                        <div className="grid place-items-center gap-4.5 text-center lg:hidden">
                            <div
                                className="grid size-23 place-items-center rounded-[20px] bg-[#57adaa] text-[40px] font-bold text-white"
                                aria-hidden="true"
                            >
                                <HeartPulse size={42} strokeWidth={2.4} />
                            </div>
                            <div className="grid gap-2">
                                <h2 className="m-0 text-[32px] font-extrabold leading-[1.12]">
                                    Access Your Support Journey
                                </h2>
                                <p className="m-0 text-[1.05rem] leading-[1.45] text-[#4f586b]">
                                    Sign in to continue your postpartum support journey.
                                </p>
                            </div>
                        </div>

                        <div className="hidden lg:block">
                            <h2 className="m-0 text-[28px] font-extrabold leading-tight text-[#1f2430]">
                                Welcome Back
                            </h2>
                            <p className="mt-2 text-[15px] leading-[1.45] text-[#647083]">
                                Sign in to continue your journey and access your personalized resources.
                            </p>
                        </div>

                        <form className="mx-auto flex w-full max-w-md flex-col gap-3.5 lg:mx-0 lg:mt-10" onSubmit={handleSubmit}>
                            <label htmlFor="email" className="text-base font-semibold text-[#4e5769]">
                                Email Address
                            </label>
                            <input
                                className={inputClass}
                                id="email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="your@example.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                            />

                            <label htmlFor="password" className="text-base font-semibold text-[#4e5769]">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    className={`${inputClass} pr-[58px]`}
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                />
                                <button
                                    className="absolute right-3.5 top-1/2 size-[30px] -translate-y-1/2 cursor-pointer border-0 bg-transparent text-[0] text-[#5c6474]"
                                    type="button"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    onClick={() => setShowPassword((current) => !current)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <Link
                                className="mt-1 text-right text-[0.92rem] font-semibold text-[#44a8a8] no-underline"
                                href="/auth/password-recovery"
                            >
                                Forgot Password?
                            </Link>

                            {errorMessage ? <p className="m-0 text-[0.92rem] text-danger">{errorMessage}</p> : null}

                            <button className={submitClass} type="submit" disabled={loading}>
                                {loading ? "Signing in..." : "Sign In"}
                            </button>
                        </form>

                        <p className="mt-0 text-center text-sm text-[#4f586b] lg:mt-6">
                            Don&apos;t have an account?{" "}
                            <Link className="font-bold text-[#44a8a8] no-underline" href="/auth/sign-up">
                                Register now
                            </Link>
                        </p>
                    </div>

                    <aside className="hidden bg-[#f1f8f8] px-10 py-14 lg:flex lg:items-center">
                        <div className="w-full">
                            <div className="mb-8 grid size-12 place-items-center rounded-[12px] bg-[#e0f4f3] text-[#4ca9a7]">
                                <HeartPulse size={24} />
                            </div>

                            <h3 className="m-0 text-[28px] font-extrabold leading-tight text-[#1f2430]">
                                Your safe space for recovery and support.
                            </h3>

                            <p className="mt-5 text-[15px] leading-[1.55] text-[#5d6879]">
                                Join our community of mothers, caregivers, and professionals dedicated to healthy postpartum journeys.
                            </p>

                            <div className="mt-7 grid gap-7">
                                <div>
                                    <p className="m-0 font-semibold text-[#1f2430]">Secure Health Records</p>
                                    <p className="m-0 mt-1 text-sm leading-[1.45] text-[#5d6879]">
                                        Your data is encrypted and kept private.
                                    </p>
                                </div>

                                <div>
                                    <p className="m-0 font-semibold text-[#1f2430]">Evidence-Based Resources</p>
                                    <p className="m-0 mt-1 text-sm leading-[1.45] text-[#5d6879]">
                                        Access articles, guides, and tools curated by healthcare professionals.
                                    </p>
                                </div>

                                <div>
                                    <p className="m-0 font-semibold text-[#1f2430]">Personalized Guidance</p>
                                    <p className="m-0 mt-1 text-sm leading-[1.45] text-[#5d6879]">
                                        Receive support based on your role and postpartum journey.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    );
}