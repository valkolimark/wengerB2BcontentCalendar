import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client (anon key) for use in Server Components, Route
 * Handlers, and Server Actions. Cookie wiring is in place for when Auth lands
 * in Cycle 5; until then there is no session and reads hit public tables.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component where cookies can't be set —
            // safe to ignore when middleware refreshes the session.
          }
        },
      },
    }
  );
}
