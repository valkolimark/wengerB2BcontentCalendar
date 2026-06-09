"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tintOf, textOf } from "@/lib/brands";
import { slug, deriveMedium, resolveSource } from "@/lib/utm";
import { wouldCycle } from "@/lib/sf";
import type { SfParent } from "@/lib/types";
import { requireStaff, requireAdmin } from "@/lib/auth";
import type {
  CampaignInput,
  ImportPayload,
  ImportReport,
  Role,
} from "@/lib/types";

/* --------------------------------- brands -------------------------------- */

export async function createBrand(input: { label: string; dot: string }) {
  await requireStaff();
  const label = input.label.trim();
  if (!label) throw new Error("Brand name is required.");
  const id = slug(label);
  if (!id) throw new Error("Brand name must contain letters or numbers.");

  const supabase = await createClient();
  const { error } = await supabase.from("brands").insert({
    id,
    label,
    dot: input.dot,
    tint: tintOf(input.dot),
    text: textOf(input.dot),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return id;
}

export async function updateBrand(
  id: string,
  input: { label: string; dot: string }
) {
  await requireStaff();
  const label = input.label.trim();
  if (!label) throw new Error("Brand name is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("brands")
    .update({
      label,
      dot: input.dot,
      tint: tintOf(input.dot),
      text: textOf(input.dot),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteBrand(id: string) {
  await requireStaff();
  const supabase = await createClient();
  // Refuse if any campaign still uses this brand.
  const { count, error: countErr } = await supabase
    .from("campaigns")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", id);
  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) > 0) {
    throw new Error("This brand is in use by campaigns and can't be deleted.");
  }

  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/* ----------------------------- sf parents -------------------------------- */

export async function createSfParent(input: {
  name: string;
  parent_id: string | null;
}): Promise<string> {
  await requireStaff();
  const name = input.name.trim();
  if (!name) throw new Error("Parent name is required.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sf_parents")
    .insert({ name, parent_id: input.parent_id || null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data.id as string;
}

export async function updateSfParent(
  id: string,
  input: { name: string; parent_id: string | null }
) {
  await requireStaff();
  const name = input.name.trim();
  if (!name) throw new Error("Parent name is required.");

  const supabase = await createClient();
  // Reject changes that would create a reporting cycle (a→b→a).
  const { data: rows } = await supabase
    .from("sf_parents")
    .select("id, name, parent_id");
  if (wouldCycle(id, input.parent_id, (rows ?? []) as SfParent[])) {
    throw new Error("That would create a reporting cycle.");
  }

  const { error } = await supabase
    .from("sf_parents")
    .update({ name, parent_id: input.parent_id || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// Deleting a parent nulls dependents' parent_id and campaigns' sf_parent_id via
// the FKs (ON DELETE SET NULL) — no orphan loss.
export async function deleteSfParent(id: string) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("sf_parents").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/* ------------------------------ initiatives ------------------------------ */

export async function createInitiative(input: {
  name: string;
  owner: string;
  status: string;
}): Promise<string> {
  await requireStaff();
  const name = input.name.trim();
  if (!name) throw new Error("Initiative name is required.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("initiatives")
    .insert({
      name,
      owner: input.owner.trim() || "Unassigned",
      status: input.status,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data.id as string;
}

export async function updateInitiative(
  id: string,
  input: { name: string; owner: string; status: string }
) {
  await requireStaff();
  const name = input.name.trim();
  if (!name) throw new Error("Initiative name is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("initiatives")
    .update({
      name,
      owner: input.owner.trim() || "Unassigned",
      status: input.status,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// Deleting an initiative relies on campaigns.initiative_id ON DELETE SET NULL:
// its campaigns become surfaced orphans, not deleted.
export async function deleteInitiative(id: string) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("initiatives").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/** Reparent campaigns onto an initiative (adoption). */
export async function adoptCampaigns(
  initiativeId: string,
  campaignIds: string[]
) {
  await requireStaff();
  if (!initiativeId) throw new Error("An initiative is required.");
  if (campaignIds.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ initiative_id: initiativeId })
    .in("id", campaignIds);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/* ------------------------------- campaigns ------------------------------- */

function utmFields(input: CampaignInput) {
  return {
    utm_source: resolveSource({
      vendor: input.vendor,
      channel: input.channel,
      sf_code: input.sf_code,
      sf_id: input.sf_id,
      sf_name: input.sf_name,
    }),
    utm_medium: deriveMedium(input.channel),
    utm_content: input.utm_content.trim(),
  };
}

// Shared SF identity columns (stored as null when blank).
function sfFields(input: {
  sf_code: string;
  sf_id: string;
  sf_name: string;
  sf_parent_id: string | null;
}) {
  return {
    sf_code: input.sf_code.trim(),
    sf_id: input.sf_id.trim() || null,
    sf_name: input.sf_name.trim() || null,
    sf_parent_id: input.sf_parent_id || null,
  };
}

export async function createCampaign(
  input: CampaignInput & { launch?: string; comp?: string }
) {
  await requireStaff();
  const name = input.name.trim();
  if (!name) throw new Error("Campaign name is required.");
  if (!input.initiative_id) throw new Error("Pick an initiative.");
  if (!input.brand_id) throw new Error("Pick a brand.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      initiative_id: input.initiative_id,
      brand_id: input.brand_id,
      name,
      channel: input.channel,
      vendor: input.vendor,
      segment: input.segment.trim(),
      owner: input.owner.trim() || "Unassigned",
      ...sfFields(input),
      ...utmFields(input),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Seed launch / comp-due events from the create form.
  const events: { campaign_id: string; type: string; date: string; label: string }[] = [];
  if (input.launch) {
    events.push({
      campaign_id: data.id,
      type: "launch",
      date: input.launch,
      label: name.slice(0, 22),
    });
  }
  if (input.comp) {
    events.push({
      campaign_id: data.id,
      type: "comp",
      date: input.comp,
      label: name.slice(0, 16) + " comp",
    });
  }
  if (events.length) {
    const { error: evErr } = await supabase.from("events").insert(events);
    if (evErr) throw new Error(evErr.message);
  }

  revalidatePath("/");
  return data.id as string;
}

// Metadata only — never touches existing events.
export async function updateCampaign(id: string, input: CampaignInput) {
  await requireStaff();
  const name = input.name.trim();
  if (!name) throw new Error("Campaign name is required.");
  if (!input.initiative_id) throw new Error("Pick an initiative.");
  if (!input.brand_id) throw new Error("Pick a brand.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({
      initiative_id: input.initiative_id,
      brand_id: input.brand_id,
      name,
      channel: input.channel,
      vendor: input.vendor,
      segment: input.segment.trim(),
      owner: input.owner.trim() || "Unassigned",
      ...sfFields(input),
      ...utmFields(input),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteCampaign(id: string) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/* --------------------------------- auth ---------------------------------- */

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/* ----------------------------- admin / team ------------------------------ */

export async function updateUserRole(userId: string, role: Role) {
  await requireAdmin();
  if (!["admin", "member", "external"].includes(role)) {
    throw new Error("Invalid role.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

export async function setFinancialAccess(userId: string, canSee: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ can_see_financials: canSee })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

/* --------------------------------- import -------------------------------- */

const IMPORT_DEFAULT_DOT = "#6B3FA0";

// Admin-only, additive/update-only, idempotent upsert from a parsed workbook.
// Natural keys: brands by label/id, initiatives by name, campaigns by sf_code,
// events by (campaign, type, date). No deletes. RLS is the backstop.
export async function importWorkbook(
  payload: ImportPayload
): Promise<ImportReport> {
  await requireAdmin();
  const supabase = await createClient();
  const report: ImportReport = {
    brands: { added: 0 },
    initiatives: { added: 0, updated: 0 },
    campaigns: { added: 0, updated: 0 },
    events: { added: 0, skipped: 0 },
    financials: { updated: 0 },
    errors: [],
  };

  // Current state for matching.
  const [brandsRes, initiativesRes, campaignsRes, eventsRes, sfParentsRes] =
    await Promise.all([
      supabase.from("brands").select("id, label"),
      supabase.from("initiatives").select("id, name"),
      supabase.from("campaigns").select("id, sf_code"),
      supabase.from("events").select("campaign_id, type, date"),
      supabase.from("sf_parents").select("id, name"),
    ]);

  const brandById = new Set<string>();
  const brandByLabel = new Map<string, string>();
  for (const b of brandsRes.data ?? []) {
    brandById.add(b.id);
    brandByLabel.set(b.label.toLowerCase(), b.id);
  }
  const initByName = new Map<string, string>();
  for (const i of initiativesRes.data ?? [])
    initByName.set(i.name.toLowerCase(), i.id);
  const sfParentByName = new Map<string, string>();
  for (const p of sfParentsRes.data ?? [])
    sfParentByName.set(p.name.toLowerCase(), p.id);

  // Resolve an SF parent by name, creating it as a root if absent (chain edits
  // stay a manual/admin step).
  const ensureSfParent = async (name: string): Promise<string | null> => {
    const n = name.trim();
    if (!n) return null;
    const existing = sfParentByName.get(n.toLowerCase());
    if (existing) return existing;
    const { data, error } = await supabase
      .from("sf_parents")
      .insert({ name: n })
      .select("id")
      .single();
    if (error || !data) {
      report.errors.push(`SF parent "${n}": ${error?.message ?? "insert failed"}`);
      return null;
    }
    sfParentByName.set(n.toLowerCase(), data.id);
    return data.id;
  };
  const campBySf = new Map<string, string>();
  for (const c of campaignsRes.data ?? [])
    if (c.sf_code) campBySf.set(c.sf_code, c.id);
  const eventKeys = new Set<string>();
  for (const e of eventsRes.data ?? [])
    eventKeys.add(`${e.campaign_id}|${e.type}|${e.date}`);

  const ensureBrand = async (value: string): Promise<string | null> => {
    const v = value.trim();
    if (!v) return null;
    if (brandById.has(v)) return v;
    const byLabel = brandByLabel.get(v.toLowerCase());
    if (byLabel) return byLabel;
    const id = slug(v) || v.toLowerCase();
    if (brandById.has(id)) return id;
    const { error } = await supabase.from("brands").insert({
      id,
      label: v,
      dot: IMPORT_DEFAULT_DOT,
      tint: tintOf(IMPORT_DEFAULT_DOT),
      text: textOf(IMPORT_DEFAULT_DOT),
    });
    if (error) {
      report.errors.push(`Brand "${v}": ${error.message}`);
      return null;
    }
    brandById.add(id);
    brandByLabel.set(v.toLowerCase(), id);
    report.brands.added++;
    return id;
  };

  const ensureInitiative = async (name: string): Promise<string | null> => {
    const n = name.trim();
    if (!n) return null;
    const existing = initByName.get(n.toLowerCase());
    if (existing) return existing;
    const { data, error } = await supabase
      .from("initiatives")
      .insert({ name: n, owner: "Unassigned", status: "Planning" })
      .select("id")
      .single();
    if (error || !data) {
      report.errors.push(`Initiative "${n}": ${error?.message ?? "insert failed"}`);
      return null;
    }
    initByName.set(n.toLowerCase(), data.id);
    report.initiatives.added++;
    return data.id;
  };

  // Initiatives sheet (owner/status updates for existing).
  for (const i of payload.initiatives) {
    const name = i.name.trim();
    if (!name) continue;
    const existing = initByName.get(name.toLowerCase());
    if (existing) {
      const { error } = await supabase
        .from("initiatives")
        .update({ owner: i.owner || "Unassigned", status: i.status || "Planning" })
        .eq("id", existing);
      if (error) report.errors.push(`Initiative "${name}": ${error.message}`);
      else report.initiatives.updated++;
    } else {
      const { data, error } = await supabase
        .from("initiatives")
        .insert({ name, owner: i.owner || "Unassigned", status: i.status || "Planning" })
        .select("id")
        .single();
      if (error || !data) {
        report.errors.push(`Initiative "${name}": ${error?.message ?? "insert failed"}`);
      } else {
        initByName.set(name.toLowerCase(), data.id);
        report.initiatives.added++;
      }
    }
  }

  // Campaigns (natural key = sf_code) + financials.
  for (const c of payload.campaigns) {
    const name = c.name.trim();
    const sf = c.sf_code.trim();
    if (!name || !sf) {
      report.errors.push(`Campaign "${name || sf || "?"}": missing name or SF code.`);
      continue;
    }
    const brandId = await ensureBrand(c.brand);
    if (!brandId) {
      report.errors.push(`Campaign "${name}": missing/invalid brand.`);
      continue;
    }
    const initiativeId = await ensureInitiative(c.initiative);
    const sfParentId = c.sf_parent ? await ensureSfParent(c.sf_parent) : null;

    const fields = {
      initiative_id: initiativeId,
      brand_id: brandId,
      name,
      channel: c.channel,
      vendor: c.vendor,
      segment: c.segment,
      owner: c.owner || "Unassigned",
      sf_code: sf,
      sf_id: c.sf_id?.trim() || null,
      sf_name: c.sf_name?.trim() || null,
      sf_parent_id: sfParentId,
      utm_source: c.utm_source,
      utm_medium: c.utm_medium,
      utm_content: c.utm_content,
    };

    let campaignId = campBySf.get(sf);
    if (campaignId) {
      const { error } = await supabase.from("campaigns").update(fields).eq("id", campaignId);
      if (error) {
        report.errors.push(`Campaign "${name}": ${error.message}`);
        continue;
      }
      report.campaigns.updated++;
    } else {
      const { data, error } = await supabase
        .from("campaigns")
        .insert(fields)
        .select("id")
        .single();
      if (error || !data) {
        report.errors.push(`Campaign "${name}": ${error?.message ?? "insert failed"}`);
        continue;
      }
      const newId = data.id as string;
      campaignId = newId;
      campBySf.set(sf, newId);
      report.campaigns.added++;
    }

    // Financials only when the file carries them (admin-only via RLS).
    if (campaignId && (c.leads !== undefined || c.pipeline !== undefined)) {
      const { error } = await supabase.from("campaign_financials").upsert(
        { campaign_id: campaignId, leads: c.leads ?? 0, pipeline: c.pipeline ?? 0 },
        { onConflict: "campaign_id" }
      );
      if (error) report.errors.push(`Financials for "${name}": ${error.message}`);
      else report.financials.updated++;
    }
  }

  // Events matched by (campaign, type, date) — idempotent.
  for (const e of payload.events) {
    const campaignId = campBySf.get(e.campaign_sf.trim());
    if (!campaignId) {
      report.errors.push(`Event references unknown campaign SF "${e.campaign_sf}".`);
      continue;
    }
    const k = `${campaignId}|${e.type}|${e.date}`;
    if (eventKeys.has(k)) {
      report.events.skipped++;
      continue;
    }
    const { error } = await supabase.from("events").insert({
      campaign_id: campaignId,
      type: e.type,
      date: e.date,
      label: e.label,
    });
    if (error) {
      report.errors.push(`Event "${e.label}": ${error.message}`);
      continue;
    }
    eventKeys.add(k);
    report.events.added++;
  }

  revalidatePath("/");
  return report;
}
