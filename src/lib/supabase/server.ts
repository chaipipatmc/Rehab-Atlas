import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}

/**
 * Cookieless Supabase client for public Server Components. Use this on pages
 * that only read anon-accessible (status='published') data — /, /blog,
 * /blog/[slug], /centers, /centers/[slug], /rehab/[condition], etc.
 *
 * The standard createClient() reads cookies() to bind to the user's auth
 * session, which is a dynamic API in Next 15+ — that forces the entire page
 * into dynamic rendering and bypasses `export const revalidate`. By skipping
 * cookies we keep the page eligible for ISR + edge caching, which is the
 * single biggest win for cold-hit latency on public pages.
 *
 * Do NOT use this when the page needs the current user (auth, saved centers,
 * role checks) — use createClient() for those.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
