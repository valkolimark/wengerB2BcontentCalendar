// Core domain types for the Wenger B2B content calendar.
// Field names mirror the database columns (snake_case) so rows fetched from
// Supabase map onto these types directly.

// admin — full read incl. financials, full write, manages roles.
// member — internal staff: read + write content; financials only if granted.
// external — read-only, fully scrubbed (no financials, no write affordances).
export type Role = "admin" | "member" | "external";

export type Profile = {
  id: string;
  email: string | null;
  role: Role;
  can_see_financials: boolean;
};

// A Salesforce reporting parent (rollup reference). Self-referential: parent_id
// is the rollup this one reports into (null = root). Salesforce does the rollup;
// the app only records the reference.
export type SfParent = {
  id: string;
  name: string;
  parent_id: string | null;
};

// Drawer selection — shared across the calendar, cards, and drawer.
export type Selected = { kind: "initiative" | "campaign"; id: string } | null;

// Normalized payload parsed from an uploaded workbook (client-side) and handed
// to the importWorkbook Server Action. Campaign natural key = sf_code; events
// matched by (campaign_sf, type, date). leads/pipeline present only when the
// file carries financial columns.
export type ImportPayload = {
  initiatives: { name: string; owner: string; status: string }[];
  campaigns: {
    initiative: string; // initiative name
    brand: string; // brand label (or id)
    name: string;
    channel: string;
    vendor: string;
    segment: string;
    owner: string;
    sf_code: string;
    sf_id: string;
    sf_name: string;
    sf_parent: string; // SF Parent name (resolved/created on import)
    utm_source: string;
    utm_medium: string;
    utm_content: string;
    leads?: number;
    pipeline?: number;
  }[];
  events: {
    campaign_sf: string;
    type: EventType;
    date: string; // ISO yyyy-mm-dd
    label: string;
  }[];
};

// What importWorkbook applied (returned to the client after confirm).
export type ImportReport = {
  brands: { added: number };
  initiatives: { added: number; updated: number };
  campaigns: { added: number; updated: number };
  events: { added: number; skipped: number };
  financials: { updated: number };
  errors: string[];
};

export type Brand = {
  id: string;
  label: string;
  dot: string; // base brand color (hex)
  tint: string; // light fill derived from dot
  text: string; // readable text color derived from dot
};

export type InitiativeStatus =
  | "In flight"
  | "Launching soon"
  | "On track"
  | "In review"
  | "Planning"
  | "Complete";

export type Initiative = {
  id: string;
  name: string;
  owner: string;
  // Kept as string (not a strict union) so unknown statuses from the DB never
  // break a fetch; STATUS in brands.ts is the source of known values.
  status: InitiativeStatus | string;
  created_at?: string;
};

export type EventType = "launch" | "comp";

// Calendar markers: the two campaign events (launch, comp) plus the three
// deliverable markers (Cycle 13) — send, and the comp/code hand-off dates.
export type CalendarMarkerType =
  | EventType
  | "send"
  | "deliv_comp"
  | "deliv_code";

export type CampaignEvent = {
  id: string;
  campaign_id: string;
  type: EventType;
  date: string; // ISO yyyy-mm-dd
  label: string;
};

// A calendar event flattened from the events→campaigns→brands join, shaped for
// rendering in the calendar views.
export type CalendarEvent = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  type: CalendarMarkerType;
  label: string;
  brandId: string;
  campaignId: string;
  campaignName: string;
  // Set for deliverable markers (send/comp/code) so a click can focus the card.
  deliverableId?: string;
};

// A campaign's own event, as nested under a campaign in getHomeData.
export type EventLite = {
  id: string;
  type: EventType;
  date: string; // ISO yyyy-mm-dd
  label: string;
};

export type Campaign = {
  id: string;
  // Nullable on purpose: campaigns.initiative_id is ON DELETE SET NULL, so a
  // deleted initiative surfaces its campaigns as orphans rather than losing them.
  initiative_id: string | null;
  brand_id: string;
  name: string;
  channel: string;
  vendor: string;
  segment: string;
  owner: string;
  sf_code: string;
  // Salesforce identity — metadata only; not part of the UTM string. When any
  // of sf_code/sf_id/sf_name is present, utm_source is forced to "salesforce".
  sf_id: string | null;
  sf_name: string | null;
  // SF reporting parent this campaign rolls up into (null = none).
  sf_parent_id: string | null;
  utm_source: string;
  utm_medium: string;
  utm_content: string;
  // When set, utm_campaign uses this slug; else it derives from the SF code
  // (Cycle 13). A deliverable with its own SF code overrides at its level.
  utm_campaign_override: string | null;
  leads: number;
  pipeline: number;
};

/* ------------------------------ deliverables ----------------------------- */
// Cycle 12: the third tier. A campaign fans out to one or more deliverables
// (the actual sends/assets). Each email deliverable carries its own SF member
// code + id, utm_content, a comp→code→send chain, and one-or-more audience lists.

export type DeliverableKind = "email" | "blog" | "social";
export type DeliverableTaskKind = "comp" | "code" | "send";
export type UtmSource = "pardot" | "salesforce";

// One step of a deliverable's comp → code → send hand-off chain.
export type DeliverableTask = {
  id: string;
  deliverable_id: string;
  kind: DeliverableTaskKind;
  due: string | null; // ISO yyyy-mm-dd
  owner: string | null;
};

// A staff-editable audience list with a stored reach snapshot.
export type List = {
  id: string;
  name: string;
  reach: number;
  region: string | null;
};

export type Deliverable = {
  id: string;
  // Nullable to mirror the FK; a deliverable without a campaign shouldn't occur
  // (ON DELETE CASCADE), but the column is nullable so we type it honestly.
  campaign_id: string | null;
  kind: DeliverableKind;
  name: string;
  // The SF member code — drives utm_campaign for this send.
  sf_code: string | null;
  sf_id: string | null;
  sf_name: string | null;
  utm_content: string | null;
  // Stored + editable; default "pardot", "salesforce" also allowed. Supersedes
  // the campaign-level "any SF identity → salesforce" rule for deliverables.
  utm_source: UtmSource | string;
  email_subject: string | null;
  segment: string | null;
  landing_page: string | null;
  deliver_at: string | null; // ISO timestamptz
  // Cycle 13: setup/staging date, send-time display echo, status, free notes.
  setup_date: string | null; // ISO yyyy-mm-dd
  send_time: string | null;
  status: string | null;
  notes: string | null;
  sort: number;
  created_at?: string;
};

// A deliverable with its chain + lists nested — the shape returned by getHomeData.
export type DeliverableWithMeta = Deliverable & {
  tasks: DeliverableTask[];
  lists: List[];
};

// A campaign with its events + deliverables nested — the shape from getHomeData.
export type CampaignWithEvents = Campaign & {
  events: EventLite[];
  deliverables: DeliverableWithMeta[];
};

// Editable deliverable fields submitted from the deliverable form. utm_source is
// chosen (pardot|salesforce); utm_medium/utm_campaign derive server/preview-side.
export type DeliverableInput = {
  campaign_id: string;
  kind: DeliverableKind;
  name: string;
  sf_code: string;
  sf_id: string;
  sf_name: string;
  utm_content: string;
  utm_source: string;
  email_subject: string;
  segment: string;
  landing_page: string;
  deliver_at: string | null; // ISO timestamptz or null
  setup_date: string | null;
  send_time: string;
  status: string;
  notes: string;
  sort: number;
  // The comp/code/send chain (any subset) and selected list ids.
  tasks: { kind: DeliverableTaskKind; due: string | null; owner: string }[];
  list_ids: string[];
};

// Editable campaign fields submitted from the campaign form. utm_source/medium
// are derived server-side from vendor/channel, so they aren't part of the input.
export type CampaignInput = {
  initiative_id: string;
  brand_id: string;
  name: string;
  channel: string;
  vendor: string;
  segment: string;
  owner: string;
  sf_code: string;
  sf_id: string;
  sf_name: string;
  sf_parent_id: string | null;
  utm_content: string;
  utm_campaign_override: string;
};
