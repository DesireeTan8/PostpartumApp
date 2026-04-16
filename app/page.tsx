"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HeartPulse } from "lucide-react";

export default function SplashScreenPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace("/auth/welcome");
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center gap-2.5 bg-canvas">
      <div
        className="grid size-23 place-items-center rounded-[20px] bg-[#4ea8a7] text-[40px] font-bold text-white"
        aria-hidden="true"
      >
        <HeartPulse size={42} strokeWidth={2.4} />
      </div>
      <h1 className="m-0 mt-3 text-[17px] font-extrabold">
        Postpartum Pathways
      </h1>
      <p className="m-0 mt-0.5 text-xs text-[#2f3442]">
        Supporting Your Postpartum Recovery
      </p>
      <span
        className="pointer-events-none absolute bottom-3.5 left-1/2 h-1 w-24.5 -translate-x-1/2 rounded-full bg-[rgba(26,30,38,0.65)]"
        aria-hidden
      />
    </main>
  );
}