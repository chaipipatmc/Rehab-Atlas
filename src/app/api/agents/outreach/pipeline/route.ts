/**
 * Outreach Pipeline CRUD API
 * Manages pipeline entries: list, add centers, update stages.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addCentersToPipeline } from "@/lib/agents/outreach/orchestrator";

// GET: List pipeline entries with optional filters
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const url = new URL(request.url);
  const stage = url.searchParams.get("stage");
  const search = url.searchParams.get("search");
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const admin = createAdminClient();
  let query = admin
    .from("outreach_pipeline")
    .select("*, centers!inner(name, country, city, email, inquiry_email, website_url)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (stage && stage !== "all") {
    query = query.eq("stage", stage);
  }

  if (search) {
    query = query.ilike("centers.name", `%${search}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch pipeline" }, { status: 500 });
  }

  return NextResponse.json({ data, total: count || 0, page, limit });
}

// POST: Add centers to pipeline or update a pipeline entry
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await request.json();

  // Add centers to pipeline
  if (body.action === "add_centers" && Array.isArray(body.center_ids)) {
    const added = await addCentersToPipeline(body.center_ids);
    return NextResponse.json({ success: true, added });
  }

  // Update pipeline entry
  if (body.action === "update" && body.pipeline_id) {
    const admin = createAdminClient();
    const allowedFields = [
      "stage", "notes", "proposed_commission_rate", "agreed_commission_rate",
      "agreed_commission_type", "blog_tier", "special_terms",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { error } = await admin
      .from("outreach_pipeline")
      .update(updates)
      .eq("id", body.pipeline_id);

    if (error) {
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
