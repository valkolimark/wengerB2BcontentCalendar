import { createClient } from "@/lib/supabase/server";
import type { Brand, CalendarEvent, EventType } from "@/lib/types";

// Shape of an events row with its campaign embedded (events → campaigns join).
type EventJoinRow = {
  id: string;
  date: string;
  type: EventType;
  label: string;
  campaign:
    | { id: string; name: string; brand_id: string }
    | { id: string; name: string; brand_id: string }[]
    | null;
};

/**
 * Calendar data for the home screen: all brands, plus every event flattened
 * from the events → campaigns → brands relationship into a render-ready shape.
 * Server-side; reads run with the anon key (no RLS until Cycle 5).
 */
export async function getCalendarData(): Promise<{
  brands: Brand[];
  events: CalendarEvent[];
}> {
  const supabase = await createClient();

  const [brandsRes, eventsRes] = await Promise.all([
    supabase.from("brands").select("*").order("label"),
    supabase
      .from("events")
      .select("id, date, type, label, campaign:campaigns(id, name, brand_id)")
      .order("date"),
  ]);

  if (brandsRes.error) throw new Error(brandsRes.error.message);
  if (eventsRes.error) throw new Error(eventsRes.error.message);

  const events: CalendarEvent[] = ((eventsRes.data ?? []) as EventJoinRow[]).flatMap(
    (row) => {
      const c = Array.isArray(row.campaign) ? row.campaign[0] : row.campaign;
      if (!c) return []; // orphan/no campaign — skip on the calendar
      return [
        {
          id: row.id,
          date: row.date,
          type: row.type,
          label: row.label,
          brandId: c.brand_id,
          campaignId: c.id,
          campaignName: c.name,
        },
      ];
    }
  );

  return { brands: (brandsRes.data ?? []) as Brand[], events };
}
