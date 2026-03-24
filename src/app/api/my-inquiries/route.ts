import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // Get the authenticated user via server client (respects cookies)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Use admin client to query leads — leads table is admin-only via RLS
    // We match by email so users only see their own submissions
    const admin = createAdminClient();
    const { data: leads, error } = await admin
      .from("leads")
      .select(`
        id,
        status,
        created_at,
        concern,
        preferred_center_id,
        centers:preferred_center_id (name)
      `)
      .eq("email", user.email)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch inquiries" }, { status: 500 });
    }

    // Return only safe fields — no admin_notes, no contact details from other users
    const safeLeads = (leads || []).map((lead) => ({
      id: lead.id,
      status: lead.status,
      created_at: lead.created_at,
      concern: lead.concern,
      preferred_center_name: (lead.centers as unknown as { name: string } | null)?.name ?? null,
    }));

    return NextResponse.json({ inquiries: safeLeads });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
