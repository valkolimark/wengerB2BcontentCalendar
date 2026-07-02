import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, entitledToFinancials } from "@/lib/auth";
import { jiraConfigured } from "@/lib/jira-server";
import type {
  Brand,
  CampaignWithEvents,
  Deliverable,
  DeliverableTask,
  DeliverableWithMeta,
  EventLite,
  Initiative,
  InitiativeSf,
  List,
  Role,
  SfParent,
  SfRole,
} from "@/lib/types";

// Nested deliverable row from the campaigns embed: tasks + lists come back under
// their join table names, which we normalize below.
type DeliverableJoinRow = Deliverable & {
  deliverable_tasks: DeliverableTask[] | null;
  deliverable_lists: { list: List | null }[] | null;
};

// Row shape from `campaigns.select('*, events(...), deliverables(...)')`
// (no leads/pipeline — those moved to campaign_financials in Cycle 5).
type CampaignJoinRow = Omit<
  CampaignWithEvents,
  "events" | "deliverables" | "leads" | "pipeline"
> & {
  events: EventLite[] | null;
  deliverables: DeliverableJoinRow[] | null;
};

export type HomeData = {
  brands: Brand[];
  initiatives: Initiative[];
  campaigns: CampaignWithEvents[];
  sfParents: SfParent[];
  lists: List[];
  canSeeFinancials: boolean;
  jiraConfigured: boolean;
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

  const [brandsRes, initiativesRes, campaignsRes, sfParentsRes, listsRes, initSfRes] =
    await Promise.all([
      supabase.from("brands").select("*").order("label"),
      supabase.from("initiatives").select("*").order("name"),
      supabase
        .from("campaigns")
        .select(
          "*, events(id, type, date, label), deliverables(*, deliverable_tasks(*), deliverable_lists(list:lists(*)))"
        )
        .order("name"),
      supabase.from("sf_parents").select("id, name, parent_id").order("name"),
      supabase
        .from("lists")
        .select("id, name, reach, region")
        .order("region")
        .order("name"),
      supabase
        .from("initiative_sf_campaigns")
        .select("initiative_id, role, name, sf_id, sf_code"),
    ]);

  if (brandsRes.error) throw new Error(brandsRes.error.message);
  if (initiativesRes.error) throw new Error(initiativesRes.error.message);
  if (campaignsRes.error) throw new Error(campaignsRes.error.message);
  if (sfParentsRes.error) throw new Error(sfParentsRes.error.message);
  if (listsRes.error) throw new Error(listsRes.error.message);
  if (initSfRes.error) throw new Error(initSfRes.error.message);

  // Group initiative SF campaigns by initiative → role map.
  const sfByInitiative = new Map<string, InitiativeSf>();
  for (const row of (initSfRes.data ?? []) as {
    initiative_id: string;
    role: SfRole;
    name: string | null;
    sf_id: string | null;
    sf_code: string | null;
  }[]) {
    const m = sfByInitiative.get(row.initiative_id) ?? {};
    m[row.role] = { name: row.name, sf_id: row.sf_id, sf_code: row.sf_code };
    sfByInitiative.set(row.initiative_id, m);
  }
  const initiatives: Initiative[] = ((initiativesRes.data ?? []) as Initiative[]).map(
    (i) => ({ ...i, sf: sfByInitiative.get(i.id) ?? {} })
  );

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
    // Normalize each deliverable's join tables into flat tasks[] + lists[].
    const deliverables: DeliverableWithMeta[] = (row.deliverables ?? []).map(
      (d) => {
        const { deliverable_tasks, deliverable_lists, ...rest } = d;
        return {
          ...rest,
          tasks: deliverable_tasks ?? [],
          lists: (deliverable_lists ?? [])
            .map((dl) => dl.list)
            .filter((l): l is List => l != null),
        };
      }
    );
    return {
      ...row,
      events: row.events ?? [],
      deliverables,
      leads: fin?.leads ?? 0,
      pipeline: fin?.pipeline ?? 0,
    };
  });

  return {
    brands: (brandsRes.data ?? []) as Brand[],
    initiatives,
    campaigns,
    sfParents: (sfParentsRes.data ?? []) as SfParent[],
    lists: (listsRes.data ?? []) as List[],
    canSeeFinancials: entitled,
    jiraConfigured: jiraConfigured(),
    role: profile?.role ?? "external",
    userEmail: profile?.email ?? null,
  };
}
