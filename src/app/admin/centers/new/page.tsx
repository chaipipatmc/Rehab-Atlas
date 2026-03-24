"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MultiImageUpload } from "@/components/admin/image-upload";
import {
  TREATMENT_FOCUS_OPTIONS,
  CONDITION_OPTIONS,
  SERVICE_OPTIONS,
  SETTING_TYPE_OPTIONS,
} from "@/lib/constants";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminCenterNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<Array<{ url: string; alt_text?: string }>>([]);
  const [center, setCenter] = useState<Record<string, unknown>>({
    name: "",
    slug: "",
    description: "",
    short_description: "",
    address: "",
    city: "",
    state_province: "",
    country: "",
    phone: "",
    email: "",
    website_url: "",
    inquiry_email: "",
    pricing_text: "",
    price_min: null,
    price_max: null,
    program_length: "",
    setting_type: "",
    treatment_focus: [],
    conditions: [],
    services: [],
    treatment_methods: [],
    insurance: [],
    languages: ["english"],
    has_detox: false,
    commission_type: "none",
    commission_rate: null,
    commission_fixed_amount: null,
    commission_currency: "USD",
    commission_notes: "",
    contract_start: null,
    contract_end: null,
    account_manager: "",
    agreement_status: "none",
    verified_profile: false,
    trusted_partner: false,
    referral_eligible: false,
    is_featured: false,
    is_sponsored: false,
    editorial_overall: null,
    editorial_staff: null,
    editorial_facility: null,
    editorial_program: null,
    editorial_privacy: null,
    editorial_value: null,
    status: "draft",
  });

  function update(key: string, value: unknown) {
    setCenter((prev) => ({ ...prev, [key]: value }));
    // Auto-generate slug from name
    if (key === "name" && typeof value === "string") {
      const city = center.city as string;
      setCenter((prev) => ({
        ...prev,
        name: value,
        slug: slugify(value + (city ? "-" + city : "")),
      }));
    }
  }

  function toggleArrayItem(key: string, item: string) {
    const current = (center[key] as string[]) || [];
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    update(key, updated);
  }

  async function handleSave() {
    if (!center.name || !center.country) {
      toast.error("Name and Country are required");
      return;
    }
    if (!center.slug) {
      update("slug", slugify((center.name as string) + "-" + (center.city || "")));
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ center, photos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create center");
      toast.success("Center created successfully");
      router.push(`/admin/centers/${data.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create center");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/centers"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-container transition-colors duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-headline-lg font-semibold text-foreground">Add New Center</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
        >
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Creating..." : "Create Center"}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Basic Information
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Center Name *</Label>
                <Input
                  value={(center.name as string) || ""}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. The Azure Crest Institute"
                  className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Slug (auto-generated)</Label>
                <Input
                  value={(center.slug as string) || ""}
                  onChange={(e) => update("slug", e.target.value)}
                  placeholder="azure-crest-institute"
                  className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Short Description (max 200 chars)</Label>
              <Input
                value={(center.short_description as string) || ""}
                onChange={(e) => update("short_description", e.target.value)}
                placeholder="A premier coastal sanctuary specializing in holistic recovery..."
                maxLength={200}
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Full Description</Label>
              <Textarea
                value={(center.description as string) || ""}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Detailed description of the center, programs, philosophy..."
                rows={5}
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Location
          </h2>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Address</Label>
              <Input
                value={(center.address as string) || ""}
                onChange={(e) => update("address", e.target.value)}
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">City</Label>
                <Input
                  value={(center.city as string) || ""}
                  onChange={(e) => update("city", e.target.value)}
                  className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">State / Province</Label>
                <Input
                  value={(center.state_province as string) || ""}
                  onChange={(e) => update("state_province", e.target.value)}
                  className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Country *</Label>
                <Input
                  value={(center.country as string) || ""}
                  onChange={(e) => update("country", e.target.value)}
                  placeholder="e.g. United States"
                  className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Facility Photos
          </h2>
          <MultiImageUpload
            images={photos}
            onChange={setPhotos}
            folder="centers/new"
            maxImages={10}
          />
        </div>

        {/* Contact */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Contact Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Phone</Label>
              <Input
                value={(center.phone as string) || ""}
                onChange={(e) => update("phone", e.target.value)}
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                value={(center.email as string) || ""}
                onChange={(e) => update("email", e.target.value)}
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Website URL</Label>
              <Input
                value={(center.website_url as string) || ""}
                onChange={(e) => update("website_url", e.target.value)}
                placeholder="https://"
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Inquiry Email (for lead forwarding)</Label>
              <Input
                value={(center.inquiry_email as string) || ""}
                onChange={(e) => update("inquiry_email", e.target.value)}
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>
          </div>
        </div>

        {/* Treatment Focus */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Treatment Focus & Conditions
          </h2>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-3 block">Treatment Focus (select all that apply)</Label>
              <div className="flex flex-wrap gap-2">
                {TREATMENT_FOCUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayItem("treatment_focus", opt.value)}
                    className={`text-xs rounded-full px-3 py-1.5 transition-all duration-300 ${
                      ((center.treatment_focus as string[]) || []).includes(opt.value)
                        ? "bg-primary text-white"
                        : "bg-surface-container-low text-muted-foreground ghost-border hover:bg-surface-container"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-3 block">Conditions Treated</Label>
              <div className="flex flex-wrap gap-2">
                {CONDITION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayItem("conditions", opt.value)}
                    className={`text-xs rounded-full px-3 py-1.5 transition-all duration-300 ${
                      ((center.conditions as string[]) || []).includes(opt.value)
                        ? "bg-primary text-white"
                        : "bg-surface-container-low text-muted-foreground ghost-border hover:bg-surface-container"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Services & Setting */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Services & Setting
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Setting Type</Label>
                <Select
                  value={(center.setting_type as string) || ""}
                  onValueChange={(v) => update("setting_type", v)}
                >
                  <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SETTING_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Program Length</Label>
                <Input
                  value={(center.program_length as string) || ""}
                  onChange={(e) => update("program_length", e.target.value)}
                  placeholder="e.g. 30-90 days"
                  className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-3 block">Services</Label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleArrayItem("services", opt.value)}
                    className={`text-xs rounded-full px-3 py-1.5 transition-all duration-300 ${
                      ((center.services as string[]) || []).includes(opt.value)
                        ? "bg-primary text-white"
                        : "bg-surface-container-low text-muted-foreground ghost-border hover:bg-surface-container"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Pricing
          </h2>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Pricing Description</Label>
              <Input
                value={(center.pricing_text as string) || ""}
                onChange={(e) => update("pricing_text", e.target.value)}
                placeholder="e.g. $15,000 - $45,000 per month"
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Min Price (USD/month)</Label>
                <Input
                  type="number"
                  value={(center.price_min as number) || ""}
                  onChange={(e) => update("price_min", e.target.value ? Number(e.target.value) : null)}
                  className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Max Price (USD/month)</Label>
                <Input
                  type="number"
                  value={(center.price_max as number) || ""}
                  onChange={(e) => update("price_max", e.target.value ? Number(e.target.value) : null)}
                  className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Commission & Commercial Agreement */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Commission & Commercial Agreement
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Commission Type</Label>
                <Select
                  value={(center.commission_type as string) || "none"}
                  onValueChange={(v) => update("commission_type", v)}
                >
                  <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Agreement</SelectItem>
                    <SelectItem value="percentage">Percentage Based</SelectItem>
                    <SelectItem value="fixed">Fixed Amount per Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Agreement Status</Label>
                <Select
                  value={(center.agreement_status as string) || "none"}
                  onValueChange={(v) => update("agreement_status", v)}
                >
                  <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(center.commission_type === "percentage") && (
              <div>
                <Label className="text-xs text-muted-foreground">Commission Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={(center.commission_rate as number) || ""}
                  onChange={(e) => update("commission_rate", e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 10 for 10%"
                  className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                />
              </div>
            )}

            {(center.commission_type === "fixed") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Fixed Amount per Client</Label>
                  <Input
                    type="number"
                    min="0"
                    step="50"
                    value={(center.commission_fixed_amount as number) || ""}
                    onChange={(e) => update("commission_fixed_amount", e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g. 500"
                    className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Currency</Label>
                  <Select
                    value={(center.commission_currency as string) || "USD"}
                    onValueChange={(v) => update("commission_currency", v)}
                  >
                    <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="THB">THB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Contract Start</Label>
                <Input
                  type="date"
                  value={(center.contract_start as string) || ""}
                  onChange={(e) => update("contract_start", e.target.value || null)}
                  className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Contract End</Label>
                <Input
                  type="date"
                  value={(center.contract_end as string) || ""}
                  onChange={(e) => update("contract_end", e.target.value || null)}
                  className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Account Manager</Label>
              <Input
                value={(center.account_manager as string) || ""}
                onChange={(e) => update("account_manager", e.target.value)}
                placeholder="Name of person managing this relationship"
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Commission Notes (internal)</Label>
              <Textarea
                value={(center.commission_notes as string) || ""}
                onChange={(e) => update("commission_notes", e.target.value)}
                placeholder="Details about the agreement, special terms..."
                className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Status & Flags */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Status & Badges
          </h2>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={(center.status as string) || "draft"}
                onValueChange={(v) => update("status", v)}
              >
                <SelectTrigger className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: "verified_profile", label: "Verified Profile" },
                { key: "trusted_partner", label: "Trusted Partner" },
                { key: "referral_eligible", label: "Referral Eligible" },
                { key: "is_featured", label: "Featured" },
                { key: "is_sponsored", label: "Sponsored" },
                { key: "has_detox", label: "Has Detox" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low ghost-border">
                  <Label className="text-xs text-foreground">{label}</Label>
                  <Switch
                    checked={!!center[key]}
                    onCheckedChange={(v) => update(key, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Editorial Ratings */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
            Editorial Ratings (1.0 - 5.0)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: "editorial_overall", label: "Overall" },
              { key: "editorial_staff", label: "Staff" },
              { key: "editorial_facility", label: "Facility" },
              { key: "editorial_program", label: "Program" },
              { key: "editorial_privacy", label: "Privacy" },
              { key: "editorial_value", label: "Value" },
            ].map(({ key, label }) => (
              <div key={key}>
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={(center[key] as number) || ""}
                  onChange={(e) => update(key, e.target.value ? Number(e.target.value) : null)}
                  className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Save */}
        <div className="flex justify-end pb-10">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full px-8 gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Creating..." : "Create Center"}
          </Button>
        </div>
      </div>
    </div>
  );
}
