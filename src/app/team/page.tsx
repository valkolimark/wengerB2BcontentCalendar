import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { TeamTable } from "@/components/team/TeamTable";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const profile = await getCurrentProfile();
  // Admin-only. Non-admins are bounced even if they guess the URL (RLS also
  // denies the profile reads).
  if (profile?.role !== "admin") redirect("/");

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, role, can_see_financials")
    .order("email");

  return (
    <TeamTable profiles={(data ?? []) as Profile[]} currentUserId={profile.id} />
  );
}
