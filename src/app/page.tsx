import { createClient } from "@/lib/supabase/server";
import type { Brand, Campaign, Initiative } from "@/lib/types";

// Always fetch fresh — this page exists to prove the live data path.
export const dynamic = "force-dynamic";

const hasEnv = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

type LoadResult =
  | { ok: true; brands: Brand[]; initiatives: Initiative[]; campaigns: Campaign[] }
  | { ok: false; error: string };

async function load(): Promise<LoadResult> {
  if (!hasEnv()) {
    return {
      ok: false,
      error:
        "Supabase env vars are not set. Copy .env.example to .env.local and fill in your project URL and anon key.",
    };
  }

  try {
    const supabase = await createClient();
    const [brands, initiatives, campaigns] = await Promise.all([
      supabase.from("brands").select("*").order("label"),
      supabase.from("initiatives").select("*").order("name"),
      supabase.from("campaigns").select("*"),
    ]);

    const err = brands.error || initiatives.error || campaigns.error;
    if (err) return { ok: false, error: err.message };

    return {
      ok: true,
      brands: (brands.data ?? []) as Brand[],
      initiatives: (initiatives.data ?? []) as Initiative[],
      campaigns: (campaigns.data ?? []) as Campaign[],
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function Home() {
  const result = await load();

  if (!result.ok) {
    return (
      <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 20px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Content Tracker — data check</h1>
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
          {result.error}
        </pre>
      </main>
    );
  }

  const { brands, initiatives, campaigns } = result;
  const brandDot = new Map(brands.map((b) => [b.id, b.dot]));

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 20px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600 }}>Content Tracker — data check</h1>
      <p style={{ marginTop: 6, color: "#57534e" }}>
        Cycle 1 proof of wiring. Data is fetched live from Supabase. The real
        calendar UI arrives in Cycle 2.
      </p>

      <ul
        style={{
          display: "flex",
          gap: 24,
          listStyle: "none",
          padding: 0,
          margin: "20px 0",
        }}
      >
        <li>
          <strong style={{ fontSize: 26 }}>{brands.length}</strong>{" "}
          <span style={{ color: "#78716c" }}>brands</span>
        </li>
        <li>
          <strong style={{ fontSize: 26 }}>{initiatives.length}</strong>{" "}
          <span style={{ color: "#78716c" }}>initiatives</span>
        </li>
        <li>
          <strong style={{ fontSize: 26 }}>{campaigns.length}</strong>{" "}
          <span style={{ color: "#78716c" }}>campaigns</span>
        </li>
      </ul>

      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e7e5e4" }}>
            <th style={{ padding: "8px 6px", fontWeight: 600 }}>Initiative</th>
            <th style={{ padding: "8px 6px", fontWeight: 600 }}>Campaigns</th>
            <th style={{ padding: "8px 6px", fontWeight: 600 }}>Brands</th>
          </tr>
        </thead>
        <tbody>
          {initiatives.map((init) => {
            const camps = campaigns.filter((c) => c.initiative_id === init.id);
            const dots = [...new Set(camps.map((c) => c.brand_id))];
            return (
              <tr key={init.id} style={{ borderBottom: "1px solid #f5f5f4" }}>
                <td style={{ padding: "8px 6px" }}>{init.name}</td>
                <td style={{ padding: "8px 6px" }}>{camps.length}</td>
                <td style={{ padding: "8px 6px" }}>
                  <span style={{ display: "inline-flex", gap: 4 }}>
                    {dots.map((id) => (
                      <span
                        key={id}
                        title={id}
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          background: brandDot.get(id) ?? "#d6d3d1",
                          display: "inline-block",
                        }}
                      />
                    ))}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
