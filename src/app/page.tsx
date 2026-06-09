import { getHomeData } from "@/lib/queries";
import { key } from "@/lib/dates";
import { CalendarHome } from "@/components/calendar/CalendarHome";

// Always fetch fresh from Supabase, in the caller's auth context.
export const dynamic = "force-dynamic";

export default async function Home() {
  const {
    brands,
    initiatives,
    campaigns,
    sfParents,
    canSeeFinancials,
    role,
    userEmail,
  } = await getHomeData();

  // Server-computed "today" so SSR and client hydration agree on the date.
  const todayKey = key(new Date());

  return (
    <CalendarHome
      brands={brands}
      initiatives={initiatives}
      campaigns={campaigns}
      sfParents={sfParents}
      todayKey={todayKey}
      role={role}
      canSeeFinancials={canSeeFinancials}
      userEmail={userEmail}
    />
  );
}
