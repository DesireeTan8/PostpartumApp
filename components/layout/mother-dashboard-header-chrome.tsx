"use client";

import Link from "next/link";
import { ArrowLeft, Bell, Search, Settings } from "lucide-react";
import type { ReactNode } from "react";
import type { MotherPageHeaderConfig } from "@/components/layout/mother-dashboard-header-context";

/** Fixed 40×40 on mobile (fits 52px bar); 36×36 on lg to match previous desktop density */
export const MOTHER_DASHBOARD_HEADER_ICON_LINK =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#4d5563] no-underline hover:bg-[#edf4f5] hover:text-brand lg:h-9 lg:w-9";

const headerIconLink = MOTHER_DASHBOARD_HEADER_ICON_LINK;

const base = "/dashboard/mother";

type DefaultDiscoverChromeProps = {
  showMobileBrand: boolean;
  profileSlot: ReactNode;
  showNotifications?: boolean;
  showSettings?: boolean;
};

const headerBarMobile =
  "max-lg:h-[52px] max-lg:min-h-[52px] max-lg:max-h-[52px] max-lg:shrink-0 max-lg:overflow-hidden max-lg:py-0";

const headerIconButton =
  "inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-0 bg-transparent text-[#4d5563] hover:bg-[#eef5f5] hover:text-brand lg:h-[42px] lg:w-[42px]";

/** Brand + global search + notifications (no per-page title). */
export function MotherDefaultDiscoverChrome({
  showMobileBrand,
  profileSlot,
  showNotifications = true,
  showSettings = true,
}: DefaultDiscoverChromeProps) {
  return (
    <div
      className={`mx-auto flex max-w-[1200px] items-center justify-between gap-2 px-4 lg:min-h-14 lg:gap-3 lg:px-7 lg:py-3 ${headerBarMobile}`}
    >
      {showMobileBrand ? (
        <Link
          href={base}
          className="flex min-h-0 min-w-0 flex-1 items-center gap-2 self-center text-[0.95rem] font-extrabold leading-none text-ink no-underline lg:hidden"
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#6ec9c6] to-brand text-[1.1rem] text-white"
            aria-hidden
          >
            {"\u2661"}
          </span>
          <span className="line-clamp-1 min-w-0 leading-tight">Postpartum Pathways</span>
        </Link>
      ) : (
        <span className="w-8 shrink-0 lg:hidden" />
      )}
      <div className="relative hidden max-w-[420px] flex-1 items-center self-center lg:flex">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b96a8]" aria-hidden />
        <input
          type="search"
          className="box-border h-[42px] w-full rounded-full border border-line bg-[#f5f8f9] py-0 pl-[42px] pr-4 text-[0.9rem] leading-snug outline-none"
          placeholder="Search logs, resources…"
          aria-label="Search"
        />
      </div>
      <div className="flex shrink-0 items-center gap-1 lg:gap-1.5">
        {showNotifications ? (
          <button type="button" className={headerIconButton} aria-label="Notifications">
            <Bell size={20} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
        {showSettings ? (
          <button
            type="button"
            className={`hidden sm:inline-flex ${headerIconButton}`}
            aria-label="Settings"
          >
            <Settings size={20} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
        <div className="hidden lg:contents">{profileSlot}</div>
      </div>
    </div>
  );
}

type StandardPageChromeProps = {
  config: MotherPageHeaderConfig;
  profileSlot: ReactNode;
};

/** Title row with optional back, page trailing actions, then global actions + profile. */
export function MotherStandardPageChrome({ config, profileSlot }: StandardPageChromeProps) {
  const { title, subtitle, backHref, backLabel, trailing, showNotifications, showSettings } = config;
  const notificationsVisible = showNotifications !== false;
  const settingsVisible = showSettings !== false;
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col px-4 lg:min-h-14 lg:px-7 lg:py-3">
      <div
        className={`flex w-full items-center gap-2 lg:min-h-0 lg:gap-3 ${headerBarMobile} lg:h-auto lg:max-h-none lg:overflow-visible lg:py-0`}
      >
        {backHref ? (
          <Link href={backHref} className={headerIconLink} aria-label={backLabel ?? "Back"}>
            <ArrowLeft size={18} aria-hidden />
          </Link>
        ) : null}
        <div className="min-w-0 flex-1 lg:flex-initial">
          <h1 className="m-0 truncate text-[1.05rem] font-extrabold leading-tight tracking-tight text-ink sm:text-[1.2rem]">
            {title}
          </h1>
        </div>
        <div className="relative hidden max-w-[420px] flex-1 items-center self-center lg:flex">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b96a8]" aria-hidden />
          <input
            type="search"
            className="box-border h-[42px] w-full rounded-full border border-line bg-[#f5f8f9] py-0 pl-[42px] pr-4 text-[0.9rem] leading-snug outline-none"
            placeholder="Search logs, resources…"
            aria-label="Search"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1 lg:gap-1.5 [&_button]:box-border">
          {trailing}
          {notificationsVisible ? (
            <button type="button" className={headerIconButton} aria-label="Notifications">
              <Bell size={20} strokeWidth={2} aria-hidden />
            </button>
          ) : null}
          {settingsVisible ? (
            <button type="button" className={`hidden sm:inline-flex ${headerIconButton}`} aria-label="Settings">
              <Settings size={20} strokeWidth={2} aria-hidden />
            </button>
          ) : null}
          <div className="hidden lg:contents">{profileSlot}</div>
        </div>
      </div>
      {subtitle ? (
        <p className="mb-0 mt-1 hidden max-w-full truncate text-[0.8rem] text-muted lg:block">{subtitle}</p>
      ) : null}
    </div>
  );
}

type DetailPageChromeProps = {
  config: MotherPageHeaderConfig;
  profileSlot: ReactNode;
};

/** Centered title between back and actions (log detail, reminder info, …). */
export function MotherDetailPageChrome({ config, profileSlot }: DetailPageChromeProps) {
  const { title, subtitle, backHref, backLabel, trailing } = config;
  return (
    <div
      className={`relative mx-auto flex max-w-[1200px] items-center gap-2 px-4 lg:min-h-14 lg:gap-3 lg:px-7 lg:py-3 ${headerBarMobile} lg:h-auto lg:max-h-none lg:overflow-visible`}
    >
      {backHref ? (
        <Link href={backHref} className={headerIconLink} aria-label={backLabel ?? "Back"}>
          <ArrowLeft size={18} aria-hidden />
        </Link>
      ) : (
        <span className="inline-flex h-10 w-10 shrink-0 lg:h-9 lg:w-9" aria-hidden />
      )}
      <div className="m-0 min-w-0 flex-1 text-center">
        <h1 className="m-0 truncate text-[1.05rem] font-extrabold leading-tight tracking-tight text-ink sm:text-[1.2rem]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mb-0 mt-0.5 hidden truncate text-[0.78rem] text-muted lg:block">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1 lg:gap-2 [&_button]:box-border [&_a]:box-border">
        {trailing}
        <div className="hidden lg:contents">{profileSlot}</div>
      </div>
    </div>
  );
}

export function motherFallbackPageTitle(pathname: string): string | null {
  const p = pathname.replace(/\/$/, "") || "/";
  if (p === base || p === `${base}/`) return "Home";
  if (p === `${base}/logs`) return "Health logs";
  if (p === `${base}/logs/new`) return "New log";
  if (p.startsWith(`${base}/logs/`)) {
    const rest = p.slice(`${base}/logs/`.length);
    if (rest && !rest.includes("/") && rest !== "new") return "Log details";
  }
  if (p === `${base}/care`) return "Care plan";
  if (p === `${base}/care/new`) return "Reminder";
  if (p.startsWith(`${base}/care/reminders/`)) return "Reminder info";
  if (p === `${base}/profile`) return "Profile";
  if (p === `${base}/schedule`) return "Schedule";
  if (p === `${base}/ai-chat`) return "AI chat";
  if (p === `${base}/network`) return "Network";
  return null;
}
