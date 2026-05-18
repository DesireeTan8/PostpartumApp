"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
    const router = useRouter();
    const [email] = useState(() =>
        typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("email") ?? "",
    );
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleResend = async () => {
        if (!email) {
            setErrorMessage("Missing email address.");
            return;
        }

        setLoading(true);
        setMessage("");
        setErrorMessage("");

        const emailRedirectTo = `${window.location.origin}/auth/callback?next=/auth/select-role`;
        const { error } = await supabase.auth.resend({
            type: "signup",
            email,
            options: { emailRedirectTo },
        });

        setLoading(false);
        if (error) {
            setErrorMessage(error.message);
            return;
        }
        setMessage("Verification email resent.");
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
                <h1 className="m-0 text-center text-[17px] font-extrabold leading-none">Verify Your Email</h1>
                <span />
            </header>

            <section className="mx-auto w-full max-w-[390px] px-6 pb-10 pt-[140px] text-center lg:flex lg:min-h-[calc(100dvh-76px)] lg:max-w-[520px] lg:flex-col lg:justify-center lg:px-8 lg:py-12">
                <div className="relative lg:rounded-[22px] lg:border lg:border-[#dbe4e7] lg:bg-white lg:px-11 lg:py-12 lg:shadow-[0_22px_55px_rgba(15,23,42,0.12)]">
                    <button
                        type="button"
                        onClick={() => router.push("/auth/sign-in")}
                        className="hidden lg:flex absolute left-6 top-6 items-center justify-center rounded-full p-2 transition hover:bg-gray-100 text-[#111827]">
                        <ChevronLeft size={20} />
                    </button>

                    <div className="mb-8 hidden lg:flex justify-center">
                        <div className="relative flex h-[96px] w-[96px] items-center justify-center rounded-full bg-[#edf6f4]">

                            {/* red notification dot */}
                            <span className="absolute right-3 top-3 h-3 w-3 rounded-full" />

                            {/* mail icon */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.8}
                                stroke="currentColor"
                                className="h-11 w-11 text-[#4da6a6]"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M21.75 7.5v9A2.25 2.25 0 0119.5 18.75h-15A2.25 2.25 0 012.25 16.5v-9m19.5 0A2.25 2.25 0 0019.5 5.25h-15A2.25 2.25 0 002.25 7.5m19.5 0v.243a2.25 2.25 0 01-.97 1.852l-7.5 5a2.25 2.25 0 01-2.56 0l-7.5-5A2.25 2.25 0 012.25 7.743V7.5"
                                />
                            </svg>
                        </div>
                    </div>

                    <h2 className="m-0 text-[2.2rem] font-extrabold lg:text-[28px]">
                        Verification Email Sent!
                    </h2>

                    <p className="mt-4 leading-[1.42] text-[#4f586b] lg:text-[17px]">
                        Please check your inbox and click the link to verify your account. If you don&apos;t see it, check your spam
                        folder.
                    </p>

                    <button
                        className="mt-[22px] h-[54px] w-full cursor-pointer rounded-[11px] border-0 bg-brand text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:bg-brand-disabled"
                        onClick={handleResend}
                        disabled={loading}
                    >
                        {loading ? "Resending..." : "Resend Email"}
                    </button>

                    <Link
                        className="mt-[22px] inline-block font-semibold text-[#44a8a8] no-underline"
                        href="/auth/sign-up"
                    >
                        Change Email
                    </Link>

                    {errorMessage ? <p className="mt-3.5 text-[0.92rem] text-danger">{errorMessage}</p> : null}
                    {message ? <p className="mt-3.5 text-[0.92rem] text-success">{message}</p> : null}
                </div>
            </section>
        </main>
    );
}