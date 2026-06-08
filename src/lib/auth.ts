// Server-side auth helpers. Imported by Server Actions and server components —
// never by client components. Reads the caller's profile (role + financial flag)
// from the authenticated Supabase session.
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

/** The current caller's profile, or null if unauthenticated. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, role, can_see_financials")
    .eq("id", user.id)
    .maybeSingle();

  // Fall back to a safe default if the profile row is momentarily missing.
  if (!data) {
    return {
      id: user.id,
      email: user.email ?? null,
      role: "member",
      can_see_financials: false,
    };
  }
  return {
    id: data.id,
    email: data.email ?? user.email ?? null,
    role: data.role as Role,
    can_see_financials: data.can_see_financials,
  };
}

export const isStaff = (p: Profile | null) =>
  p?.role === "admin" || p?.role === "member";

export const entitledToFinancials = (p: Profile | null) =>
  p?.role === "admin" || p?.can_see_financials === true;

/** Throw unless the caller is staff (admin or member). */
export async function requireStaff(): Promise<Profile> {
  const p = await getCurrentProfile();
  if (!isStaff(p)) throw new Error("Not authorized.");
  return p!;
}

/** Throw unless the caller is an admin. */
export async function requireAdmin(): Promise<Profile> {
  const p = await getCurrentProfile();
  if (p?.role !== "admin") throw new Error("Admins only.");
  return p;
}
