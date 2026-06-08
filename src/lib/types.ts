// Core domain types for the Wenger B2B content calendar.
// Field names mirror the database columns (snake_case) so rows fetched from
// Supabase map onto these types directly.

export type Role = "admin" | "viewer" | "jmc";

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

export type CampaignEvent = {
  id: string;
  campaign_id: string;
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
  utm_source: string;
  utm_medium: string;
  utm_content: string;
  leads: number;
  pipeline: number;
};
