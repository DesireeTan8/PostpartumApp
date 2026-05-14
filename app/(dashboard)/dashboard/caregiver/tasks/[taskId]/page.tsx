"use client";

import { use } from "react";
import { CaregiverTaskDetail } from "@/components/dashboard/caregiver/caregiver-task-detail";

export default function Page({ params }: { params: Promise<{ taskId: string }> }) {
    const { taskId } = use(params);
    return <CaregiverTaskDetail taskId={taskId} />;
}