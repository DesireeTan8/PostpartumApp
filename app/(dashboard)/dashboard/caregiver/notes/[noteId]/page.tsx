"use client";

import { use } from "react";
import { CaregiverNoteDetail } from "@/components/dashboard/caregiver/caregiver-note-detail";

export default function Page({ params }: { params: Promise<{ noteId: string }> }) {
    const { noteId } = use(params);
    return <CaregiverNoteDetail noteId={noteId} />;
}