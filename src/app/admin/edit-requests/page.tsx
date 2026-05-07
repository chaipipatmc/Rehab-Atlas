import { createClient } from "@/lib/supabase/server";
import { Clock } from "lucide-react";
import { EditRequestsList, type EditRequest } from "@/components/admin/edit-requests-list";

export const dynamic = "force-dynamic";

export default async function AdminEditRequestsPage() {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("center_edit_requests")
    .select(
      "*, center:centers(name, slug, short_description, phone, email, website_url, pricing_text, address, city, state_province, country, treatment_focus, conditions, services, treatment_methods, setting_type, program_length, languages, has_detox, clinical_director, medical_director, price_min, price_max, insurance, accreditation, occupancy, substance_use, description)"
    )
    .order("created_at", { ascending: false });

  const list = (requests || []) as unknown as EditRequest[];
  const pendingCount = list.filter((r) => r.status === "pending").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Edit Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve center profile changes submitted by partners.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
            <Clock className="h-3.5 w-3.5" />
            {pendingCount} pending
          </span>
        )}
      </div>

      <EditRequestsList requests={list} />
    </div>
  );
}
