"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type SignOutButtonProps = {
    className?: string;
    style?: CSSProperties;
};

const defaultClassName =
    "cursor-pointer justify-self-end border-0 bg-transparent text-[13px] font-bold text-[#44a8a8]";

export default function SignOutButton({ className, style }: SignOutButtonProps) {
    const router = useRouter();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.replace("/auth/sign-in");
    };

    return (
        <button className={className ?? defaultClassName} style={style} type="button" onClick={handleSignOut}>
            Sign out
        </button>
    );
}