"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Pencil,
  Plus,
  Minus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { EditRequestActions } from "@/components/admin/edit-request-actions";

// ─── Field labels ───────────────────────────────────────────────────────────

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

function fieldLabel(field: string): string {
  return (
    FIELD_LABELS[field] || field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  return String(value);
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EditRequest {
  id: string;
  center_id: string;
  changes: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | string;
  created_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  center: Record<string, unknown> | null;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

interface Props {
  requests: EditRequest[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EditRequestsList({ requests }: Props) {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Counts
  const counts = useMemo(() => {
    const c = { all: requests.length, pending: 0, approved: 0, rejected: 0 };
    for (const r of requests) {
      if (r.status === "pending") c.pending++;
      else if (r.status === "approved") c.approved++;
      else if (r.status === "rejected") c.rejected++;
    }
    return c;
  }, [requests]);

  // Default to pending if there are any, otherwise show all
  const effectiveFilter: StatusFilter = filter === "pending" && counts.pending === 0 ? "all" : filter;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (effectiveFilter !== "all" && r.status !== effectiveFilter) return false;
      if (q) {
        const name = ((r.center?.name as string) || "").toLowerCase();
        const fields = Object.keys(r.changes).join(" ").toLowerCase();
        if (!name.includes(q) && !fields.includes(q)) return false;
      }
      return true;
    });
  }, [requests, effectiveFilter, search]);

  function toggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id));
  }

  return (
    <div>
      {/* ── Filter + search bar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 bg-surface-container-low rounded-full p-1">
          {([
            { key: "pending", label: "Pending", count: counts.pending },
            { key: "approved", label: "Approved", count: counts.approved },
            { key: "rejected", label: "Rejected", count: counts.rejected },
            { key: "all", label: "All", count: counts.all },
          ] as { key: StatusFilter; label: string; count: number }[]).map((f) => {
            const active = effectiveFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label} <span className="opacity-60">{f.count}</span>
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search center or field..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-full ghost-border text-xs"
          />
        </div>
      </div>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest rounded-2xl shadow-ambient">
          <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-400 mb-3" />
          <p className="text-foreground font-medium">
            {effectiveFilter === "pending" ? "No pending requests" : "No requests match your filters"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {effectiveFilter === "pending"
              ? "All caught up — partners' changes are up to date."
              : "Try a different filter or search term."}
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
          <div className="divide-y divide-surface-container-low">
            {filtered.map((req) => (
              <RequestRow
                key={req.id}
                req={req}
                isExpanded={expanded === req.id}
                onToggle={() => toggleExpand(req.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

function RequestRow({
  req,
  isExpanded,
  onToggle,
}: {
  req: EditRequest;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const center = (req.center || {}) as Record<string, unknown>;
  const centerName = (center.name as string) || "Unknown Center";
  const centerSlug = (center.slug as string) || "";
  const changes = req.changes;
  const fields = Object.keys(changes);
  const isPending = req.status === "pending";
  const isApproved = req.status === "approved";

  const StatusIcon = isPending ? Clock : isApproved ? CheckCircle2 : XCircle;
  const statusPill = isPending
    ? "bg-amber-50 text-amber-700"
    : isApproved
    ? "bg-emerald-50 text-emerald-700"
    : "bg-red-50 text-red-700";
  const statusDot = isPending ? "bg-amber-400" : isApproved ? "bg-emerald-400" : "bg-red-400";

  // Build a compact teaser: first 3 changed fields
  const fieldTeaser = fields.slice(0, 3).map((f) => fieldLabel(f)).join(", ");
  const moreFields = fields.length - 3;

  return (
    <div className={isExpanded ? "bg-surface-container-low/30" : ""}>
      {/* Compact row */}
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-surface-container-low/40 transition-colors"
      >
        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${statusDot}`} />
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        )}

        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <Building2 className="h-3.5 w-3.5 text-emerald-700" />
        </div>

        <div className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p className="text-sm font-medium text-foreground truncate">{centerName}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {fields.length} {fields.length === 1 ? "field" : "fields"}
            {fieldTeaser && <span className="ml-1.5">· {fieldTeaser}</span>}
            {moreFields > 0 && <span className="opacity-60"> +{moreFields}</span>}
          </p>
        </div>

        <span className="text-[11px] text-muted-foreground tabular-nums flex-shrink-0">
          {relativeTime(req.created_at)}
        </span>

        <span
          className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-2.5 py-0.5 rounded-full ${statusPill}`}
        >
          <StatusIcon className="h-3 w-3" />
          {req.status}
        </span>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-1 border-t border-surface-container-low">
          {/* Center quick links */}
          <div className="flex items-center gap-3 mb-4 text-[11px]">
            {centerSlug && (
              <Link
                href={`/centers/${centerSlug}?preview=1`}
                target="_blank"
                className="text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Preview public page
              </Link>
            )}
            <Link
              href={`/admin/centers/${req.center_id}`}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" />
              Edit in admin
            </Link>
            <span className="text-muted-foreground ml-auto">
              Submitted{" "}
              {new Date(req.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* Diff */}
          <div className="space-y-2.5">
            {fields.map((field) => (
              <FieldDiff
                key={field}
                field={field}
                newValue={changes[field]}
                oldValue={center[field]}
              />
            ))}
          </div>

          {/* Existing review note (if reviewed) */}
          {req.review_note && (
            <div className="bg-surface-container-low rounded-lg px-3 py-2 mt-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                Review Note
              </p>
              <p className="text-sm text-foreground">{req.review_note}</p>
            </div>
          )}

          {/* Action panel — only when pending */}
          {isPending && (
            <div className="mt-4 pt-4 border-t border-surface-container-low">
              <EditRequestActions
                requestId={req.id}
                centerId={req.center_id}
                changes={changes}
              />
            </div>
          )}

          {/* Read-only metadata for reviewed requests */}
          {!isPending && req.reviewed_at && (
            <p className="text-[10px] text-muted-foreground mt-3">
              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}{" "}
              {new Date(req.reviewed_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Diff renderer ──────────────────────────────────────────────────────────

function FieldDiff({
  field,
  newValue,
  oldValue,
}: {
  field: string;
  newValue: unknown;
  oldValue: unknown;
}) {
  const label = fieldLabel(field);
  const isArray = Array.isArray(newValue);

  if (isArray && Array.isArray(oldValue)) {
    const newArr = newValue as string[];
    const oldArr = oldValue as string[];
    const added = newArr.filter((v) => !oldArr.includes(v));
    const removed = oldArr.filter((v) => !newArr.includes(v));
    const unchanged = newArr.filter((v) => oldArr.includes(v));
    const noChange = added.length === 0 && removed.length === 0;

    return (
      <div className="bg-surface-container/30 rounded-xl p-3.5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3" />
          {label}
          {!noChange && (
            <span className="ml-auto flex items-center gap-2 text-[10px]">
              {added.length > 0 && (
                <span className="text-emerald-600">+{added.length}</span>
              )}
              {removed.length > 0 && (
                <span className="text-red-600">−{removed.length}</span>
              )}
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {unchanged.map((v, i) => (
            <span
              key={`u-${i}`}
              className="px-2 py-0.5 rounded-full text-xs bg-surface-container text-muted-foreground"
            >
              {v}
            </span>
          ))}
          {added.map((v, i) => (
            <span
              key={`a-${i}`}
              className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 flex items-center gap-0.5"
            >
              <Plus className="h-2.5 w-2.5" /> {v}
            </span>
          ))}
          {removed.map((v, i) => (
            <span
              key={`r-${i}`}
              className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 line-through flex items-center gap-0.5"
            >
              <Minus className="h-2.5 w-2.5" /> {v}
            </span>
          ))}
        </div>
      </div>
    );
  }

  const oldFormatted = formatValue(oldValue);
  const newFormatted = formatValue(newValue);
  const sameValue = oldFormatted === newFormatted;

  return (
    <div className="bg-surface-container/30 rounded-xl p-3.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-1.5">
        <RefreshCw className="h-3 w-3" />
        {label}
      </p>
      {sameValue ? (
        <p className="text-xs text-muted-foreground italic">No change</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-start">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-red-500 mb-0.5">Before</p>
            <p className="text-sm text-muted-foreground bg-red-50 rounded-lg px-3 py-2 break-words line-clamp-4">
              {oldFormatted}
            </p>
          </div>
          <div className="hidden sm:flex items-center justify-center pt-5 text-muted-foreground">
            →
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-wider text-emerald-600 mb-0.5">After</p>
            <p className="text-sm text-foreground bg-emerald-50 rounded-lg px-3 py-2 break-words line-clamp-4">
              {newFormatted}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

