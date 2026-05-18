"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Heart, HeartHandshake, Stethoscope } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Role = "mother" | "family_member_caregiver" | "healthcare_professional";

const roleOptions: Array<{ label: string; value: Role; description: string; icon: ReactNode }> = [
    {
        label: "Mother",
        value: "mother",
        description: "Let's set up your profile to personalize your postpartum recovery journey.",
        icon: <Heart size={16} />,
    },
    {
        label: "Caregiver",
        value: "family_member_caregiver",
        description: "Support your loved one and receive guided care plans together.",
        icon: <HeartHandshake size={16} />,
    },
    {
        label: "Healthcare Professional",
        value: "healthcare_professional",
        description: "Join our network and support mothers with clinical guidance.",
        icon: <Stethoscope size={16} />,
    },
];

const roleRouteMap: Record<Role, string> = {
    mother: "/auth/register/mother",
    family_member_caregiver: "/auth/register/caregiver",
    healthcare_professional: "/auth/register/professional",
};

export default function SelectRolePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    useEffect(() => {
        let active = true;

        supabase.auth.getUser().then(({ data }) => {
            if (active && !data.user) {
                router.replace("/auth/sign-in");
            }
        });

        return () => {
            active = false;
        };
    }, [router]);

    const handleContinue = async () => {
        if (!selectedRole) {
            setErrorMessage("Please select a role to continue.");
            return;
        }

        setLoading(true);
        setErrorMessage("");

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            setLoading(false);
            setErrorMessage("Please sign in again.");
            router.replace("/auth/sign-in");
            return;
        }

        const { error } = await supabase
            .from("app_users")
            .update({
                role: selectedRole,
                onboarding_completed: false,
            })
            .eq("user_id", user.id);

        setLoading(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        router.push(roleRouteMap[selectedRole]);
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
                <h1 className="m-0 text-center text-[17px] font-extrabold leading-none lg:text-[28px] lg:font-black lg:tracking-[-0.02em]">Select Your Role</h1>
                <span />
            </header>
            <section className="mx-auto w-full max-w-[390px] px-6 pb-10 pt-[54px] lg:max-w-[980px] lg:px-8 lg:pt-[72px]">
                <div className="mb-3 mt-0 lg:mb-14 lg:text-center">
                    <h2 className="m-0 text-[2rem] font-extrabold leading-[1.12] lg:text-[44px]">Welcome to the Postpartum Care</h2>
                    <p className="mt-2.5 text-[1.12rem] leading-normal text-muted lg:mx-auto lg:mt-5 lg:max-w-[620px] lg:text-[20px]">Choose your role so we can personalize your onboarding flow.</p>
                </div>
                <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-3 lg:gap-8">
                    {roleOptions.map((role) => {
                        const active = selectedRole === role.value;
                        return (
                            <button
                                key={role.value}
                                className={`w-full cursor-pointer rounded-2xl border-2 bg-[#f8f9fa] px-3.5 py-3.5 text-left shadow-[0_2px_7px_rgba(23,35,45,0.12)] lg:min-h-[230px] lg:px-8 lg:py-10 lg:text-center lg:shadow-[0_4px_12px_rgba(23,35,45,0.12)] ${active ? "border-brand bg-[#eef8f8]" : "border-[#d7dde3]"
                                    }`}
                                onClick={() => setSelectedRole(role.value)}
                                type="button"
                            >
                                <div className="grid grid-cols-[32px_1fr] items-center gap-2.5 lg:flex lg:flex-col lg:gap-5">
                                    <span className="grid size-7 place-items-center rounded-full border-2 border-[#47a4a1] text-sm font-bold text-[#47a4a1]  lg:size-20 lg:border-[3px] lg:border-[#d7eceb] lg:bg-[#f8fafb] lg:[&>svg]:size-9">
                                        {role.icon}
                                    </span>
                                    <div>
                                        <h3 className="m-0 mb-0.5 text-[15px] font-bold lg:text-[21px]">{role.label}</h3>
                                        <p className="m-0 mt-1.5 text-[13px] leading-snug text-[#505b6f] lg:mt-4 lg:text-center lg:text-[16px] lg:leading-relaxed">{role.description}</p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {errorMessage ? <p className="mt-2.5 text-[0.92rem] text-danger">{errorMessage}</p> : null}

                <button
                    className="mt-[18px] h-[54px] w-full cursor-pointer rounded-[11px] border-0 bg-brand text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:bg-brand-disabled disabled:text-[#d9f3f3]"
                    onClick={handleContinue}
                    disabled={!selectedRole || loading}
                >
                    {loading ? "Saving role..." : "Continue"}
                </button>
            </section>
        </main>
    );
}
