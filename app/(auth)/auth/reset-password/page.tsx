"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const inputClass =
    "w-full rounded-[11px] border border-line bg-[#f7f9fa] px-3.5 py-4 pr-[58px] text-sm text-[#4f586b] lg:py-2.5";

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
    const hasMinLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const ruleClass = (valid: boolean) =>
        `flex items-center gap-2 text-sm ${valid ? "text-[#2f9e44]" : "text-[#6b7280]"
        }`;

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
                <h1 className="m-0 text-center text-[17px] font-extrabold leading-none">Set New Password</h1>
                <span />
            </header>

            <section className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center px-6 pb-10 pt-6 lg:min-h-[calc(100dvh-76px)] lg:max-w-[980px] lg:px-8 lg:py-12">
                <div className="lg:grid lg:min-h-[560px] lg:grid-cols-2 lg:overflow-hidden lg:rounded-[18px] lg:border lg:border-[#dbe4e7] lg:bg-white lg:shadow-[0_22px_55px_rgba(15,23,42,0.13)]">
                    <div className="flex flex-col justify-center lg:px-16 lg:py-14">
                        <div className="hidden lg:mb-8 lg:flex">
                            <div className="grid size-13 place-items-center rounded-full bg-[#e8f6f5] text-[#44a8a8]">
                                <LockKeyhole size={24} />
                            </div>
                        </div>

                        <div className="my-5 mb-6 lg:my-0 lg:mb-9">
                            <h2 className="m-0 text-[32px] font-extrabold leading-[1.12] lg:text-[28px]">
                                Create a New Password
                            </h2>
                            <p className="mt-3 hidden text-[15px] leading-[1.5] text-[#5a6479] lg:block">
                                Your new password must be different from previous used passwords to keep your account secure.
                            </p>
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
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
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
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <div className="mt-1 lg:hidden">
                                <p className="m-0 text-[0.95rem] text-[#5a6479]">
                                    Password Strength: <strong>{strength}</strong>
                                </p>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e6eaef]">
                                    <div className={`h-full rounded-full transition-all ${strengthWidth} ${strengthBg}`} />
                                </div>
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
                    </div>

                    <aside className="hidden bg-[#f1f8f8] px-10 py-14 lg:flex lg:items-center">
                        <div className="w-full rounded-[22px] border border-[#d9e8e8] bg-white/60 p-8 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
                            <p className="m-0 text-sm font-bold text-[#1f2430]">Password Strength</p>

                            <p className="mt-2 text-[0.95rem] text-[#5a6479]">
                                Current strength: <strong>{strength}</strong>
                            </p>

                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e6eaef]">
                                <div className={`h-full rounded-full transition-all ${strengthWidth} ${strengthBg}`} />
                            </div>

                            <div className="mt-6 grid gap-3">
                                <div className={ruleClass(hasMinLength)}>
                                    <span
                                        className={`size-4 rounded-full border ${hasMinLength ? "border-[#2f9e44] bg-[#2f9e44]" : "border-[#cbd5e1]"
                                            }`}
                                    />
                                    At least 8 characters
                                </div>

                                <div className={ruleClass(hasUpper)}>
                                    <span
                                        className={`size-4 rounded-full border ${hasUpper ? "border-[#2f9e44] bg-[#2f9e44]" : "border-[#cbd5e1]"
                                            }`}
                                    />
                                    Includes an uppercase letter
                                </div>

                                <div className={ruleClass(hasNumber)}>
                                    <span
                                        className={`size-4 rounded-full border ${hasNumber ? "border-[#2f9e44] bg-[#2f9e44]" : "border-[#cbd5e1]"
                                            }`}
                                    />
                                    Includes a number
                                </div>

                                <div className={ruleClass(hasSpecial)}>
                                    <span
                                        className={`size-4 rounded-full border ${hasSpecial ? "border-[#2f9e44] bg-[#2f9e44]" : "border-[#cbd5e1]"
                                            }`}
                                    />
                                    Includes a special character
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    );
}