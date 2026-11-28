/**
 * Admin content mutations for /admin/content/[id] (server-side admin check).
 *
 * PATCH  /api/admin/content/:id  body = allowed fields (lib/content/page-update.ts)
 * DELETE /api/admin/content/:id  (UI still asks for confirmation first)
 *
 * After every change the public pages that render the row (old and new slug)
 * are revalidated so edits, unpublishing and deletes show up immediately
 * instead of after the ISR window (24h for /blog/[slug]).
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateOrigin } from "@/lib/csrf";
import { verifyAdmin } from "@/lib/auth/verify-admin";
import { pageUpdateSchema, pathsForPage, withPublishDate } from "@/lib/content/page-update";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ id: string }> };

function revalidateAll(paths: string[]) {
  for (const p of new Set(paths)) revalidatePath(p);
}

async function loadCurrent(id: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("pages")
    .select("id, slug, page_type, published_at")
    .eq("id", id)
    .maybeSingle();
  return data as { id: string; slug: string | null; page_type: string | null; published_at: string | null } | null;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = pageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fields", details: parsed.error.flatten() }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const current = await loadCurrent(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update = withPublishDate(parsed.data, current);
  const admin = createAdminClient();
  const { data: saved, error } = await admin
    .from("pages")
    .update(update)
    .eq("id", id)
    .select("slug, page_type, status, published_at")
    .single();

  if (error) {
    console.error("Content update failed:", { code: error.code, message: error.message });
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json(
      { error: status === 409 ? "Slug already in use" : "Failed to save" },
      { status }
    );
  }

  revalidateAll([
    ...pathsForPage(current.page_type, current.slug),
    ...pathsForPage(saved.page_type, saved.slug),
  ]);

  return NextResponse.json({ ok: true, page: saved });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const csrfError = validateOrigin(request);
  if (csrfError) return csrfError;

  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const current = await loadCurrent(id);
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();
  const { error } = await admin.from("pages").delete().eq("id", id);
  if (error) {
    console.error("Content delete failed:", { code: error.code, message: error.message });
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  revalidateAll(pathsForPage(current.page_type, current.slug));
  return NextResponse.json({ ok: true });
}
