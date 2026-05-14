"use client";

import { use } from "react";
import { CaregiverMotherDetail } from "@/components/dashboard/caregiver/caregiver-mother-detail";

export default function Page({ params }: { params: Promise<{ motherId: string }> }) {
    const { motherId } = use(params);
    return <CaregiverMotherDetail motherUserId={motherId} />;
}