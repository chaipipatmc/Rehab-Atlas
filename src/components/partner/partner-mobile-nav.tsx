"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Pencil,
  Image,
  Clock,
  LayoutDashboard,
  BookOpen,
  Users,
  Menu,
} from "lucide-react";

// Mirrors the desktop sidebar in src/app/partner/(portal)/layout.tsx.
// Commission is intentionally omitted while pricing is deferred (business rule).
const NAV_ITEMS = [
  { href: "/partner", label: "Dashboard", icon: LayoutDashboard },
  { href: "/partner/leads", label: "Referrals", icon: Users },
  { href: "/partner/edit", label: "Edit Profile", icon: Pencil },
  { href: "/partner/photos", label: "Photos", icon: Image },
  { href: "/partner/blog", label: "My Articles", icon: BookOpen },
  { href: "/partner/history", label: "Change Log", icon: Clock },
];

interface PartnerMobileNavProps {
  centerName: string;
}

/** Hamburger + drawer nav for the partner portal on small screens, where the
 *  sidebar is hidden and there was previously no navigation at all. */
export function PartnerMobileNav({ centerName }: PartnerMobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden mb-4 flex items-center gap-3">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-surface-container-lowest shadow-ambient hover:bg-surface-container transition-colors duration-300">
          <Menu className="h-5 w-5 text-foreground" />
          <span className="sr-only">Open partner menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] bg-surface-bright p-0">
          <SheetTitle className="sr-only">Partner navigation</SheetTitle>
          <div className="p-5">
            <p className="text-sm font-semibold text-foreground truncate">{centerName}</p>
            <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-medium">Center Partner</p>
          </div>
          <nav className="px-3 space-y-0.5 pb-6">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/partner"
                  ? pathname === "/partner"
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
      <p className="text-sm font-medium text-foreground truncate">{centerName}</p>
    </div>
  );
}
