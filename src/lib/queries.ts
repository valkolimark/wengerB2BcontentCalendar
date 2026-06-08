import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, entitledToFinancials } from "@/lib/auth";
import type {
  Brand,
  CampaignWithEvents,
  EventLite,
  Initiative,
  Role,
} from "@/lib/types";

// Row shape from `campaigns.select('*, events(...)')` (no leads/pipeline — those
// moved to campaign_financials in Cycle 5).
type CampaignJoinRow = Omit<
  CampaignWithEvents,
  "events" | "leads" | "pipeline"
> & {
  events: EventLite[] | null;
};

export type HomeData = {
  brands: Brand[];
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  canSeeFinancials: boolean;
  role: Role;
  userEmail: string | null;
};

/**
 * Home-screen data, role-aware. Content (brands/initiatives/campaigns/events)
 * is readable by any authenticated user. Financials (leads/pipeline) are fetched
 * and merged ONLY when the caller is entitled — and RLS denies the rows anyway
 * to anyone who isn't, so the numbers are absent from the response, not hidden.
 */
export async function getHomeData(): Promise<HomeData> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const entitled = entitledToFinancials(profile);

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

  // Financials: only queried when entitled. RLS is the real backstop.
  const financials = new Map<string, { leads: number; pipeline: number }>();
  if (entitled) {
    const { data } = await supabase
      .from("campaign_financials")
      .select("campaign_id, leads, pipeline");
    for (const f of data ?? []) {
      financials.set(f.campaign_id, { leads: f.leads, pipeline: f.pipeline });
    }
  }

  const campaigns: CampaignWithEvents[] = (
    (campaignsRes.data ?? []) as CampaignJoinRow[]
  ).map((row) => {
    const fin = financials.get(row.id);
    return {
      ...row,
      events: row.events ?? [],
      leads: fin?.leads ?? 0,
      pipeline: fin?.pipeline ?? 0,
    };
  });

  return {
    brands: (brandsRes.data ?? []) as Brand[],
    initiatives: (initiativesRes.data ?? []) as Initiative[],
    campaigns,
    canSeeFinancials: entitled,
    role: profile?.role ?? "external",
    userEmail: profile?.email ?? null,
  };
}
