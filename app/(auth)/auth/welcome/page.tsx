"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const ctaPrimary =
    "grid h-[54px] w-full place-items-center rounded-[11px] border-0 bg-brand text-[15px] font-bold text-white";
const ctaOutline =
    "grid h-[54px] w-full place-items-center rounded-[11px] border border-[#eb9292] bg-transparent text-[15px] font-bold text-[#e07d7d]";

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
            <section className="mx-auto flex min-h-[calc(100dvh-76px)] w-full max-w-[390px] flex-col justify-center gap-5 px-6 pb-10 pt-6 text-center">
                <div className="grid place-items-center gap-[18px]">
                    <div
                        className="grid size-23 place-items-center rounded-[20px] bg-[#57adaa] text-[40px] font-bold text-white"
                        aria-hidden="true"
                    >
                        <HeartPulse size={42} strokeWidth={2.4} />
                    </div>
                    <h2 className="m-0 text-[42px] font-extrabold leading-[1.08]">Welcome to Postpartum Pathways</h2>
                    <p className="m-0 text-[1.05rem] leading-[1.45] text-[#4f586b]">
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
                    <div className="flex flex-col gap-3.5">
                        <button className={ctaPrimary} type="button" onClick={() => router.push("/auth/select-role")}>
                            Continue
                        </button>
                        <button className={ctaOutline} type="button" onClick={() => setShowSignOutModal(true)}>
                            Sign Out
                        </button>
                    </div>
                )}
            </section>

            {showSignOutModal ? (
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
                                className="h-[54px] rounded-[11px] border border-[#cfd5dc] bg-white text-[15px] font-bold text-[#232833]"
                                onClick={() => setShowSignOutModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </main>
    );
}