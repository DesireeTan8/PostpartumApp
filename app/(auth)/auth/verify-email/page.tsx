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
            <header className="grid h-[100px] grid-cols-[40px_1fr_40px] items-end border-b border-[#d5dbe2] bg-[#f8f9fa] px-[18px] pb-4">
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
            <section className="mx-auto w-full max-w-[390px] px-6 pb-10 pt-[140px] text-center">
                <h2 className="m-0 text-[2.2rem] font-extrabold">Verification Email Sent!</h2>
                <p className="mt-4 text-[#4f586b] leading-[1.42]">
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
            </section>
        </main>
    );
}