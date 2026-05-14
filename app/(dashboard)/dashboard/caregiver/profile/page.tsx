"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartHandshake, User, Users } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import SignOutButton from "@/components/auth/sign-out-button";

const relationshipLabel: Record<string, string> = {
    husband: "Husband",
    partner: "Partner",
    parent: "Parent",
    sibling: "Sibling",
    friend: "Friend",
    other: "Other",
};

function initials(name: string | null | undefined) {
    if (!name?.trim()) return "?";
    const parts = name.trim().split(/\s+/);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase();
}

type ProfileRow = {
    full_name: string | null;
    email: string;
    bio: string | null;
    avatar_url: string | null;
};

type CaregiverRow = {
    phone_number: string | null;
    relationship: string;
    supported_mother_user_id: string | null;
};

const cardClass =
    "mb-3.5 rounded-2xl border border-[#c9e4dc] bg-white px-4 pb-[18px] pt-4 shadow-[0_4px_16px_rgba(40,90,80,0.06)]";
const cardTitleClass = "m-0 mb-3 flex items-center gap-2 text-[0.95rem] font-extrabold text-[#2a6b66]";
const fieldClass = "mb-3 flex flex-col gap-0.5 last:mb-0";
const fieldLabelClass = "text-[11px] font-bold uppercase tracking-wide text-[#6b8a84]";
const fieldValueClass = "text-[15px] font-semibold text-ink";

export default function CaregiverProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<ProfileRow | null>(null);
    const [caregiver, setCaregiver] = useState<CaregiverRow | null>(null);
    const [motherName, setMotherName] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!active) return;
            if (!user) {
                router.replace("/auth/sign-in");
                return;
            }

            const { data: p } = await supabase
                .from("profiles")
                .select("full_name, email, bio, avatar_url")
                .eq("user_id", user.id)
                .maybeSingle();

            const { data: c } = await supabase
                .from("caregiver_profiles")
                .select("phone_number, relationship, supported_mother_user_id")
                .eq("user_id", user.id)
                .maybeSingle();

            let supportedName: string | null = null;
            if (c?.supported_mother_user_id) {
                const { data: mp } = await supabase
                    .from("mother_profiles")
                    .select("profiles(full_name)")
                    .eq("user_id", c.supported_mother_user_id)
                    .maybeSingle();
                const nested = mp as { profiles?: { full_name?: string | null } | null } | null;
                supportedName = nested?.profiles?.full_name?.trim() || null;
            }

            if (!active) return;
            setProfile(p as ProfileRow | null);
            setCaregiver(c as CaregiverRow | null);
            setMotherName(supportedName);
            setLoading(false);
        })();

        return () => {
            active = false;
        };
    }, [router]);

    const rel = caregiver?.relationship
        ? relationshipLabel[caregiver.relationship] ?? caregiver.relationship
        : "—";

    const avatarClass =
        "mx-auto mb-3 size-[88px] rounded-full border-[3px] border-white object-cover shadow-[0_6px_20px_rgba(46,125,120,0.25)]";

    return (
        <div className="mx-auto w-full max-w-[520px] px-5 py-5 pb-7">
            {loading ? (
                <p className="mt-8 text-center text-sm text-[#4f586b]">Loading profile…</p>
            ) : (
                <>
                    <div className="mb-[22px] text-center">
                        {profile?.avatar_url ? (
                            <img className={avatarClass} src={profile.avatar_url} alt="" width={88} height={88} />
                        ) : (
                            <div
                                className={`${avatarClass} grid place-items-center bg-gradient-to-br from-[#b8e0dd] to-brand text-[2rem] font-extrabold text-white`}
                                aria-hidden
                            >
                                {initials(profile?.full_name)}
                            </div>
                        )}
                        <h1 className="m-0 text-[1.35rem] font-extrabold">{profile?.full_name?.trim() || "Your profile"}</h1>
                        <span className="mt-2 inline-flex items-center rounded-full border border-[#b8dcd6] bg-white px-3 py-1.5 text-xs font-bold text-[#2f7d78]">
                            Verified support
                        </span>
                        {profile?.bio?.trim() ? (
                            <p className="mx-auto mt-2.5 max-w-[320px] text-[0.92rem] leading-snug text-muted">{profile.bio.trim()}</p>
                        ) : null}
                    </div>

                    <section className={cardClass}>
                        <h2 className={cardTitleClass}>
                            <Users size={18} /> Your care role
                        </h2>
                        <div className={fieldClass}>
                            <span className={fieldLabelClass}>Relationship</span>
                            <span className={fieldValueClass}>{rel}</span>
                        </div>
                        <div className={fieldClass}>
                            <span className={fieldLabelClass}>Support for</span>
                            <span className={fieldValueClass}>
                                {motherName ? (
                                    <>{motherName}</>
                                ) : (
                                    <span className="font-medium text-muted">Link a mother&apos;s account when invited</span>
                                )}
                            </span>
                        </div>
                    </section>

                    <section className={cardClass}>
                        <h2 className={cardTitleClass}>
                            <User size={18} /> Personal information
                        </h2>
                        <div className={fieldClass}>
                            <span className={fieldLabelClass}>Full name</span>
                            <span className={fieldValueClass}>{profile?.full_name?.trim() || "—"}</span>
                        </div>
                        <div className={fieldClass}>
                            <span className={fieldLabelClass}>Email</span>
                            <span className={fieldValueClass}>{profile?.email ?? "—"}</span>
                        </div>
                        <div className={fieldClass}>
                            <span className={fieldLabelClass}>Phone</span>
                            <span className={fieldValueClass}>{caregiver?.phone_number?.trim() || "—"}</span>
                        </div>
                        <Link
                            href="/auth/register/caregiver"
                            className="mt-1 inline-block text-sm font-bold text-[#44a8a8] underline underline-offset-2"
                        >
                            Edit personal details
                        </Link>
                    </section>

                    <section className={cardClass}>
                        <h2 className={cardTitleClass}>
                            <HeartHandshake size={18} /> Account security
                        </h2>
                        <div className="flex flex-col gap-2.5">
                            <Link
                                href="/auth/password-recovery"
                                className="flex h-[52px] items-center justify-center rounded-[11px] border border-brand bg-transparent text-[15px] font-bold text-brand no-underline"
                            >
                                Change password
                            </Link>
                            <SignOutButton className="mt-1 h-[54px] w-full rounded-[11px] border-0 bg-brand text-[15px] font-bold text-white" />
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}