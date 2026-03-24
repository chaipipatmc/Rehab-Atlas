import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Building2, Pencil, Image, Clock, LayoutDashboard, BookOpen } from "lucide-react";

const navItems = [
  { href: "/partner", label: "Dashboard", icon: LayoutDashboard },
  { href: "/partner/edit", label: "Edit Profile", icon: Pencil },
  { href: "/partner/photos", label: "Photos", icon: Image },
  { href: "/partner/blog", label: "My Articles", icon: BookOpen },
  { href: "/partner/history", label: "Change Log", icon: Clock },
];

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/partner");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, center_id, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "partner" && profile?.role !== "admin") {
    redirect("/");
  }

  if (!profile?.center_id) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-headline-md font-semibold text-foreground">Partner Portal</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Your account is not linked to a center yet. Please contact the Rehab-Atlas team to get set up.
          </p>
        </div>
      </div>
    );
  }

  // Get center name
  const { data: center } = await supabase
    .from("centers")
    .select("name")
    .eq("id", profile.center_id)
    .single();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-surface">
      {/* Sidebar */}
      <aside className="w-56 bg-surface-container-lowest hidden md:flex flex-col">
        <div className="p-5">
          <p className="text-sm font-semibold text-foreground truncate">{center?.name || "My Center"}</p>
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-medium">Center Partner</p>
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

        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-medium text-white">
            {(profile?.full_name || user.email || "P").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{profile?.full_name || user.email}</p>
            <p className="text-[10px] text-muted-foreground">Partner</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 p-4 sm:p-6 overflow-auto">{children}</div>
    </div>
  );
}
