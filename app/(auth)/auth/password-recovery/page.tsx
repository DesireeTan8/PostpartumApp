"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const inputClass =
    "w-full rounded-[11px] border border-line bg-[#f7f9fa] py-4 pl-3.5 pr-[58px] text-sm text-[#4f586b]";

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
            <header className="grid h-[100px] grid-cols-[40px_1fr_40px] items-end border-b border-[#d5dbe2] bg-[#f8f9fa] px-[18px] pb-4">
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

            <section className="mx-auto w-full max-w-[390px] px-6 pb-10 pt-[34px]">
                <div className="mb-[22px] text-center">
                    <h2 className="m-0 text-[2.65rem] font-extrabold leading-[1.15]">Forgot Your Password?</h2>
                    <p className="mt-4 text-[#4f586b] leading-[1.45]">
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
                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5c6474]" aria-hidden="true">
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
            </section>
        </main>
    );
}