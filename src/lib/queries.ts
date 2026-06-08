import { createClient } from "@/lib/supabase/server";
import type {
  Brand,
  CampaignWithEvents,
  EventLite,
  Initiative,
} from "@/lib/types";

// Row shape from `campaigns.select('*, events(...)')`.
type CampaignJoinRow = Omit<CampaignWithEvents, "events"> & {
  events: EventLite[] | null;
};

/**
 * Home-screen data: all brands, initiatives, and campaigns — each campaign
 * carrying its full detail and its nested events. The calendar derives its
 * by-day event map by flattening campaigns → events client-side.
 * Server-side; reads run with the anon key (no RLS until Cycle 5).
 */
export async function getHomeData(): Promise<{
  brands: Brand[];
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
}> {
  const supabase = await createClient();

  const [brandsRes, initiativesRes, campaignsRes] = await Promise.all([
    supabase.from("brands").select("*").order("label"),
    supabase.from("initiatives").select("*").order("name"),
    supabase
      .from("campaigns")
      .select("*, events(id, type, date, label)")
      .order("name"),
  ]);

  if (brandsRes.error) throw new Error(brandsRes.error.message);
  if (initiativesRes.error) throw new Error(initiativesRes.error.message);
  if (campaignsRes.error) throw new Error(campaignsRes.error.message);

  const campaigns: CampaignWithEvents[] = (
    (campaignsRes.data ?? []) as CampaignJoinRow[]
  ).map((row) => ({ ...row, events: row.events ?? [] }));

  return {
    brands: (brandsRes.data ?? []) as Brand[],
    initiatives: (initiativesRes.data ?? []) as Initiative[],
    campaigns,
  };
}
