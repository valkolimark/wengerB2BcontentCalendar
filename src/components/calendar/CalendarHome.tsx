"use client";

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type {
  Brand,
  CalendarEvent,
  CampaignWithEvents,
  Initiative,
  Selected,
} from "@/lib/types";
import { parseISO } from "@/lib/dates";
import { Toolbar } from "./Toolbar";
import { BrandLegend } from "./BrandLegend";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { InitiativeCards } from "@/components/initiative/InitiativeCards";
import { DetailDrawer } from "@/components/drawer/DetailDrawer";

export type CalendarView = "month" | "week" | "day";

// No auth yet — financials show for everyone. Cycle 5 wires this to RLS.
const canSeeFinancials = true;

// Default to June 2026, where the seed lives, so the calendar shows populated
// on first load. The Today button jumps to the real current month.
const DEFAULT_CURSOR = new Date(2026, 5, 1);

export function CalendarHome({
  brands,
  initiatives,
  campaigns,
  todayKey,
}: {
  brands: Brand[];
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  todayKey: string;
}) {
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState<Date>(DEFAULT_CURSOR);
  const [hiddenBrands, setHiddenBrands] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Selected>(null);

  // Server-provided "today" — deterministic across SSR/hydration.
  const today = useMemo(() => parseISO(todayKey), [todayKey]);

  const brandMap = useMemo(() => {
    const m: Record<string, Brand> = {};
    for (const b of brands) m[b.id] = b;
    return m;
  }, [brands]);

  // Flatten campaigns → events into the calendar's render shape (Cycle 2 behavior).
  const calendarEvents = useMemo<CalendarEvent[]>(
    () =>
      campaigns.flatMap((c) =>
        c.events.map((e) => ({
          id: e.id,
          date: e.date,
          type: e.type,
          label: e.label,
          brandId: c.brand_id,
          campaignId: c.id,
          campaignName: c.name,
        }))
      ),
    [campaigns]
  );

  // Events bucketed by day key, excluding hidden brands.
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of calendarEvents) {
      if (hiddenBrands.has(ev.brandId)) continue;
      (map[ev.date] ??= []).push(ev);
    }
    return map;
  }, [calendarEvents, hiddenBrands]);

  const move = (dir: number) => {
    setCursor((c) => {
      const d = new Date(c);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else if (view === "week") d.setDate(d.getDate() + dir * 7);
      else d.setDate(d.getDate() + dir);
      return d;
    });
  };

  const goToday = () => {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  };

  const toggleBrand = (id: string) => {
    setHiddenBrands((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectCampaign = (campaignId: string) =>
    setSelected({ kind: "campaign", id: campaignId });

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-hair bg-white px-[22px] py-[13px]">
        <div className="flex items-center gap-[11px]">
          <span className="flex size-8 items-center justify-center rounded-lg bg-navy text-base font-bold text-white">
            W
          </span>
          <div>
            <div className="text-[15px] font-semibold tracking-[-0.01em]">
              Content Tracker
            </div>
            <div className="text-[11px] text-muted2">Wenger B2B · 2026</div>
          </div>
        </div>
        {/* Role display is a placeholder until Auth lands in Cycle 5. */}
        <div className="flex items-center gap-[7px] rounded-[9px] border border-hair bg-[#f4f2ec] px-2.5 py-[5px] text-[13px] font-medium text-muted">
          <ShieldCheck size={15} />
          Admin · Mark
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] p-[22px]">
        <Toolbar
          view={view}
          cursor={cursor}
          onView={setView}
          onPrev={() => move(-1)}
          onNext={() => move(1)}
          onToday={goToday}
        />

        <BrandLegend
          brands={brands}
          hiddenBrands={hiddenBrands}
          onToggle={toggleBrand}
        />

        <section className="mb-[26px] rounded-[14px] border border-hair bg-white p-4">
          {view === "month" && (
            <MonthView
              cursor={cursor}
              eventsByDay={eventsByDay}
              brandMap={brandMap}
              today={today}
              onSelect={selectCampaign}
            />
          )}
          {view === "week" && (
            <WeekView
              cursor={cursor}
              eventsByDay={eventsByDay}
              brandMap={brandMap}
              today={today}
              onSelect={selectCampaign}
            />
          )}
          {view === "day" && (
            <DayView
              cursor={cursor}
              eventsByDay={eventsByDay}
              brandMap={brandMap}
              onSelect={selectCampaign}
            />
          )}
        </section>

        <InitiativeCards
          initiatives={initiatives}
          campaigns={campaigns}
          brandMap={brandMap}
          today={today}
          canSeeFinancials={canSeeFinancials}
          onSelect={(id) => setSelected({ kind: "initiative", id })}
        />
      </main>

      {selected && (
        <DetailDrawer
          selected={selected}
          brandMap={brandMap}
          initiatives={initiatives}
          campaigns={campaigns}
          today={today}
          canSeeFinancials={canSeeFinancials}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
