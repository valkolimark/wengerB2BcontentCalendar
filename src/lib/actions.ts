"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { tintOf, textOf } from "@/lib/brands";
import { slug, deriveSource, deriveMedium } from "@/lib/utm";
import type { CampaignInput } from "@/lib/types";

/* --------------------------------- brands -------------------------------- */

export async function createBrand(input: { label: string; dot: string }) {
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

/* ------------------------------ initiatives ------------------------------ */

export async function createInitiative(input: {
  name: string;
  owner: string;
  status: string;
}): Promise<string> {
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
    utm_source: deriveSource(input.vendor, input.channel),
    utm_medium: deriveMedium(input.channel),
    utm_content: input.utm_content.trim(),
  };
}

export async function createCampaign(
  input: CampaignInput & { launch?: string; comp?: string }
) {
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
      sf_code: input.sf_code.trim(),
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
      sf_code: input.sf_code.trim(),
      ...utmFields(input),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteCampaign(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
