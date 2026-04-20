import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

export async function getBearerUserId(request: Request): Promise<{ userId: string } | { error: string; status: number }> {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) {
        return { error: "Missing authorization", status: 401 };
    }
    const jwt = header.slice(7).trim();
    if (!jwt || !supabaseUrl || !supabaseKey) {
        return { error: "Server misconfigured", status: 500 };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(jwt);

    if (error || !user) {
        return { error: "Invalid or expired session", status: 401 };
    }

    return { userId: user.id };
}