import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  ClipboardList,
  BarChart3,
  Settings,
  Bell,
  HelpCircle,
  Plus,
  UserCog,
  Target,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/centers", label: "Centers", icon: Building2 },
  { href: "/admin/users", label: "Users & Partners", icon: UserCog },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/edit-requests", label: "Edit Requests", icon: ClipboardList },
  { href: "/admin/outreach", label: "Outreach", icon: Target },
  { href: "/admin/commission", label: "Commission", icon: Receipt },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-surface">
      {/* Sidebar */}
      <aside className="w-56 bg-surface-container-lowest hidden md:flex flex-col">
        <div className="p-5">
          <p className="text-sm font-semibold text-foreground">Rehab-Atlas</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin Portal</p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground rounded-xl hover:bg-surface-container hover:text-foreground transition-colors duration-300"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
            {(profile?.full_name || user.email || "A").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {profile?.full_name || user.email}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Super Admin</p>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-14 bg-surface-container-lowest flex items-center justify-between px-6 gap-4">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search leads, facilities, or medical records..."
              className="bg-surface-container-low border-0 rounded-xl ghost-border text-sm h-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-container transition-colors duration-300">
              <Bell className="h-4 w-4" />
            </button>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-surface-container transition-colors duration-300">
              <HelpCircle className="h-4 w-4" />
            </button>
            <Button size="sm" className="rounded-full gradient-primary text-white text-xs h-8 px-3" asChild>
              <Link href="/admin/centers/new">
                <Plus className="h-3 w-3 mr-1" />
                Add Center
              </Link>
            </Button>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 p-6 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
