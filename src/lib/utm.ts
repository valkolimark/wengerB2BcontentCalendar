// UTM derivation + assembly, ported from reference/ContentTracker.jsx.

/** Lowercase, strip to alphanumerics — used to slugify vendors/channels. */
export const slug = (s: string): string =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

/** Channel options for the campaign form (ported from the prototype). */
export const CHANNELS = [
  "Email",
  "Email Sponsorship",
  "Banner Ads",
  "Search Ads",
  "Webinar",
  "Social",
  "Newsletter",
];

const MEDIUM_MAP: Record<string, string> = {
  email: "email",
  "email sponsorship": "email",
  "banner ads": "display",
  "search ads": "cpc",
  webinar: "event",
  social: "social",
  newsletter: "email",
};

/** Map a channel to its UTM medium (defaults to "referral"). */
export const deriveMedium = (channel: string): string =>
  MEDIUM_MAP[(channel || "").toLowerCase()] || "referral";

/**
 * Derive the UTM source. Owned/direct vendors resolve from the channel
 * (email channels → "email", otherwise the slugified channel); paid vendors
 * resolve to the slugified vendor name.
 */
export const deriveSource = (vendor: string, channel: string): string => {
  if (/owned|direct|n\/a/i.test(vendor || "")) {
    return deriveMedium(channel) === "email" ? "email" : slug(channel);
  }
  return slug(vendor);
};

/** Whether a campaign carries any Salesforce identity (code / id / name). */
export const hasSalesforce = (sf: {
  sf_code?: string | null;
  sf_id?: string | null;
  sf_name?: string | null;
}): boolean =>
  [sf.sf_code, sf.sf_id, sf.sf_name].some((v) => (v ?? "").trim() !== "");

/**
 * Resolve utm_source. If a campaign carries any Salesforce identity, the source
 * is forced to "salesforce"; otherwise it derives from vendor/channel as before.
 * Used by BOTH the modal preview and the server action so they can't diverge.
 */
export const resolveSource = (params: {
  vendor: string;
  channel: string;
  sf_code?: string | null;
  sf_id?: string | null;
  sf_name?: string | null;
}): string =>
  hasSalesforce(params) ? "salesforce" : deriveSource(params.vendor, params.channel);

/** Assemble the canonical UTM query string for a campaign. */
export const assembleUtm = (params: {
  source: string;
  medium: string;
  campaign: string; // Salesforce campaign code
  content: string;
}): string =>
  `?utm_source=${params.source}&utm_medium=${params.medium}` +
  `&utm_campaign=${params.campaign}&utm_content=${params.content}`;
