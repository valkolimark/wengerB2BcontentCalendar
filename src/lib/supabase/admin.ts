// Server-only Supabase admin client (service-role key). Bypasses RLS and can
// use the Auth Admin API (create/delete users, set passwords). NEVER import
// this into client code — the service-role key must never reach the browser.
// Guarded behind requireAdmin() in every action that uses it.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
