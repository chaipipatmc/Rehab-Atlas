import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLeadForwardEmail } from "@/lib/email/send";
import { validateOrigin } from "@/lib/csrf";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  try {
    const { id } = await params;
    const { center_id } = await request.json();

    // Verify admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Fetch lead
    const { data: lead } = await adminClient
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Fetch center
    const { data: center } = await adminClient
      .from("centers")
      .select("id, name, inquiry_email")
      .eq("id", center_id)
      .single();

    if (!center) {
      return NextResponse.json(
        { error: "Center not found" },
        { status: 404 }
      );
    }

    // Create forward record
    await adminClient.from("lead_forwards").insert({
      lead_id: id,
      center_id: center_id,
      forwarded_by: user.id,
      method: "email",
    });

    // Update lead status
    await adminClient
      .from("leads")
      .update({ status: "forwarded" })
      .eq("id", id);

    // Send email to center (if they have an inquiry email)
    if (center.inquiry_email) {
      await sendLeadForwardEmail({
        leadName: lead.name,
        leadEmail: lead.email,
        leadPhone: lead.phone || undefined,
        concern: lead.concern || "",
        message: lead.message || undefined,
        centerName: center.name,
        centerEmail: center.inquiry_email,
      }).catch((err) =>
        console.error("Failed to send forward email:", err)
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lead forward error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
