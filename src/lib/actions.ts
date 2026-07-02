"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tintOf, textOf } from "@/lib/brands";
import { slug, deriveMedium, resolveSource } from "@/lib/utm";
import { wouldCycle } from "@/lib/sf";
import type { SfParent } from "@/lib/types";
import { requireStaff, requireAdmin } from "@/lib/auth";
import {
  jiraEnv,
  createIssue,
  updateIssue,
  addWatcher,
  assigneeAccountId,
} from "@/lib/jira-server";
import { stepSummary, stepDescription, STEP_DEFAULT_OWNER } from "@/lib/jira";
import type {
  CampaignInput,
  DeliverableInput,
  DeliverableTask,
  DeliverableWithMeta,
  ImportPayload,
  ImportReport,
  JiraSyncReport,
  List,
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
      utm_campaign_override: input.utm_campaign_override.trim() || null,
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
      utm_campaign_override: input.utm_campaign_override.trim() || null,
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

/* ------------------------------ deliverables ----------------------------- */
// Cycle 12: a campaign fans out to deliverables (email/blog/social). Each keeps
// its own SF member code, utm_content, editable utm_source (pardot|salesforce),
// a comp→code→send chain, and audience lists. Chain + lists are replace-on-save.

const DELIVERABLE_KINDS = ["email", "blog", "social"];
const UTM_SOURCES = ["pardot", "salesforce"];

// Scalar deliverable columns, normalized (blanks → null).
function deliverableFields(input: DeliverableInput) {
  const kind = DELIVERABLE_KINDS.includes(input.kind) ? input.kind : "email";
  const utm_source = UTM_SOURCES.includes(input.utm_source)
    ? input.utm_source
    : "pardot";
  return {
    campaign_id: input.campaign_id,
    kind,
    name: input.name.trim(),
    sf_code: input.sf_code.trim() || null,
    sf_id: input.sf_id.trim() || null,
    sf_name: input.sf_name.trim() || null,
    utm_content: input.utm_content.trim() || null,
    utm_source,
    email_subject: input.email_subject.trim() || null,
    segment: input.segment.trim() || null,
    landing_page: input.landing_page.trim() || null,
    deliver_at: input.deliver_at || null,
    setup_date: input.setup_date || null,
    send_time: input.send_time.trim() || null,
    status: input.status.trim() || null,
    notes: input.notes.trim() || null,
    sort: input.sort,
  };
}

// Replace a deliverable's chain (comp/code/send) and list links wholesale.
async function writeChainAndLists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  deliverableId: string,
  input: DeliverableInput,
  { fresh }: { fresh: boolean }
) {
  if (!fresh) {
    await supabase
      .from("deliverable_tasks")
      .delete()
      .eq("deliverable_id", deliverableId);
    await supabase
      .from("deliverable_lists")
      .delete()
      .eq("deliverable_id", deliverableId);
  }

  const tasks = input.tasks
    .filter((t) => t.due || t.owner.trim())
    .map((t) => ({
      deliverable_id: deliverableId,
      kind: t.kind,
      due: t.due || null,
      owner: t.owner.trim() || null,
    }));
  if (tasks.length) {
    const { error } = await supabase.from("deliverable_tasks").insert(tasks);
    if (error) throw new Error(error.message);
  }

  const links = [...new Set(input.list_ids)].map((list_id) => ({
    deliverable_id: deliverableId,
    list_id,
  }));
  if (links.length) {
    const { error } = await supabase.from("deliverable_lists").insert(links);
    if (error) throw new Error(error.message);
  }
}

export async function createDeliverable(
  input: DeliverableInput
): Promise<string> {
  await requireStaff();
  if (!input.name.trim()) throw new Error("Deliverable name is required.");
  if (!input.campaign_id) throw new Error("A campaign is required.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deliverables")
    .insert(deliverableFields(input))
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await writeChainAndLists(supabase, data.id, input, { fresh: true });
  revalidatePath("/");
  return data.id as string;
}

export async function updateDeliverable(id: string, input: DeliverableInput) {
  await requireStaff();
  if (!input.name.trim()) throw new Error("Deliverable name is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("deliverables")
    .update(deliverableFields(input))
    .eq("id", id);
  if (error) throw new Error(error.message);

  await writeChainAndLists(supabase, id, input, { fresh: false });
  revalidatePath("/");
}

export async function deleteDeliverable(id: string) {
  await requireStaff();
  const supabase = await createClient();
  // Tasks + list links cascade via their FKs (ON DELETE CASCADE).
  const { error } = await supabase.from("deliverables").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/* --------------------------------- lists --------------------------------- */
// Audience lists are a staff-editable controlled vocabulary with a stored reach
// snapshot (seeded in 0007). Corrections happen here; deletes cascade to links.

export async function createList(input: {
  name: string;
  reach: number;
  region: string;
}): Promise<string> {
  await requireStaff();
  const name = input.name.trim();
  if (!name) throw new Error("List name is required.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lists")
    .insert({
      name,
      reach: Math.max(0, Math.round(input.reach) || 0),
      region: input.region.trim() || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data.id as string;
}

export async function updateList(
  id: string,
  input: { name: string; reach: number; region: string }
) {
  await requireStaff();
  const name = input.name.trim();
  if (!name) throw new Error("List name is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("lists")
    .update({
      name,
      reach: Math.max(0, Math.round(input.reach) || 0),
      region: input.region.trim() || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteList(id: string) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("lists").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

/* -------------------------------- jira sync ------------------------------ */
// Create-or-update the comp/code/send Jira issues for a campaign's email
// deliverables. Idempotent via deliverable_tasks.jira_key: a task with a key is
// UPDATED in place; without one it's CREATED and the key stored. Only dated
// tasks sync (a step with no due date isn't scheduled work yet). Staff only.

export async function syncCampaignToJira(campaignId: string): Promise<JiraSyncReport> {
  await requireStaff();
  const env = jiraEnv();
  if (!env) {
    throw new Error(
      "Jira isn't configured. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, and JIRA_PROJECT_KEY in the server environment."
    );
  }

  const supabase = await createClient();
  const { data: camp, error: campErr } = await supabase
    .from("campaigns")
    .select("id, name, sf_code, utm_campaign_override")
    .eq("id", campaignId)
    .single();
  if (campErr || !camp) throw new Error(campErr?.message ?? "Campaign not found.");

  const { data: rows, error: delErr } = await supabase
    .from("deliverables")
    .select("*, deliverable_tasks(*), deliverable_lists(list:lists(*))")
    .eq("campaign_id", campaignId)
    .eq("kind", "email");
  if (delErr) throw new Error(delErr.message);

  type Row = DeliverableWithMeta & {
    deliverable_tasks: DeliverableTask[] | null;
    deliverable_lists: { list: List | null }[] | null;
  };
  const deliverables: DeliverableWithMeta[] = ((rows ?? []) as Row[]).map((d) => {
    const { deliverable_tasks, deliverable_lists, ...rest } = d;
    return {
      ...rest,
      tasks: deliverable_tasks ?? [],
      lists: (deliverable_lists ?? []).map((x) => x.list).filter((l): l is List => l != null),
    };
  });

  const report: JiraSyncReport = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
    issues: [],
  };
  const campaignCtx = {
    id: camp.id,
    name: camp.name,
    sf_code: camp.sf_code,
    utm_campaign_override: camp.utm_campaign_override,
  };
  // Copy-approval watcher: added to comp issues so Whitney sees every design task.
  const watcherId = process.env.JIRA_WATCHER_COMP?.trim();

  for (const d of deliverables) {
    for (const t of d.tasks) {
      if (!t.due) {
        report.skipped++; // undated step — not scheduled work yet
        continue;
      }
      // Blank owner falls back to the step default (shared with CSV shaping).
      const owner = t.owner?.trim() || STEP_DEFAULT_OWNER[t.kind];
      const fields = {
        summary: stepSummary(camp.name, d.name, t.kind),
        description: stepDescription(campaignCtx, d, t.kind),
        due: t.due,
        assigneeId: assigneeAccountId(owner),
      };
      try {
        let key = t.jira_key ?? "";
        if (key) {
          const updated = await updateIssue(env, key, fields);
          if (updated) {
            report.updated++;
            report.issues.push({ key, summary: fields.summary, action: "updated" });
          } else {
            key = ""; // 404 in Jira — recreate below
          }
        }
        if (!key) {
          key = await createIssue(env, fields);
          const { error } = await supabase
            .from("deliverable_tasks")
            .update({ jira_key: key })
            .eq("id", t.id);
          if (error) throw new Error(error.message);
          report.created++;
          report.issues.push({ key, summary: fields.summary, action: "created" });
        }

        // Non-fatal: add the copy-approval watcher to comp issues.
        if (t.kind === "comp" && watcherId && key) {
          try {
            await addWatcher(env, key, watcherId);
          } catch (e) {
            report.warnings.push(
              `${key}: couldn't add watcher — ${e instanceof Error ? e.message : String(e)}`
            );
          }
        }
      } catch (e) {
        report.errors.push(`${fields.summary}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  revalidatePath("/");
  return report;
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

/* --------------------------- user management ----------------------------- */
// Admin-only. These use the service-role admin client (Auth Admin API) — the
// only path that can create/delete auth users or set a password. requireAdmin()
// gates every one; the admin client is server-only.

const ROLES = ["admin", "member", "external"];
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Create a new user with an initial password and a role. */
export async function createUser(input: {
  email: string;
  password: string;
  role: Role;
  canSeeFinancials: boolean;
}): Promise<{ id: string; email: string }> {
  await requireAdmin();
  const email = input.email.trim().toLowerCase();
  if (!isEmail(email)) throw new Error("Enter a valid email address.");
  if (input.password.length < 8)
    throw new Error("Initial password must be at least 8 characters.");
  const role = ROLES.includes(input.role) ? input.role : "member";

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true, // no verification email; they can sign in immediately
  });
  if (error) throw new Error(error.message);
  const id = data.user!.id;

  // The on_auth_user_created trigger seeds a default profile; set role + access.
  const { error: pErr } = await admin.from("profiles").upsert(
    {
      id,
      email,
      role,
      can_see_financials: role === "external" ? false : input.canSeeFinancials,
    },
    { onConflict: "id" }
  );
  if (pErr) throw new Error(pErr.message);

  revalidatePath("/team");
  return { id, email };
}

/** Set a user's password (admin reset). */
export async function resetUserPassword(userId: string, password: string) {
  await requireAdmin();
  if (password.length < 8)
    throw new Error("Password must be at least 8 characters.");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(error.message);
}

/** Remove a user entirely (auth row + profile cascade). Can't remove yourself. */
export async function deleteUser(userId: string) {
  const me = await requireAdmin();
  if (userId === me.id) throw new Error("You can't remove your own account.");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
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
