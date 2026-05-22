/**
 * Admin: approve or reject a center edit request, apply changes to the
 * centers table (on approve), and email the partner who submitted it.
 *
 * Replaces the previous client-side direct-Supabase update so the email
 * notification can be sent server-side with the service role.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEditRequestStatusEmail } from "@/lib/agents/notify";
import { validateOrigin } from "@/lib/csrf";

export async function POST(request: Request) {
  const originError = validateOrigin(request);
  if (originError) return originError;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = (await request.json()) as {
    request_id?: string;
    action?: "approved" | "rejected";
    note?: string;
  };
  const { request_id, action, note } = body;

  if (!request_id || (action !== "approved" && action !== "rejected")) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: req, error: reqFetchError } = await admin
    .from("center_edit_requests")
    .select("id, center_id, submitted_by, changes, status")
    .eq("id", request_id)
    .single();

  if (reqFetchError || !req) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }
  if (req.status !== "pending") {
    return NextResponse.json({ error: `Already ${req.status}` }, { status: 409 });
  }

  // 1. Apply changes if approving
  if (action === "approved") {
    const { error: centerError } = await admin
      .from("centers")
      .update(req.changes as Record<string, unknown>)
      .eq("id", req.center_id);
    if (centerError) {
      return NextResponse.json({ error: "Failed to apply changes" }, { status: 500 });
    }
  }

  // 2. Update request status
  const { error: updateError } = await admin
    .from("center_edit_requests")
    .update({
      status: action,
      review_note: note?.trim() || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", request_id);
  if (updateError) {
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }

  // 3. Email the submitter — best-effort, never blocks the response
  try {
    const [{ data: partner }, { data: center }] = await Promise.all([
      admin
        .from("profiles")
        .select("email, full_name")
        .eq("id", req.submitted_by)
        .single(),
      admin
        .from("centers")
        .select("name, slug")
        .eq("id", req.center_id)
        .single(),
    ]);

    if (partner?.email && center?.name && center?.slug) {
      await sendEditRequestStatusEmail({
        to: partner.email,
        partnerName: partner.full_name || null,
        centerName: center.name,
        centerSlug: center.slug,
        decision: action,
        reviewNote: note?.trim() || null,
      });
    }
  } catch (err) {
    console.error("Edit request notification email failed:", err);
  }

  return NextResponse.json({ success: true, decision: action });
}
