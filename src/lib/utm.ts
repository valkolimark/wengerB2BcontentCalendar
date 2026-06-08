// UTM derivation + assembly, ported from reference/ContentTracker.jsx.

/** Lowercase, strip to alphanumerics — used to slugify vendors/channels. */
export const slug = (s: string): string =>
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();

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

/** Assemble the canonical UTM query string for a campaign. */
export const assembleUtm = (params: {
  source: string;
  medium: string;
  campaign: string; // Salesforce campaign code
  content: string;
}): string =>
  `?utm_source=${params.source}&utm_medium=${params.medium}` +
  `&utm_campaign=${params.campaign}&utm_content=${params.content}`;
