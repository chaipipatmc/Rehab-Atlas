"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User, Shield, Building2, Search, CheckCircle, ArrowUpRight, KeyRound, Loader2,
} from "lucide-react";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  center_id: string | null;
  created_at: string;
}

interface CenterOption {
  id: string;
  name: string;
}

export default function AdminUsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [centers, setCenters] = useState<CenterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editCenterId, setEditCenterId] = useState("");
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      setProfiles((profileData || []) as Profile[]);

      const { data: centerData } = await supabase
        .from("centers")
        .select("id, name")
        .eq("status", "published")
        .order("name");
      setCenters((centerData || []) as CenterOption[]);

      setLoading(false);
    }
    load();
  }, []);

  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProfiles = profiles.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.email?.toLowerCase().includes(q) ||
      p.full_name?.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredProfiles.length / PAGE_SIZE);
  const paginatedProfiles = filteredProfiles.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset page when search changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  async function handleUpdateRole(userId: string) {
    try {
      const res = await fetch("/api/admin/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role: editRole,
          centerId: editRole === "partner" ? editCenterId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update user");
      toast.success("User updated");
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === userId
            ? { ...p, role: editRole, center_id: editRole === "partner" ? editCenterId : null }
            : p
        )
      );
      setEditingUser(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    }
  }

  async function handleResetPassword(userId: string, email: string | null) {
    if (!email) {
      toast.error("User has no email address");
      return;
    }
    setResettingPassword(userId);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      toast.success(`New password sent to ${email}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setResettingPassword(null);
    }
  }

  function startEdit(profile: Profile) {
    setEditingUser(profile.id);
    setEditRole(profile.role);
    setEditCenterId(profile.center_id || "");
  }

  const roleIcon = (role: string) => {
    switch (role) {
      case "admin": return <Shield className="h-3.5 w-3.5 text-primary" />;
      case "partner": return <Building2 className="h-3.5 w-3.5 text-emerald-600" />;
      default: return <User className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const roleColor = (role: string) => {
    switch (role) {
      case "admin": return "text-primary bg-primary/10";
      case "partner": return "text-emerald-700 bg-emerald-50";
      default: return "text-muted-foreground bg-surface-container";
    }
  };

  if (loading) return <div className="animate-pulse h-96 bg-surface-container rounded-2xl" />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-headline-lg font-semibold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage user roles, approve partner requests, and link centers
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {profiles.filter(p => p.role === "user").length} Users</span>
          <span className="flex items-center gap-1"><Building2 className="h-3 w-3 text-emerald-600" /> {profiles.filter(p => p.role === "partner").length} Partners</span>
          <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-primary" /> {profiles.filter(p => p.role === "admin").length} Admins</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or role..."
          className="pl-9 bg-surface-container-lowest border-0 rounded-xl ghost-border"
        />
      </div>

      {/* User List */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left px-6 py-3 font-medium">User</th>
              <th className="text-left px-6 py-3 font-medium">Role</th>
              <th className="text-left px-6 py-3 font-medium">Linked Center</th>
              <th className="text-left px-6 py-3 font-medium">Joined</th>
              <th className="text-left px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProfiles.map((profile) => (
              <tr key={profile.id} className="border-t border-surface-container-low hover:bg-surface-container-low/50 transition-colors duration-200">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                      profile.role === "admin" ? "gradient-primary" : profile.role === "partner" ? "bg-emerald-600" : "bg-muted-foreground"
                    }`}>
                      {(profile.full_name || profile.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{profile.full_name || "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{profile.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 ${roleColor(profile.role)}`}>
                    {roleIcon(profile.role)}
                    {profile.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {profile.center_id
                    ? centers.find(c => c.id === profile.center_id)?.name || profile.center_id.slice(0, 8) + "..."
                    : "—"
                  }
                </td>
                <td className="px-6 py-4 text-xs text-muted-foreground">
                  {new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-6 py-4">
                  {editingUser === profile.id ? (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="text-xs bg-surface-container-low rounded-lg px-2 py-1.5 ghost-border outline-none"
                      >
                        <option value="user">User</option>
                        <option value="partner">Center Partner</option>
                        <option value="admin">Admin</option>
                      </select>
                      {editRole === "partner" && (
                        <select
                          value={editCenterId}
                          onChange={(e) => setEditCenterId(e.target.value)}
                          className="text-xs bg-surface-container-low rounded-lg px-2 py-1.5 ghost-border outline-none"
                        >
                          <option value="">Select center...</option>
                          {centers.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      )}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateRole(profile.id)}
                          className="rounded-lg text-xs h-7 gradient-primary text-white"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUser(null)}
                          className="rounded-lg text-xs h-7 ghost-border border-0"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => startEdit(profile)}
                        className="text-xs text-primary hover:text-primary-dim flex items-center gap-1 transition-colors duration-300"
                      >
                        <ArrowUpRight className="h-3 w-3" /> Change Role
                      </button>
                      <button
                        onClick={() => handleResetPassword(profile.id, profile.email)}
                        disabled={resettingPassword === profile.id}
                        className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors duration-300 disabled:opacity-50"
                      >
                        {resettingPassword === profile.id ? (
                          <><Loader2 className="h-3 w-3 animate-spin" /> Sending...</>
                        ) : (
                          <><KeyRound className="h-3 w-3" /> Reset Password</>
                        )}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages} ({filteredProfiles.length} users)
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 px-3 py-1.5 rounded-lg ghost-border transition-colors"
            >
              Previous
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 px-3 py-1.5 rounded-lg ghost-border transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
