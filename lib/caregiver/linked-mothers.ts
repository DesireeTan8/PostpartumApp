import type { SupabaseClient } from "@supabase/supabase-js";

export type LinkedMother = {
    motherUserId: string;
    displayName: string;
    avatarUrl: string | null;
    deliveryDate: string | null;
    phone: string | null;
    dateOfBirth: string | null;
    gender: string | null;
};

function unwrapProfile(
    profiles: { full_name: string | null; avatar_url: string | null } | { full_name: string | null; avatar_url: string | null }[] | null
) {
    if (!profiles) return null;
    if (Array.isArray(profiles)) return profiles[0] ?? null;
    return profiles;
}

export function postpartumDayLabel(deliveryDate: string | null): string | null {
    if (!deliveryDate) return null;
    const start = new Date(`${deliveryDate}T12:00:00`);
    if (Number.isNaN(start.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const day = Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1);
    return `Postpartum day ${day}`;
}

export function postpartumWeekLabel(deliveryDate: string | null): string | null {
    if (!deliveryDate) return null;
    const start = new Date(`${deliveryDate}T12:00:00`);
    if (Number.isNaN(start.getTime())) return null;
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const week = Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1);
    return `Postpartum week ${week}`;
}

export async function fetchLinkedMothers(client: SupabaseClient): Promise<{
    selfUserId: string | null;
    mothers: LinkedMother[];
}> {
    const {
        data: { user },
    } = await client.auth.getUser();
    if (!user) return { selfUserId: null, mothers: [] };

    const motherIds = new Set<string>();

    const { data: cg } = await client
        .from("caregiver_profiles")
        .select("supported_mother_user_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (cg?.supported_mother_user_id) motherIds.add(cg.supported_mother_user_id);

    const { data: team } = await client
        .from("care_team_members")
        .select("mother_user_id")
        .eq("member_user_id", user.id)
        .eq("status", "active");

    for (const row of team ?? []) motherIds.add(row.mother_user_id);

    const ids = [...motherIds];
    if (ids.length === 0) return { selfUserId: user.id, mothers: [] };

    let rows: unknown[] | null = null;
    const full = await client
        .from("mother_profiles")
        .select("user_id, delivery_date, phone_number, date_of_birth, gender, profiles(full_name, avatar_url)")
        .in("user_id", ids);
    if (full.error) {
        const minimal = await client
            .from("mother_profiles")
            .select("user_id, delivery_date, phone_number, profiles(full_name, avatar_url)")
            .in("user_id", ids);
        rows = minimal.data ?? [];
    } else {
        rows = full.data ?? [];
    }

    type Row = {
        user_id: string;
        delivery_date: string | null;
        phone_number: string | null;
        date_of_birth: string | null;
        gender: string | null;
        profiles: { full_name: string | null; avatar_url: string | null } | { full_name: string | null; avatar_url: string | null }[] | null;
    };

    const mothers: LinkedMother[] = ((rows ?? []) as Row[]).map((r) => {
        const p = unwrapProfile(r.profiles);
        return {
            motherUserId: r.user_id,
            displayName: p?.full_name?.trim() || "Mother",
            avatarUrl: p?.avatar_url ?? null,
            deliveryDate: r.delivery_date,
            phone: r.phone_number ?? null,
            dateOfBirth: r.date_of_birth ?? null,
            gender: r.gender ?? null,
        };
    });

    mothers.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return { selfUserId: user.id, mothers };
}