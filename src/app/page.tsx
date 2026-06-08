import { getCalendarData } from "@/lib/queries";
import { CalendarHome } from "@/components/calendar/CalendarHome";

// Always fetch fresh from Supabase.
export const dynamic = "force-dynamic";

export default async function Home() {
  let brands, events;
  try {
    ({ brands, events } = await getCalendarData());
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return (
      <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 20px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Content Tracker</h1>
        <p style={{ marginTop: 12, color: "#b91c1c" }}>
          Could not load calendar data from Supabase.
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

  return <CalendarHome brands={brands} events={events} />;
}
