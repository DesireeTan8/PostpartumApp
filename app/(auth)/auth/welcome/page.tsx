"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const ctaPrimary =
    "grid h-[54px] w-full place-items-center rounded-[11px] border-0 bg-brand text-[14px] font-bold text-white";
const ctaOutline =
    "grid h-[54px] w-full place-items-center rounded-[11px] border border-[#eb9292] bg-transparent text-[14px] font-bold text-[#e07d7d]";

export default function WelcomePage() {
    const router = useRouter();
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [showSignOutModal, setShowSignOutModal] = useState(false);

    useEffect(() => {
        let active = true;

        supabase.auth.getUser().then(({ data }) => {
            if (active) {
                setIsSignedIn(Boolean(data.user));
            }
        });

        return () => {
            active = false;
        };
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setShowSignOutModal(false);
        setIsSignedIn(false);
        router.refresh();
    };

    return (
        <main className="flex min-h-dvh w-full flex-col bg-canvas">
            <section className="mx-auto flex min-h-[calc(100dvh-76px)] w-full max-w-[390px] flex-col justify-center gap-5 px-6 pb-10 pt-6 text-center lg:rounded-[32px] lg:bg-white lg:px-10 my-auto lg:max-w-[500px]">
                <div className="grid place-items-center gap-[18px]">
                    <div
                        className="grid size-23 place-items-center rounded-[20px] bg-[#57adaa] text-[40px] font-bold text-white lg:size-[104px] lg:rounded-[18px] lg:shadow-[0_16px_34px_rgba(87,173,170,0.22)]"
                        aria-hidden="true"
                    >
                        <HeartPulse size={42} strokeWidth={2.4} className="lg:size-[56px]" />
                    </div>
                    <h2 className="m-0 text-[28px] font-extrabold leading-[1.08] lg:text-[30px] lg:leading-[1.05]">Welcome to <br />Postpartum Pathways</h2>
                    <p className="m-0 text-[1.05rem] leading-[1.45] text-[#4f586b] lg:mx-auto lg:max-w-[560px] lg:text-[16px] lg:leading-[1.55]">
                        Supporting mothers, caregivers, and healthcare professionals through the postpartum journey with trusted
                        resources and personalized guidance.
                    </p>
                </div>

                {!isSignedIn ? (
                    <div className="flex flex-col gap-3.5">
                        <Link className={ctaPrimary} href="/auth/sign-in">
                            Sign In
                        </Link>
                        <Link className={ctaOutline} href="/auth/sign-up">
                            Create New Account
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3.5 lg:mx-auto lg:grid lg:w-full lg:max-w-[420px] lg:grid-cols-2 lg:gap-4">
                        <button className={ctaPrimary} type="button" onClick={() => router.push("/auth/select-role")}>
                            Continue
                        </button>
                        <button className={ctaOutline} type="button" onClick={() => setShowSignOutModal(true)}>
                            Sign Out
                        </button>
                    </div>
                )}
            </section>

            {
                showSignOutModal ? (
                    <div
                        className="fixed inset-0 z-50 grid place-items-center bg-[rgba(27,30,35,0.8)] p-5"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Sign out"
                    >
                        <div className="w-full max-w-[390px] rounded-[10px] bg-white px-6 py-6 text-center">
                            <h3 className="m-0 text-[1.75rem] font-bold">Sign Out</h3>
                            <p className="my-3.5 mb-5 text-[1.02rem] text-[#4e576a]">Are you sure you want to sign out?</p>
                            <div className="flex flex-col gap-3">
                                <button className={ctaPrimary} onClick={handleSignOut}>
                                    Confirm Sign Out
                                </button>
                                <button
                                    className="h-[54px] rounded-[11px] border border-[#cfd5dc] bg-white text-[14px] font-bold text-[#232833]"
                                    onClick={() => setShowSignOutModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null
            }
        </main >
    );
}