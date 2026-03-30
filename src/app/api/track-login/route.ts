import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const admin = createAdminClient();

    // Try RPC first, fallback to direct update
    const { error: rpcError } = await admin.rpc("track_user_login", { user_id: user.id });
    if (rpcError) {
      await admin
        .from("profiles")
        .update({
          last_login: new Date().toISOString(),
          login_count: 1, // At minimum set to 1
        })
        .eq("id", user.id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
