"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  ClipboardList,
  BarChart3,
  Settings,
  Menu,
  UserCog,
  Target,
  Receipt,
  CalendarDays,
  Brain,
} from "lucide-react";

// Mirrors the desktop sidebar in src/app/admin/layout.tsx — keep in sync.
const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/assessments", label: "Assessments", icon: Brain },
  { href: "/admin/centers", label: "Centers", icon: Building2 },
  { href: "/admin/users", label: "Users & Partners", icon: UserCog },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/edit-requests", label: "Edit Requests", icon: ClipboardList },
  { href: "/admin/content-calendar", label: "Content Calendar", icon: CalendarDays },
  { href: "/admin/outreach", label: "Outreach", icon: Target },
  { href: "/admin/commission", label: "Commission", icon: Receipt },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/** Hamburger + drawer nav for the admin portal on small screens, where the
 *  sidebar is hidden and there was previously no navigation at all. */
export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex items-center justify-center h-9 w-9 rounded-xl hover:bg-surface-container transition-colors duration-300">
          <Menu className="h-5 w-5 text-foreground" />
          <span className="sr-only">Open admin menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] bg-surface-bright p-0">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <div className="p-5">
            <p className="text-sm font-semibold text-foreground">Rehab-Atlas</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin Portal</p>
          </div>
          <nav className="px-3 space-y-0.5 pb-6">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors duration-300 ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-surface-container hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
