import { createClient } from "@/lib/supabase/server";
import { EditRequestActions } from "@/components/admin/edit-request-actions";
import Link from "next/link";
import {
  Clock, CheckCircle, XCircle, Building2, ArrowRight,
  Plus, Minus, RefreshCw, ExternalLink, Pencil,
} from "lucide-react";

// Friendly field labels
const FIELD_LABELS: Record<string, string> = {
  short_description: "Short Description",
  description: "Full Description",
  phone: "Phone",
  email: "Email",
  website_url: "Website",
  pricing_text: "Pricing",
  address: "Address",
  city: "City",
  state_province: "State / Province",
  country: "Country",
  treatment_focus: "Treatment Focus",
  conditions: "Conditions / Amenities",
  services: "Services",
  treatment_methods: "Treatment Methods",
  setting_type: "Setting Type",
  program_length: "Program Length",
  languages: "Languages",
  has_detox: "Medical Detox Available",
  clinical_director: "Clinical Director",
  medical_director: "Medical Director",
  price_min: "Price From (USD)",
  price_max: "Price To (USD)",
  insurance: "Insurance Accepted",
  accreditation: "Accreditation",
  occupancy: "Capacity / Beds",
  substance_use: "Substance Use",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  return String(value);
}

export default async function AdminEditRequestsPage() {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("center_edit_requests")
    .select("*, center:centers(name, slug, short_description, phone, email, website_url, pricing_text, address, city, state_province, country, treatment_focus, conditions, services, treatment_methods, setting_type, program_length, languages, has_detox, clinical_director, medical_director, price_min, price_max, insurance, accreditation, occupancy, substance_use, description)")
    .order("created_at", { ascending: false });

  const pendingCount = requests?.filter(r => r.status === "pending").length || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-foreground">Edit Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and approve center profile changes submitted by partners
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
            <Clock className="h-3.5 w-3.5" />
            {pendingCount} pending
          </span>
        )}
      </div>

      {(!requests || requests.length === 0) ? (
        <div className="text-center py-20 bg-surface-container-lowest rounded-2xl shadow-ambient">
          <CheckCircle className="h-10 w-10 mx-auto text-emerald-400 mb-3" />
          <p className="text-foreground font-medium">All caught up</p>
          <p className="text-sm text-muted-foreground mt-1">No edit requests to review.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((req) => {
            const centerName = (req.center as Record<string, unknown> | null)?.name as string || "Unknown Center";
            const centerSlug = (req.center as Record<string, unknown> | null)?.slug as string || "";
            const centerData = req.center as Record<string, unknown> | null;
            const changes = req.changes as Record<string, unknown>;
            const changedFields = Object.keys(changes);
            const isPending = req.status === "pending";
            const isApproved = req.status === "approved";

            return (
              <div
                key={req.id}
                className={`bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden ${
                  isPending ? "ring-1 ring-amber-200" : ""
                }`}
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-surface-container-high flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-emerald-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{centerName}</h3>
                        {centerSlug && (
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/centers/${centerSlug}?preview=1`}
                              target="_blank"
                              className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                              title="Preview public page"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Preview
                            </Link>
                            <span className="text-muted-foreground">·</span>
                            <Link
                              href={`/admin/centers/${req.center_id}`}
                              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                              title="Edit in admin"
                            >
                              <Pencil className="h-3 w-3" />
                              Admin
                            </Link>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Submitted {new Date(req.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{changedFields.length} field{changedFields.length !== 1 ? "s" : ""} changed</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-2.5 py-1 rounded-full ${
                      isPending ? "text-amber-700 bg-amber-50" :
                      isApproved ? "text-emerald-700 bg-emerald-50" :
                      "text-red-700 bg-red-50"
                    }`}>
                      {isPending ? <Clock className="h-3 w-3" /> : isApproved ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Changes diff */}
                <div className="px-6 py-4">
                  <div className="space-y-3">
                    {changedFields.map((field) => {
                      const newValue = changes[field];
                      const oldValue = centerData?.[field];
                      const label = FIELD_LABELS[field] || field.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                      const isArray = Array.isArray(newValue);
                      const oldFormatted = formatValue(oldValue);
                      const newFormatted = formatValue(newValue);

                      // For arrays, show added/removed items
                      if (isArray && Array.isArray(oldValue)) {
                        const added = (newValue as string[]).filter(v => !(oldValue as string[]).includes(v));
                        const removed = (oldValue as string[]).filter(v => !(newValue as string[]).includes(v));
                        const unchanged = (newValue as string[]).filter(v => (oldValue as string[]).includes(v));

                        return (
                          <div key={field} className="bg-surface-container/30 rounded-xl p-4">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">{label}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {unchanged.map((v, i) => (
                                <span key={`u-${i}`} className="px-2 py-0.5 rounded-full text-xs bg-surface-container text-muted-foreground">
                                  {v}
                                </span>
                              ))}
                              {added.map((v, i) => (
                                <span key={`a-${i}`} className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                                  <Plus className="h-2.5 w-2.5" /> {v}
                                </span>
                              ))}
                              {removed.map((v, i) => (
                                <span key={`r-${i}`} className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 line-through flex items-center gap-0.5">
                                  <Minus className="h-2.5 w-2.5" /> {v}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      }

                      // For text/scalar fields, show old → new
                      return (
                        <div key={field} className="bg-surface-container/30 rounded-xl p-4">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
                            <RefreshCw className="h-3 w-3" /> {label}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] uppercase tracking-wider text-red-500 mb-0.5">Before</p>
                              <p className="text-sm text-muted-foreground bg-red-50 rounded-lg px-3 py-2 break-words line-clamp-3">
                                {oldFormatted}
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-5 hidden sm:block" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] uppercase tracking-wider text-emerald-600 mb-0.5">After</p>
                              <p className="text-sm text-foreground bg-emerald-50 rounded-lg px-3 py-2 break-words line-clamp-3">
                                {newFormatted}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Review note if exists */}
                {req.review_note && (
                  <div className="px-6 pb-3">
                    <div className="bg-surface-container-low rounded-lg px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Review Note</p>
                      <p className="text-sm text-foreground">{req.review_note}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {isPending && (
                  <div className="px-6 py-4 border-t border-surface-container-high bg-surface-container/20">
                    <EditRequestActions
                      requestId={req.id}
                      centerId={req.center_id}
                      changes={changes}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
