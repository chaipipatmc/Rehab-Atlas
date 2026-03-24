"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, LogOut, Shield, KeyRound, Eye, EyeOff, ChevronDown } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login?redirect=/account");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile({ ...data, email: user.email || "" });
        setFullName(data.full_name || "");
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", profile.id);
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated");
    }
    setSaving(false);
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    const supabase = createClient();

    // Verify current password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile!.email,
      password: currentPassword,
    });
    if (signInError) {
      toast.error("Current password is incorrect");
      setChangingPassword(false);
      return;
    }

    // Update to new password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      toast.error("Failed to change password: " + error.message);
    } else {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-surface-container animate-pulse" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = (fullName || profile.email).slice(0, 2).toUpperCase();

  return (
    <div className="bg-surface min-h-screen">
      <div className="container mx-auto px-6 py-12 max-w-xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-xl font-semibold text-white">
            {initials}
          </div>
          <div>
            <h1 className="text-headline-lg font-semibold text-foreground">
              {fullName || "Your Profile"}
            </h1>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <div className="flex items-center gap-1 mt-1">
              <Shield className="h-3 w-3 text-primary" />
              <span className="text-[10px] uppercase tracking-wider text-primary font-medium">
                {profile.role}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient space-y-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Personal Information
          </h2>

          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input
              value={profile.email}
              disabled
              className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border opacity-60"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Email cannot be changed</p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Member Since</Label>
            <p className="text-sm text-foreground mt-1">
              {new Date(profile.created_at).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Change Password */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient mt-6 overflow-hidden">
          <button
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-container/30 transition-colors duration-200"
          >
            <span className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Change Password
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${showPasswordSection ? "rotate-180" : ""}`} />
          </button>

          {showPasswordSection && (
            <div className="px-6 pb-6 space-y-5 border-t border-surface-container pt-5">
              <div>
                <Label className="text-xs text-muted-foreground">Current Password</Label>
                <div className="relative mt-2">
                  <Input
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="bg-surface-container-low border-0 rounded-xl ghost-border pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">New Password</Label>
                <Input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Confirm New Password</Label>
                <Input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="mt-2 bg-surface-container-low border-0 rounded-xl ghost-border"
                />
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="rounded-full gradient-primary text-white hover:opacity-90 transition-opacity duration-300"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                {changingPassword ? "Changing..." : "Change Password"}
              </Button>
            </div>
          )}
        </div>

        {/* Account Actions */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient mt-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
            Account
          </h2>

          {profile.role === "admin" && (
            <Button variant="outline" className="w-full rounded-full ghost-border border-0" asChild>
              <a href="/admin">Go to Admin Dashboard</a>
            </Button>
          )}

          {profile.role === "partner" && (
            <Button variant="outline" className="w-full rounded-full ghost-border border-0" asChild>
              <a href="/partner">Go to Partner Portal</a>
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full rounded-full ghost-border border-0 text-destructive hover:bg-destructive/5"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
