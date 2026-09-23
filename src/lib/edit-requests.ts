/**
 * Shared "apply an approved center_edit_request" logic.
 *
 * Partner edit requests store column changes for `centers` **plus** an
 * optional `staff` array that belongs in `center_staff`. Both approval paths
 * (admin dashboard + agent email action link) used to pass the whole payload
 * to `centers.update()`, so any request containing `staff` was rejected by
 * PostgREST ("column staff does not exist"), yet the request was still marked
 * approved and the partner got an "approved" email. Nothing was applied
 * (IbogaQuest May 2026, ZorbaWellness April 2026).
 */

import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type StaffChange = {
  id?: string;
  name?: string;
  position?: string;
  credentials?: string | null;
  photo_url?: string | null;
  bio?: string | null;
  isNew?: boolean;
};

export type ApplyResult = { error: string | null; appliedColumns: string[]; appliedStaff: number };

export async function applyEditRequestChanges(
  admin: AdminClient,
  centerId: string,
  changes: Record<string, unknown>
): Promise<ApplyResult> {
  const { staff, ...columnChanges } = changes as { staff?: unknown } & Record<string, unknown>;
  const appliedColumns = Object.keys(columnChanges);

  if (appliedColumns.length > 0) {
    const { error } = await admin.from("centers").update(columnChanges).eq("id", centerId);
    if (error) return { error: `centers update failed: ${error.message}`, appliedColumns: [], appliedStaff: 0 };
  }

  let appliedStaff = 0;
  if (Array.isArray(staff)) {
    for (const [i, raw] of (staff as StaffChange[]).entries()) {
      const name = raw?.name?.trim();
      if (!name) continue;
      const row = {
        center_id: centerId,
        name,
        position: raw.position?.trim() || "Staff member",
        credentials: raw.credentials?.trim() || null,
        photo_url: raw.photo_url || null,
        bio: raw.bio?.trim() || null,
        sort_order: i,
      };

      if (raw.id && !raw.isNew) {
        const { error } = await admin
          .from("center_staff")
          .update(row)
          .eq("id", raw.id)
          .eq("center_id", centerId);
        if (error) return { error: `center_staff update failed: ${error.message}`, appliedColumns, appliedStaff };
      } else {
        // Idempotent for re-runs: skip if an identical name already exists for this center.
        const { data: existing } = await admin
          .from("center_staff")
          .select("id")
          .eq("center_id", centerId)
          .eq("name", name)
          .maybeSingle();
        if (existing?.id) {
          const { error } = await admin.from("center_staff").update(row).eq("id", existing.id);
          if (error) return { error: `center_staff update failed: ${error.message}`, appliedColumns, appliedStaff };
        } else {
          const { error } = await admin.from("center_staff").insert(row);
          if (error) return { error: `center_staff insert failed: ${error.message}`, appliedColumns, appliedStaff };
        }
      }
      appliedStaff++;
    }
  }

  return { error: null, appliedColumns, appliedStaff };
}
