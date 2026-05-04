import { supabase } from "@/lib/supabase/client";

export async function markCareRequestInReview(requestId: string) {
    return supabase.rpc("professional_update_care_request", {
        p_request_id: requestId,
        p_status: "in_review",
        p_event_label: "Clinical Review",
        p_event_note: "Our team is actively reviewing this request and provider availability.",
    });
}

export async function declineCareRequest(requestId: string, reason?: string) {
    return supabase.rpc("professional_update_care_request", {
        p_request_id: requestId,
        p_status: "cancelled",
        p_event_label: "Request declined",
        p_event_note: reason?.trim() || "This request was declined by the care team.",
    });
}

export async function markCareRequestCompleted(requestId: string) {
    return supabase.rpc("professional_update_care_request", {
        p_request_id: requestId,
        p_status: "completed",
        p_event_label: "Request completed",
        p_event_note: "This care request has been closed.",
    });
}

export async function scheduleAppointmentFromRequest(params: {
    requestId: string;
    startsAt: string;
    endsAt: string;
    locationType: "clinic" | "home" | "virtual";
    locationDetail?: string | null;
}) {
    return supabase.rpc("professional_create_appointment_from_request", {
        p_request_id: params.requestId,
        p_starts_at: params.startsAt,
        p_ends_at: params.endsAt,
        p_location_type: params.locationType,
        p_location_detail: params.locationDetail ?? null,
    });
}