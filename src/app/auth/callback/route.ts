import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/";

  // Validate next is a safe relative path: must start with "/" but not "//"
  // (double-slash would allow protocol-relative open redirects)
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Track login: update last_login and increment login_count
      if (data.session?.user?.id) {
        const admin = createAdminClient();
        // Uses the track_user_login RPC (see migration 017)
        const { error: rpcError } = await admin.rpc("track_user_login", { user_id: data.session.user.id });
        if (rpcError) {
          // Fallback if RPC not deployed yet: update last_login only
          await admin
            .from("profiles")
            .update({ last_login: new Date().toISOString() })
            .eq("id", data.session.user.id);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Could+not+authenticate`);
}
