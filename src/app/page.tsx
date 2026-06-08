import { getHomeData } from "@/lib/queries";
import { key } from "@/lib/dates";
import { CalendarHome } from "@/components/calendar/CalendarHome";

// Always fetch fresh from Supabase.
export const dynamic = "force-dynamic";

export default async function Home() {
  let brands, initiatives, campaigns;
  try {
    ({ brands, initiatives, campaigns } = await getHomeData());
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return (
      <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 20px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Content Tracker</h1>
        <p style={{ marginTop: 12, color: "#b91c1c" }}>
          Could not load data from Supabase.
        </p>
        <pre
          style={{
            marginTop: 8,
            padding: 12,
            background: "#f5f5f4",
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            fontFamily: "var(--font-mono), monospace",
            fontSize: 13,
          }}
        >
          {message}
        </pre>
      </main>
    );
  }

  // Server-computed "today" so SSR and client hydration agree on the date.
  const todayKey = key(new Date());

  return (
    <CalendarHome
      brands={brands}
      initiatives={initiatives}
      campaigns={campaigns}
      todayKey={todayKey}
    />
  );
}
