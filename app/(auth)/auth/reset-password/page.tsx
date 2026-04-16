"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const inputClass =
    "w-full rounded-[11px] border border-line bg-[#f7f9fa] px-3.5 py-4 pr-[58px] text-sm text-[#4f586b]";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrorMessage("");
        setSuccessMessage("");

        if (password !== confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccessMessage("Password reset complete. Redirecting to sign in...");
        window.setTimeout(() => {
            router.replace("/auth/sign-in");
        }, 1100);
    };

    const getPasswordStrength = () => {
        if (password.length < 8) return "Weak";
        if (password.length < 12) return "Medium";
        return "Strong";
    };

    const strength = getPasswordStrength();
    const strengthWidth = strength === "Weak" ? "w-1/4" : strength === "Medium" ? "w-[55%]" : "w-full";
    const strengthBg =
        strength === "Weak" ? "bg-[#db4d4d]" : strength === "Medium" ? "bg-[#d2ad33]" : "bg-[#2f9970]";

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
                <h1 className="m-0 text-center text-[17px] font-extrabold leading-none">Set New Password</h1>
                <span />
            </header>

            <section className="mx-auto w-full max-w-[390px] px-6 pb-10 pt-6">
                <div className="my-5 mb-6">
                    <h2 className="m-0 text-[32px] font-extrabold leading-[1.12]">Create a New Password</h2>
                </div>

                <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
                    <label htmlFor="password" className="text-base font-semibold text-[#4e5769]">
                        New Password
                    </label>
                    <div className="relative">
                        <input
                            className={inputClass}
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            minLength={8}
                            required
                            placeholder="Enter your new password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                        />
                        <button
                            className="absolute right-3.5 top-1/2 size-[30px] -translate-y-1/2 cursor-pointer border-0 bg-transparent text-[0] text-[#5c6474]"
                            type="button"
                            onClick={() => setShowPassword((current) => !current)}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    <p className="m-0 mt-1 text-[0.95rem] text-[#5a6479]">
                        Password Strength: <strong>{strength}</strong>
                    </p>
                    <div className="-mt-2 h-2 overflow-hidden rounded-full bg-[#e6eaef]">
                        <div className={`h-full rounded-full transition-all ${strengthWidth} ${strengthBg}`} />
                    </div>

                    <label htmlFor="confirmPassword" className="text-base font-semibold text-[#4e5769]">
                        Confirm New Password
                    </label>
                    <div className="relative">
                        <input
                            className={inputClass}
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            minLength={8}
                            required
                            placeholder="Confirm your new password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                        />
                        <button
                            className="absolute right-3.5 top-1/2 size-[30px] -translate-y-1/2 cursor-pointer border-0 bg-transparent text-[0] text-[#5c6474]"
                            type="button"
                            onClick={() => setShowConfirmPassword((current) => !current)}
                        >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {errorMessage ? <p className="m-0 text-[0.92rem] text-danger">{errorMessage}</p> : null}
                    {successMessage ? <p className="m-0 text-[0.92rem] text-success">{successMessage}</p> : null}

                    <button
                        className="mt-2.5 h-[54px] cursor-pointer rounded-[11px] border-0 bg-brand text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:bg-brand-disabled"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Confirm Reset"}
                    </button>
                </form>
            </section>
        </main>
    );
}