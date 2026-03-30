import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateOrigin } from "@/lib/csrf";

/** GET — load FAQs for the authenticated partner's center */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, center_id")
    .eq("id", user.id)
    .single();

  if (!profile?.center_id) {
    return NextResponse.json({ error: "No center linked" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: faqs, error } = await admin
    .from("center_faqs")
    .select("*")
    .eq("center_id", profile.center_id)
    .order("sort_order");

  if (error) return NextResponse.json({ error: "Failed to load FAQs" }, { status: 500 });
  return NextResponse.json({ faqs });
}

/** POST — create, update, or delete a FAQ */
export async function POST(req: Request) {
  const csrfError = validateOrigin(req);
  if (csrfError) return csrfError;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, center_id")
    .eq("id", user.id)
    .single();

  if (!profile?.center_id) {
    return NextResponse.json({ error: "No center linked" }, { status: 403 });
  }

  const body = await req.json();
  const { action } = body;
  const admin = createAdminClient();

  // ── CREATE ──
  if (action === "create") {
    const { question, answer, sort_order } = body;
    if (!question?.trim() || !answer?.trim()) {
      return NextResponse.json({ error: "Question and answer are required" }, { status: 400 });
    }

    const { data: faq, error } = await admin
      .from("center_faqs")
      .insert({
        center_id: profile.center_id,
        question: question.trim(),
        answer: answer.trim(),
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Failed to create FAQ" }, { status: 500 });
    return NextResponse.json({ faq });
  }

  // ── UPDATE ──
  if (action === "update") {
    const { id, question, answer, sort_order } = body;
    if (!id) return NextResponse.json({ error: "FAQ id required" }, { status: 400 });

    // Verify ownership
    const { data: existing } = await admin
      .from("center_faqs")
      .select("center_id")
      .eq("id", id)
      .single();

    if (!existing || existing.center_id !== profile.center_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    if (question !== undefined) updates.question = question.trim();
    if (answer !== undefined) updates.answer = answer.trim();
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const { data: faq, error } = await admin
      .from("center_faqs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: "Failed to update FAQ" }, { status: 500 });
    return NextResponse.json({ faq });
  }

  // ── DELETE ──
  if (action === "delete") {
    const { id } = body;
    if (!id) return NextResponse.json({ error: "FAQ id required" }, { status: 400 });

    // Verify ownership
    const { data: existing } = await admin
      .from("center_faqs")
      .select("center_id")
      .eq("id", id)
      .single();

    if (!existing || existing.center_id !== profile.center_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await admin.from("center_faqs").delete().eq("id", id);
    if (error) return NextResponse.json({ error: "Failed to delete FAQ" }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
