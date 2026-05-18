"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Mail, KeyRound, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const inputClass =
    "w-full rounded-[11px] border border-line bg-[#f7f9fa] py-4 pl-10 pr-[58px] text-sm text-[#4f586b]";

export default function PasswordRecoveryPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage("");
        setMessage("");
        setLoading(true);

        const redirectTo = `${window.location.origin}/auth/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

        setLoading(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setMessage("Password reset email sent. Check your inbox.");
    };

    return (
        <main className="flex min-h-dvh w-full flex-col bg-canvas">
            <header className="grid h-[100px] grid-cols-[40px_1fr_40px] items-end border-b border-[#d5dbe2] bg-[#f8f9fa] px-[18px] pb-4 lg:hidden">
                <button
                    className="flex h-10 w-10 cursor-pointer items-center justify-center border-0 bg-transparent text-[#4d5563]"
                    onClick={() => router.back()}
                    aria-label="Back"
                >
                    <ChevronLeft size={24} />
                </button>
                <h1 className="m-0 text-center text-[17px] font-extrabold leading-none">Password Recovery</h1>
                <span />
            </header>

            <section className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center px-6 pb-10 pt-[34px] lg:min-h-[calc(100dvh-76px)] lg:max-w-[520px] lg:px-8 lg:py-12">
                <div className="lg:overflow-hidden lg:rounded-[22px] lg:border lg:border-[#dbe4e7] lg:bg-white lg:shadow-[0_22px_55px_rgba(15,23,42,0.12)]">
                    <div className="relative lg:px-9 lg:pb-12 lg:pt-10">
                        <button
                            type="button"
                            onClick={() => router.push("/auth/sign-in")}
                            className="absolute left-6 top-6 hidden size-10 items-center justify-center rounded-full border border-[#e3e8ee] bg-white text-[#4f586b] shadow-sm transition hover:bg-[#f5f7f9] lg:flex"
                            aria-label="Back"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="hidden justify-center lg:flex">
                            <div className="grid size-13 place-items-center rounded-full bg-[#eef8f8] text-[#44a8a8]">
                                <KeyRound size={24} />
                            </div>
                        </div>

                        <div className="mb-[22px] text-center lg:mt-7">
                            <h2 className="m-0 text-[2.65rem] font-extrabold leading-[1.15] lg:text-[28px]">
                                Forgot Your Password?
                            </h2>
                            <p className="mt-4 leading-[1.45] text-[#4f586b] lg:mx-auto lg:max-w-[360px] lg:text-[17px]">
                                Enter your email address below and we&apos;ll send you a link to reset your password securely.
                            </p>
                        </div>

                        <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
                            <label htmlFor="email" className="sr-only">
                                Email
                            </label>
                            <div className="relative">
                                <input
                                    className={inputClass}
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    placeholder="yourname@example.com"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                />
                                <span
                                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5c6474]"
                                    aria-hidden="true"
                                >
                                    <Mail size={18} />
                                </span>
                            </div>

                            {errorMessage ? <p className="m-0 text-[0.92rem] text-danger">{errorMessage}</p> : null}
                            {message ? <p className="m-0 text-[0.92rem] text-success">{message}</p> : null}

                            <button
                                className="mt-0.5 h-[54px] cursor-pointer rounded-[11px] border-0 bg-brand text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:bg-brand-disabled"
                                type="submit"
                                disabled={loading}
                            >
                                {loading ? "Sending..." : "Send Reset Link"}
                            </button>
                        </form>
                    </div>

                    <div className="hidden border-t border-[#dbe4e7] bg-[#f8fafb] px-9 py-7 lg:flex lg:gap-4">
                        <ShieldCheck size={22} className="mt-1 shrink-0 text-[#4f586b]" />
                        <p className="m-0 text-[14px] leading-[1.55] text-[#4f586b]">
                            For your security, we will only send a reset link if an account exists for the email provided.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}