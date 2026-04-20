"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarHeart, Camera, Shield, User } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { MotherDashboardShell } from "@/components/layout/mother-dashboard-shell";
import { MotherPushNotificationsCard } from "@/components/dashboard/mother/mother-push-notifications-card";
import SignOutButton from "@/components/auth/sign-out-button";

function recoveryDay(deliveryDate: string | null | undefined): number | null {
    if (!deliveryDate) return null;
    const d = new Date(`${deliveryDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    const ms = Date.now() - d.getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function formatBirthType(t: string | null | undefined) {
    if (t === "vaginal") return "Normal (vaginal)";
    if (t === "c_section") return "C-section";
    return "—";
}

function formatDate(d: string | null | undefined) {
    if (!d) return "—";
    try {
        return new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    } catch {
        return d;
    }
}

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

type MotherRow = {
    phone_number: string | null;
    delivery_date: string | null;
    birth_type: string | null;
    primary_care_provider_id: string | null;
};

const AVATAR_BUCKET = "avatars";

function fileExtension(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return ext && ext.length <= 8 ? ext : "jpg";
}

const cardClass =
    "mb-3.5 rounded-2xl border border-[#c9e4dc] bg-white px-4 pb-[18px] pt-4 shadow-[0_4px_16px_rgba(40,90,80,0.06)]";
const cardTitleClass = "m-0 mb-3 flex items-center gap-2 text-[0.95rem] font-extrabold text-[#2a6b66]";
const fieldClass = "mb-3 flex flex-col gap-0.5 last:mb-0";
const fieldLabelClass = "text-[11px] font-bold uppercase tracking-wide text-[#6b8a84]";
const fieldValueClass = "text-[15px] font-semibold text-ink";

export default function MotherProfilePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [profile, setProfile] = useState<ProfileRow | null>(null);
    const [mother, setMother] = useState<MotherRow | null>(null);
    const [pcpDisplayName, setPcpDisplayName] = useState<string | null>(null);

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
            setCurrentUserId(user.id);

            const { data: p } = await supabase
                .from("profiles")
                .select("full_name, email, bio, avatar_url")
                .eq("user_id", user.id)
                .maybeSingle();

            const { data: m } = await supabase
                .from("mother_profiles")
                .select("phone_number, delivery_date, birth_type, primary_care_provider_id")
                .eq("user_id", user.id)
                .maybeSingle();

            let pcpName: string | null = null;
            if (m?.primary_care_provider_id) {
                const { data: hcp } = await supabase
                    .from("healthcare_professional_profiles")
                    .select("profiles(full_name)")
                    .eq("user_id", m.primary_care_provider_id)
                    .maybeSingle();
                const nested = hcp as { profiles?: { full_name?: string | null } | null } | null;
                pcpName = nested?.profiles?.full_name?.trim() || null;
            }

            if (!active) return;
            setProfile(p as ProfileRow | null);
            setMother(m as MotherRow | null);
            setPcpDisplayName(pcpName);
            setLoading(false);
        })();

        return () => {
            active = false;
        };
    }, [router]);

    const day = recoveryDay(mother?.delivery_date ?? null);
    const milestone =
        day !== null && day >= 42
            ? "You've reached your 6-week milestone! Time to schedule your postpartum follow-up."
            : null;

    const onAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!currentUserId) {
            setAvatarError("You need to be signed in to upload an avatar.");
            return;
        }
        if (!file.type.startsWith("image/")) {
            setAvatarError("Please select an image file.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setAvatarError("Please select an image smaller than 5MB.");
            return;
        }

        setUploadingAvatar(true);
        setAvatarError(null);
        const ext = fileExtension(file.name);
        const path = `${currentUserId}/avatar-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .upload(path, file, {
                upsert: true,
                cacheControl: "3600",
                contentType: file.type,
            });

        if (uploadError) {
            setUploadingAvatar(false);
            setAvatarError(uploadError.message);
            return;
        }

        const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
        const avatarUrl = publicUrlData.publicUrl;
        const { error: updateError } = await supabase
            .from("profiles")
            .update({ avatar_url: avatarUrl })
            .eq("user_id", currentUserId);

        setUploadingAvatar(false);
        if (updateError) {
            setAvatarError(updateError.message);
            return;
        }
        setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
        window.dispatchEvent(
            new CustomEvent("profile-avatar-updated", {
                detail: { avatarUrl },
            }),
        );
    };

    const avatarImgClass =
        "size-[88px] rounded-full border-[3px] border-white object-cover shadow-[0_6px_20px_rgba(46,125,120,0.25)]";

    return (
        <MotherDashboardShell>
            <div className="pb-6 lg:mx-auto lg:max-w-[520px]">
                <h1 className="mb-5 text-[1.35rem] font-extrabold">Profile</h1>
                {loading ? (
                    <p className="mt-8 text-center text-sm text-[#4f586b]">Loading profile…</p>
                ) : (
                    <>
                        <div className="mb-[22px] text-center">
                            <div className="relative mx-auto mb-3 w-[88px]">
                                {profile?.avatar_url ? (
                                    <img className={avatarImgClass} src={profile.avatar_url} alt="" width={88} height={88} />
                                ) : (
                                    <div
                                        className={`${avatarImgClass} mx-auto grid place-items-center bg-gradient-to-br from-[#b8e0dd] to-brand text-[2rem] font-extrabold text-white`}
                                        aria-hidden
                                    >
                                        {initials(profile?.full_name)}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    className="absolute -bottom-0.5 -right-0.5 inline-flex size-[30px] cursor-pointer items-center justify-center rounded-full border-0 bg-brand text-white shadow-[0_4px_14px_rgba(46,125,120,0.35)] disabled:cursor-progress disabled:opacity-65"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingAvatar}
                                    aria-label="Upload profile photo"
                                >
                                    <Camera size={15} />
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={onAvatarFileChange}
                                />
                            </div>
                            <p className="mb-2 text-[0.8rem] text-muted">
                                {uploadingAvatar ? "Uploading photo…" : "Tap the camera icon to upload a new avatar."}
                            </p>
                            {avatarError ? <p className="mb-2.5 text-[0.8rem] text-[#b23d3d]">{avatarError}</p> : null}
                            <h2 className="m-0 text-[1.35rem] font-extrabold">{profile?.full_name?.trim() || "Your profile"}</h2>
                            {day !== null ? (
                                <span className="mt-2 inline-flex items-center rounded-full border border-[#b8dcd6] bg-white px-3 py-1.5 text-xs font-bold text-[#2f7d78]">
                                    Recovery day {day}
                                </span>
                            ) : null}
                            {profile?.bio?.trim() ? (
                                <p className="mx-auto mt-2.5 max-w-[320px] text-[0.92rem] leading-snug text-muted">{profile.bio.trim()}</p>
                            ) : null}
                        </div>

                        <section className={cardClass}>
                            <h3 className={cardTitleClass}>
                                <User size={18} /> Personal information
                            </h3>
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
                                <span className={fieldValueClass}>{mother?.phone_number?.trim() || "—"}</span>
                            </div>
                            <Link
                                href="/auth/register/mother"
                                className="mt-1 inline-block text-sm font-bold text-[#44a8a8] underline underline-offset-2"
                            >
                                Edit personal details
                            </Link>
                        </section>

                        <section className={cardClass}>
                            <h3 className={cardTitleClass}>
                                <CalendarHeart size={18} /> Postpartum journey
                            </h3>
                            <div className={fieldClass}>
                                <span className={fieldLabelClass}>Delivery date</span>
                                <span className={fieldValueClass}>{formatDate(mother?.delivery_date)}</span>
                            </div>
                            <div className={fieldClass}>
                                <span className={fieldLabelClass}>Birth type</span>
                                <span className={fieldValueClass}>{formatBirthType(mother?.birth_type)}</span>
                            </div>
                            <div className={fieldClass}>
                                <span className={fieldLabelClass}>Primary care provider</span>
                                <span className={fieldValueClass}>{pcpDisplayName || "—"}</span>
                            </div>
                        </section>

                        {milestone ? (
                            <div className="mb-3.5 rounded-2xl border border-[#9dd5cf] bg-gradient-to-br from-[#e8faf8] to-[#d4f2ee] px-4 py-3.5 text-[0.92rem] font-semibold leading-snug text-[#1f4a46]">
                                {milestone}
                            </div>
                        ) : null}

                        <MotherPushNotificationsCard />

                        <section className={cardClass}>
                            <h3 className={cardTitleClass}>
                                <Shield size={18} /> Account security
                            </h3>
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
        </MotherDashboardShell>
    );
}
