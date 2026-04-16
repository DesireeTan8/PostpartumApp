import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const nextPath = requestUrl.searchParams.get("next") ?? "/auth/select-role";
    const redirectUrl = new URL(nextPath, requestUrl.origin);

    requestUrl.searchParams.forEach((value, key) => {
        if (key !== "next") {
            redirectUrl.searchParams.set(key, value);
        }
    });

    return NextResponse.redirect(redirectUrl);
}