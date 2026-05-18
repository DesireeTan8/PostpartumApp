"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, EyeOff, HeartPulse } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const inputClass =
    "w-full rounded-[11px] border border-line bg-[#f7f9fa] px-3.5 py-4 text-sm text-[#4f586b] lg:py-2.5";

const submitClass =
    "mt-6 grid h-13.5 w-full cursor-pointer place-items-center rounded-[11px] border-0 bg-brand text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:bg-brand-disabled disabled:text-[#d9f3f3]";

export default function SignUpPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage("");

        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        setLoading(true);

        const emailRedirectTo = `${window.location.origin}/auth/callback?next=/auth/select-role`;

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo,
            },
        });

        setLoading(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
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
                <h1 className="m-0 text-center text-[17px] font-extrabold leading-none">Create Account</h1>
                <span />
            </header>

            <section className="mx-auto flex w-full max-w-97.5 flex-1 flex-col justify-center gap-5 px-6 pb-10 pt-6 max-lg:min-h-0 lg:min-h-[calc(100dvh-76px)] lg:max-w-[980px] lg:px-8 lg:py-12">
                {/* Desktop card */}
                <div className="lg:grid lg:min-h-[680px] lg:grid-cols-2 lg:overflow-hidden lg:rounded-[18px] lg:border lg:border-[#dbe4e7] lg:bg-white lg:shadow-[0_22px_55px_rgba(15,23,42,0.13)]">
                    {/* Left form */}
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
                                <h2 className="m-0 text-[28px] font-extrabold leading-[1.12] lg:text-[32px] lg:leading-[1.08]">
                                    Start Your Journey
                                </h2>
                                <p className="m-0 text-[1.05rem] leading-[1.45] text-[#4f586b]">
                                    Create your account to access personalized postpartum support.
                                </p>
                            </div>
                        </div>

                        <div className="hidden lg:block">
                            <h2 className="m-0 text-[28px] font-extrabold leading-tight text-[#1f2430]">
                                Start Your Journey
                            </h2>
                            <p className="mt-2 text-[15px] text-[#647083]">
                                Create your account to access personalized postpartum support.
                            </p>
                        </div>

                        <form className="mx-auto flex w-full max-w-md flex-col gap-3.5 lg:mx-0 lg:mt-10" onSubmit={handleSubmit}>
                            <label htmlFor="email" className="text-base font-semibold text-[#4e5769]">
                                Email Address
                            </label>
                            <div className="relative">
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
                            </div>

                            <label htmlFor="password" className="text-base font-semibold text-[#4e5769]">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    className={`${inputClass} pr-[58px]`}
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    minLength={8}
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

                            <label htmlFor="confirmPassword" className="text-base font-semibold text-[#4e5769]">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    className={`${inputClass} pr-[58px]`}
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    placeholder="Confirm your password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                />
                                <button
                                    className="absolute right-3.5 top-1/2 size-[30px] -translate-y-1/2 cursor-pointer border-0 bg-transparent text-[0] text-[#5c6474]"
                                    type="button"
                                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                    onClick={() => setShowConfirmPassword((current) => !current)}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {errorMessage ? <p className="m-0 text-[0.92rem] text-danger">{errorMessage}</p> : null}

                            <button className={submitClass} type="submit" disabled={loading}>
                                {loading ? "Creating account..." : "Create Account"}
                            </button>
                        </form>

                        <p className="mt-0 text-center text-sm text-[#4f586b] lg:mt-6">
                            Already have an account?{" "}
                            <Link className="text-[#44a8a8] underline decoration-1 underline-offset-2" href="/auth/sign-in">
                                Sign In
                            </Link>
                        </p>
                    </div>

                    <aside className="hidden bg-[#f1f8f8] px-10 py-14 lg:flex lg:items-center">
                        <div className="rounded-[22px] border border-[#d9e8e8] bg-white/55 p-10 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                            <div className="mb-8 grid size-16 place-items-center rounded-lg bg-[#e0f4f3] text-[#4ca9a7] shadow-sm">
                                <HeartPulse size={30} />
                            </div>

                            <h3 className="m-0 text-[22px] font-extrabold leading-tight text-[#1f2430]">
                                Your Privacy is Our Priority
                            </h3>

                            <p className="mt-5 text-sm leading-[1.55] text-[#5d6879]">
                                Postpartum recovery is a deeply personal journey. We built this platform with privacy and care in mind.
                            </p>

                            <div className="mt-8 grid gap-5">
                                <div>
                                    <p className="m-0 font-semibold text-[#1f2430]">End-to-End Protection</p>
                                    <p className="m-0 mt-1 text-sm leading-[1.45] text-[#5d6879]">
                                        Your personal health details are handled safely and privately.
                                    </p>
                                </div>

                                <div>
                                    <p className="m-0 font-semibold text-[#1f2430]">Personalized Support</p>
                                    <p className="m-0 mt-1 text-sm leading-[1.45] text-[#5d6879]">
                                        Guidance is tailored based on your role and recovery journey.
                                    </p>
                                </div>

                                <div>
                                    <p className="m-0 font-semibold text-[#1f2430]">Role-Based Experience</p>
                                    <p className="m-0 mt-1 text-sm leading-[1.45] text-[#5d6879]">
                                        Mothers, caregivers, and healthcare professionals each receive relevant tools.
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