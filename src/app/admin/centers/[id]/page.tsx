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
import { Save } from "lucide-react";
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

  function update(key: string, value: unknown) {
    setCenter((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (loading) return <div className="animate-pulse h-96 bg-slate-100 rounded-lg" />;
  if (!center) return <div>Center not found</div>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Edit Center</h1>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

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
      </div>
    </div>
  );
}
