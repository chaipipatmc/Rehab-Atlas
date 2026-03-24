"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Mail, Globe, Shield, Bell } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    site_name: "Rehab-Atlas",
    admin_email: "chaipipat.mc@gmail.com",
    notification_new_lead: true,
    notification_partner_request: true,
    notification_edit_request: true,
    whatsapp_number: "",
    default_currency: "USD",
    require_email_verification: true,
  });

  function update(key: string, value: unknown) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    // In production, save to DB or env
    toast.success("Settings saved");
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-headline-lg font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform configuration</p>
        </div>
        <Button onClick={handleSave} className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300">
          <Save className="mr-2 h-4 w-4" /> Save Settings
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
            <Input value={settings.site_name} onChange={(e) => update("site_name", e.target.value)} className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Default Currency</Label>
            <Input value={settings.default_currency} onChange={(e) => update("default_currency", e.target.value)} className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">WhatsApp Number</Label>
            <Input value={settings.whatsapp_number} onChange={(e) => update("whatsapp_number", e.target.value)} placeholder="+1234567890" className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border" />
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
            <Input value={settings.admin_email} onChange={(e) => update("admin_email", e.target.value)} className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border" />
          </div>
          <div className="space-y-3 pt-2">
            {[
              { key: "notification_new_lead", label: "New inquiry / lead submitted", icon: Mail },
              { key: "notification_partner_request", label: "New partner verification request", icon: Shield },
              { key: "notification_edit_request", label: "Partner edit request submitted", icon: Shield },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low ghost-border">
                <Label className="text-xs text-foreground">{label}</Label>
                <Switch checked={!!settings[key as keyof typeof settings]} onCheckedChange={(v) => update(key, v)} />
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
            <Switch checked={settings.require_email_verification} onCheckedChange={(v) => update("require_email_verification", v)} />
          </div>
        </div>
      </div>
    </div>
  );
}
