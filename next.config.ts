import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// Supabase origin for the CSP connect-src (REST + realtime). Falls back to a
// wildcard if the env var isn't present at build time.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://*.supabase.co";
const supabaseWss = supabaseUrl.replace(/^https:/, "wss:");

// Content-Security-Policy. `unsafe-inline` is required for Next's inline
// bootstrap scripts and the app's inline style attributes (brand colors are
// data). Fonts are self-hosted by next/font, but Google origins are allowed as
// a safety net. Supabase origin is whitelisted for data + realtime.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  `connect-src 'self' ${supabaseUrl} ${supabaseWss}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so a stray lockfile elsewhere
  // (e.g. in the home directory) doesn't get picked as the root.
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
