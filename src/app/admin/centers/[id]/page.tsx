"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, BookOpen, ExternalLink, ArrowLeft, ShieldCheck, AlertTriangle, Globe, GlobeLock } from "lucide-react";
import Link from "next/link";
import { MultiImageUpload } from "@/components/admin/image-upload";

interface PhotoItem {
  id?: string;
  url: string;
  alt_text?: string;
  sort_order?: number;
  is_primary?: boolean;
}

export default function AdminCenterEditPage() {
  const params = useParams();
  const router = useRouter();
  const [center, setCenter] = useState<Record<string, unknown> | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blogStats, setBlogStats] = useState<{ thisMonth: number; lastMonth: number } | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("centers")
        .select("*")
        .eq("id", params.id)
        .single();
      setCenter(data as Record<string, unknown> | null);

      // Load photos
      const { data: photoData } = await supabase
        .from("center_photos")
        .select("*")
        .eq("center_id", params.id)
        .order("sort_order");
      setPhotos((photoData || []) as PhotoItem[]);

      // Load blog counts for commission tier
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString();
      const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data: thisMonthBlogs } = await supabase
        .from("pages")
        .select("id")
        .eq("author_center_id", params.id)
        .eq("author_type", "partner")
        .eq("status", "published")
        .gte("created_at", startOfMonth);

      const { data: lastMonthBlogs } = await supabase
        .from("pages")
        .select("id")
        .eq("author_center_id", params.id)
        .eq("author_type", "partner")
        .eq("status", "published")
        .gte("created_at", startOfLastMonth)
        .lte("created_at", endOfLastMonth);

      setBlogStats({
        thisMonth: thisMonthBlogs?.length || 0,
        lastMonth: lastMonthBlogs?.length || 0,
      });

      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleSave() {
    if (!center) return;
    setSaving(true);

    try {
      const res = await fetch("/api/admin/centers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: params.id,
          center,
          photos: photos.map((p) => ({ url: p.url, alt_text: p.alt_text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save center");
      toast.success("Center saved");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save center");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkClaimed() {
    if (!center) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/centers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: params.id,
          center: { is_unclaimed: false, verified_profile: true },
        }),
      });
      if (!res.ok) throw new Error("Failed to update claim status");
      setCenter((prev) => prev ? { ...prev, is_unclaimed: false, verified_profile: true } : prev);
      toast.success("Center marked as claimed and verified");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setPublishing(false);
    }
  }

  async function handlePublishToggle() {
    if (!center) return;
    const newStatus = center.status === "published" ? "draft" : "published";
    setPublishing(true);
    try {
      const res = await fetch("/api/admin/centers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: params.id,
          center: { status: newStatus },
        }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setCenter((prev) => prev ? { ...prev, status: newStatus } : prev);
      toast.success(newStatus === "published" ? "Center published" : "Center unpublished");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setPublishing(false);
    }
  }

  function update(key: string, value: unknown) {
    setCenter((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (loading) return <div className="animate-pulse h-96 bg-slate-100 rounded-lg" />;
  if (!center) return <div>Center not found</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/centers"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-container transition-colors duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Center</h1>
            {typeof center.name === "string" && center.name && (
              <p className="text-sm text-muted-foreground">{center.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {typeof center.slug === "string" && center.slug && (
            <Button variant="outline" asChild className="rounded-full ghost-border border-0">
              <Link href={`/centers/${center.slug}?preview=1`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
          )}
          {center.status === "draft" && (
            <Button
              onClick={handlePublishToggle}
              disabled={publishing}
              variant="outline"
              className="rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <Globe className="mr-2 h-4 w-4" />
              Publish
            </Button>
          )}
          {center.status === "published" && (
            <Button
              onClick={handlePublishToggle}
              disabled={publishing}
              variant="outline"
              className="rounded-full border-amber-200 text-amber-700 hover:bg-amber-50"
            >
              <GlobeLock className="mr-2 h-4 w-4" />
              Unpublish
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} className="rounded-full gradient-primary text-white">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Unclaimed Center Banner */}
      {!!center.is_unclaimed && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">Unclaimed Profile</p>
              <p className="text-xs text-amber-700">This center has not been claimed by a partner yet. Mark as claimed when the partner signs up and verifies ownership.</p>
            </div>
          </div>
          <Button
            onClick={handleMarkClaimed}
            disabled={publishing}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0"
          >
            <ShieldCheck className="mr-2 h-4 w-4" />
            Mark as Claimed / Verified
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={(center.name as string) || ""}
                  onChange={(e) => update("name", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={(center.slug as string) || ""}
                  onChange={(e) => update("slug", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label>Short Description</Label>
              <Input
                value={(center.short_description as string) || ""}
                onChange={(e) => update("short_description", e.target.value)}
                className="mt-1.5"
                maxLength={200}
              />
            </div>
            <div>
              <Label>Full Description</Label>
              <Textarea
                value={(center.description as string) || ""}
                onChange={(e) => update("description", e.target.value)}
                className="mt-1.5"
                rows={5}
              />
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <MultiImageUpload
              images={photos.map((p) => ({ url: p.url, alt_text: p.alt_text }))}
              onChange={(imgs) =>
                setPhotos(imgs.map((img, i) => ({ url: img.url, alt_text: img.alt_text, sort_order: i, is_primary: i === 0 })))
              }
              folder={`centers/${params.id}`}
              maxImages={10}
            />
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Address</Label>
              <Input
                value={(center.address as string) || ""}
                onChange={(e) => update("address", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  value={(center.city as string) || ""}
                  onChange={(e) => update("city", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>State/Province</Label>
                <Input
                  value={(center.state_province as string) || ""}
                  onChange={(e) => update("state_province", e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={(center.country as string) || ""}
                  onChange={(e) => update("country", e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={(center.latitude as number) ?? ""}
                  onChange={(e) =>
                    update("latitude", e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="e.g. 13.7563"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={(center.longitude as number) ?? ""}
                  onChange={(e) =>
                    update("longitude", e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="e.g. 100.5018"
                  className="mt-1.5"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Right-click on Google Maps &rarr; &ldquo;What&apos;s here?&rdquo; to get coordinates
            </p>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone</Label>
              <Input
                value={(center.phone as string) || ""}
                onChange={(e) => update("phone", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={(center.email as string) || ""}
                onChange={(e) => update("email", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Website</Label>
              <Input
                value={(center.website_url as string) || ""}
                onChange={(e) => update("website_url", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Inquiry Email (for lead forwarding)</Label>
              <Input
                value={(center.inquiry_email as string) || ""}
                onChange={(e) => update("inquiry_email", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Pricing Text</Label>
              <Input
                value={(center.pricing_text as string) || ""}
                onChange={(e) => update("pricing_text", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price Min (USD/month)</Label>
                <Input
                  type="number"
                  value={(center.price_min as number) || ""}
                  onChange={(e) =>
                    update("price_min", e.target.value ? Number(e.target.value) : null)
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Price Max (USD/month)</Label>
                <Input
                  type="number"
                  value={(center.price_max as number) || ""}
                  onChange={(e) =>
                    update("price_max", e.target.value ? Number(e.target.value) : null)
                  }
                  className="mt-1.5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Treatment & Clinical */}
        <Card>
          <CardHeader>
            <CardTitle>Treatment & Clinical</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ArrayField
              label="Treatment Focus"
              value={(center.treatment_focus as string[]) || []}
              onChange={(v) => update("treatment_focus", v)}
              placeholder="e.g. Alcohol Addiction, Dual Diagnosis"
            />
            <ArrayField
              label="Conditions Treated"
              value={(center.conditions as string[]) || []}
              onChange={(v) => update("conditions", v)}
              placeholder="e.g. Anxiety, Depression, PTSD"
            />
            <ArrayField
              label="Services"
              value={(center.services as string[]) || []}
              onChange={(v) => update("services", v)}
              placeholder="e.g. Medical Detox, Inpatient/Residential"
            />
            <ArrayField
              label="Treatment Methods"
              value={(center.treatment_methods as string[]) || []}
              onChange={(v) => update("treatment_methods", v)}
              placeholder="e.g. CBT, DBT, EMDR, 12-Step"
            />
            <ArrayField
              label="Substances Treated"
              value={(center.substance_use as string[]) || []}
              onChange={(v) => update("substance_use", v)}
              placeholder="e.g. Alcohol, Opioids, Cocaine"
            />
            <ArrayField
              label="Languages"
              value={(center.languages as string[]) || []}
              onChange={(v) => update("languages", v)}
              placeholder="e.g. English, Spanish, Thai"
            />
            <ArrayField
              label="Accreditation"
              value={(center.accreditation as string[]) || []}
              onChange={(v) => update("accreditation", v)}
              placeholder="e.g. JCAHO, CARF, LegitScript"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Setting Type</Label>
                <Input
                  value={(center.setting_type as string) || ""}
                  onChange={(e) => update("setting_type", e.target.value)}
                  placeholder="e.g. luxury, residential, outpatient"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Program Length</Label>
                <Input
                  value={(center.program_length as string) || ""}
                  onChange={(e) => update("program_length", e.target.value)}
                  placeholder="e.g. 30, 60, 90 days"
                  className="mt-1.5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Status & Commercial */}
        <Card>
          <CardHeader>
            <CardTitle>Status & Commercial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select
                value={(center.status as string) || "draft"}
                onValueChange={(v) => update("status", v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "verified_profile", label: "Verified Profile" },
                { key: "trusted_partner", label: "Trusted Partner" },
                { key: "referral_eligible", label: "Referral Eligible" },
                { key: "is_featured", label: "Featured" },
                { key: "is_sponsored", label: "Sponsored" },
                { key: "has_detox", label: "Has Detox" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                  <Label>{label}</Label>
                  <Switch
                    checked={!!center[key]}
                    onCheckedChange={(v) => update(key, v)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Commission & Agreement */}
        <Card>
          <CardHeader>
            <CardTitle>Commission & Commercial Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Commission Type</Label>
                <Select
                  value={(center.commission_type as string) || "none"}
                  onValueChange={(v) => update("commission_type", v)}
                >
                  <SelectTrigger className="mt-1.5">
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
                <Label>Agreement Status</Label>
                <Select
                  value={(center.agreement_status as string) || "none"}
                  onValueChange={(v) => update("agreement_status", v)}
                >
                  <SelectTrigger className="mt-1.5">
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
                <Label>Commission Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={(center.commission_rate as number) || ""}
                  onChange={(e) => update("commission_rate", e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 10 for 10%"
                  className="mt-1.5"
                />
              </div>
            )}

            {(center.commission_type === "fixed") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fixed Amount per Client</Label>
                  <Input
                    type="number"
                    min="0"
                    step="50"
                    value={(center.commission_fixed_amount as number) || ""}
                    onChange={(e) => update("commission_fixed_amount", e.target.value ? Number(e.target.value) : null)}
                    placeholder="e.g. 500"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select
                    value={(center.commission_currency as string) || "USD"}
                    onValueChange={(v) => update("commission_currency", v)}
                  >
                    <SelectTrigger className="mt-1.5">
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
                <Label>Contract Start</Label>
                <Input
                  type="date"
                  value={(center.contract_start as string) || ""}
                  onChange={(e) => update("contract_start", e.target.value || null)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Contract End</Label>
                <Input
                  type="date"
                  value={(center.contract_end as string) || ""}
                  onChange={(e) => update("contract_end", e.target.value || null)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label>Account Manager</Label>
              <Input
                value={(center.account_manager as string) || ""}
                onChange={(e) => update("account_manager", e.target.value)}
                placeholder="Name of person managing this relationship"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label>Commission Notes (internal)</Label>
              <Textarea
                value={(center.commission_notes as string) || ""}
                onChange={(e) => update("commission_notes", e.target.value)}
                placeholder="Details about the agreement, special terms, etc."
                className="mt-1.5"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Effective Commission & Blog Tier */}
        {center.agreement_status === "active" && center.commission_type === "percentage" && blogStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Effective Commission & Blog Tier
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const appliedRate = blogStats.lastMonth >= 5 ? 8 : blogStats.lastMonth >= 3 ? 10 : 12;
                const appliedTier = blogStats.lastMonth >= 5 ? "Premium" : blogStats.lastMonth >= 3 ? "Standard" : "Base";
                const projectedRate = blogStats.thisMonth >= 5 ? 8 : blogStats.thisMonth >= 3 ? 10 : 12;
                const projectedTier = blogStats.thisMonth >= 5 ? "Premium" : blogStats.thisMonth >= 3 ? "Standard" : "Base";
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const now = new Date();
                const currentMonthName = monthNames[now.getMonth()];
                const lastMonthName = monthNames[now.getMonth() === 0 ? 11 : now.getMonth() - 1];
                const nextMonthName = monthNames[now.getMonth() === 11 ? 0 : now.getMonth() + 1];
                const blogsToNextTier = blogStats.thisMonth >= 5 ? 0 : blogStats.thisMonth >= 3 ? (5 - blogStats.thisMonth) : (3 - blogStats.thisMonth);

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-primary/5 rounded-xl p-4">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Applied Rate ({currentMonthName})</p>
                        <p className="text-2xl font-semibold text-primary mt-1">{appliedRate}%</p>
                        <p className="text-xs text-muted-foreground mt-1">{appliedTier} — {blogStats.lastMonth} blog{blogStats.lastMonth !== 1 ? "s" : ""} in {lastMonthName}</p>
                      </div>
                      <div className="bg-surface-container-low rounded-xl p-4">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Projected Rate ({nextMonthName})</p>
                        <p className="text-2xl font-semibold text-foreground mt-1">{projectedRate}%</p>
                        <p className="text-xs text-muted-foreground mt-1">{projectedTier} — {blogStats.thisMonth} blog{blogStats.thisMonth !== 1 ? "s" : ""} so far in {currentMonthName}</p>
                      </div>
                    </div>

                    {/* Tier Progress */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { rate: 12, label: "Base", desc: "0-2 blogs", active: blogStats.thisMonth < 3 },
                        { rate: 10, label: "Standard", desc: "3+ blogs", active: blogStats.thisMonth >= 3 && blogStats.thisMonth < 6 },
                        { rate: 8, label: "Premium", desc: "5+ blogs", active: blogStats.thisMonth >= 5 },
                      ].map((tier) => (
                        <div key={tier.label} className={`rounded-lg p-2 text-center text-xs ${tier.active ? "bg-primary/10 ring-1 ring-primary/20 font-medium" : "bg-surface-container-low text-muted-foreground"}`}>
                          <span className="font-semibold">{tier.rate}%</span> {tier.label}
                          <br /><span className="text-[10px]">{tier.desc}/mo</span>
                        </div>
                      ))}
                    </div>

                    {blogsToNextTier > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {blogsToNextTier} more blog{blogsToNextTier !== 1 ? "s" : ""} this month to reach the next tier.
                      </p>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Editorial Ratings */}
        <Card>
          <CardHeader>
            <CardTitle>Editorial Ratings (1-5)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            {[
              { key: "editorial_overall", label: "Overall" },
              { key: "editorial_staff", label: "Staff" },
              { key: "editorial_facility", label: "Facility" },
              { key: "editorial_program", label: "Program" },
              { key: "editorial_privacy", label: "Privacy" },
              { key: "editorial_value", label: "Value" },
            ].map(({ key, label }) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={(center[key] as number) || ""}
                  onChange={(e) =>
                    update(key, e.target.value ? Number(e.target.value) : null)
                  }
                  className="mt-1.5"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Insurance</Label>
                <Input
                  value={(center.insurance as string) || ""}
                  onChange={(e) => update("insurance", e.target.value)}
                  placeholder="e.g. Accepts most private insurance"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Occupancy</Label>
                <Input
                  value={(center.occupancy as string) || ""}
                  onChange={(e) => update("occupancy", e.target.value)}
                  placeholder="e.g. Currently accepting new clients"
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Review Count</Label>
                <Input
                  type="number"
                  min="0"
                  value={(center.review_count as number) ?? ""}
                  onChange={(e) =>
                    update("review_count", e.target.value ? Number(e.target.value) : null)
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Last Verified</Label>
                <Input
                  type="date"
                  value={(center.last_verified as string) || ""}
                  onChange={(e) => update("last_verified", e.target.value || null)}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label>Review Summary</Label>
              <Textarea
                value={(center.review_summary as string) || ""}
                onChange={(e) => update("review_summary", e.target.value)}
                placeholder="e.g. 4.8 stars from 120 Google reviews"
                className="mt-1.5"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ArrayField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5 mb-1.5">
          {value.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="ml-0.5 hover:text-red-500 transition-colors"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        placeholder={placeholder}
        className="mt-1.5"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const input = e.currentTarget;
            const val = input.value.trim().replace(/,$/, "");
            if (val && !value.includes(val)) {
              onChange([...value, val]);
              input.value = "";
            }
          }
        }}
        onBlur={(e) => {
          const val = e.currentTarget.value.trim().replace(/,$/, "");
          if (val && !value.includes(val)) {
            onChange([...value, val]);
            e.currentTarget.value = "";
          }
        }}
      />
      <p className="text-xs text-muted-foreground mt-1">Press Enter or comma to add. Click &times; to remove.</p>
    </div>
  );
}
