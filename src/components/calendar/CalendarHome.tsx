"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { Brand, CalendarEvent } from "@/lib/types";
import { Toolbar } from "./Toolbar";
import { BrandLegend } from "./BrandLegend";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";

export type CalendarView = "month" | "week" | "day";

// Default to June 2026, where the seed lives, so the calendar shows populated
// on first load. The Today button jumps to the real current month.
const DEFAULT_CURSOR = new Date(2026, 5, 1);

export function CalendarHome({
  brands,
  events,
}: {
  brands: Brand[];
  events: CalendarEvent[];
}) {
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState<Date>(DEFAULT_CURSOR);
  const [hiddenBrands, setHiddenBrands] = useState<Set<string>>(new Set());
  // Resolved on the client after mount: the today-outline uses the browser's
  // real date, set post-mount so SSR markup stays hydration-stable (server and
  // client clocks/timezones can differ).
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-shot client-date resolution
    setToday(new Date());
  }, []);

  const brandMap = useMemo(() => {
    const m: Record<string, Brand> = {};
    for (const b of brands) m[b.id] = b;
    return m;
  }, [brands]);

  // Events bucketed by day key, excluding hidden brands.
  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      if (hiddenBrands.has(ev.brandId)) continue;
      (map[ev.date] ??= []).push(ev);
    }
    return map;
  }, [events, hiddenBrands]);

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

        <section className="rounded-[14px] border border-hair bg-white p-4">
          {view === "month" && (
            <MonthView
              cursor={cursor}
              eventsByDay={eventsByDay}
              brandMap={brandMap}
              today={today}
            />
          )}
          {view === "week" && (
            <WeekView
              cursor={cursor}
              eventsByDay={eventsByDay}
              brandMap={brandMap}
              today={today}
            />
          )}
          {view === "day" && (
            <DayView
              cursor={cursor}
              eventsByDay={eventsByDay}
              brandMap={brandMap}
            />
          )}
        </section>
      </main>
    </div>
  );
}
