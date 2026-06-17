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
  // Two-stop [light, dark] gradient derived from dot. Used by the Vivid theme
  // for launch fills, accent bars, and glows; ignored by light/dark.
  grad: [string, string];
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
  type: EventType;
  label: string;
  brandId: string;
  campaignId: string;
  campaignName: string;
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
  leads: number;
  pipeline: number;
};

// A campaign with its events nested — the shape returned by getHomeData.
export type CampaignWithEvents = Campaign & { events: EventLite[] };

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
};
