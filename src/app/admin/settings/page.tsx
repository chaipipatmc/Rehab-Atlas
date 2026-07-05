"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Mail, Globe, Shield, Bell } from "lucide-react";

// Defaults used until saved values exist in site_settings
const DEFAULTS = {
  platform_site_name: "Rehab-Atlas",
  platform_admin_email: "chaipipat.mc@gmail.com",
  platform_notification_new_lead: "true",
  platform_notification_partner_request: "true",
  platform_notification_edit_request: "true",
  platform_whatsapp_number: "",
  platform_default_currency: "USD",
  platform_require_email_verification: "true",
};

type Settings = typeof DEFAULTS;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
      })
      .catch(() => toast.error("Could not load saved settings"))
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof Settings, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Failed to save settings");
        return;
      }
      setDirty(false);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const bool = (key: keyof Settings) => settings[key] === "true";

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-headline-lg font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform configuration</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
        >
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : dirty ? "Save Settings" : "Saved"}
        </Button>
      </div>

      <div className="space-y-6">
        {/* General */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">General</h2>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Site Name</Label>
            <Input value={settings.platform_site_name} onChange={(e) => update("platform_site_name", e.target.value)} className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Default Currency</Label>
            <Input value={settings.platform_default_currency} onChange={(e) => update("platform_default_currency", e.target.value)} className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">WhatsApp Number</Label>
            <Input value={settings.platform_whatsapp_number} onChange={(e) => update("platform_whatsapp_number", e.target.value)} placeholder="+1234567890" className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border" />
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Email Notifications</h2>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Admin Email (receives all notifications)</Label>
            <Input value={settings.platform_admin_email} onChange={(e) => update("platform_admin_email", e.target.value)} className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border" />
          </div>
          <div className="space-y-3 pt-2">
            {([
              { key: "platform_notification_new_lead", label: "New inquiry / lead submitted", icon: Mail },
              { key: "platform_notification_partner_request", label: "New partner verification request", icon: Shield },
              { key: "platform_notification_edit_request", label: "Partner edit request submitted", icon: Shield },
            ] as const).map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low ghost-border">
                <Label className="text-xs text-foreground">{label}</Label>
                <Switch checked={bool(key)} onCheckedChange={(v) => update(key, String(v))} />
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Security</h2>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low ghost-border">
            <div>
              <Label className="text-xs text-foreground">Require email verification</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">Users must verify email before accessing features</p>
            </div>
            <Switch checked={bool("platform_require_email_verification")} onCheckedChange={(v) => update("platform_require_email_verification", String(v))} />
          </div>
        </div>
      </div>
    </div>
  );
}
