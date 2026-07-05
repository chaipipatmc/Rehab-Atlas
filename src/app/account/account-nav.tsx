"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Heart, MessageSquare, Brain } from "lucide-react";

const TABS = [
  { href: "/account", label: "Profile", icon: User },
  { href: "/account/saved", label: "Saved Centers", icon: Heart },
  { href: "/account/inquiries", label: "My Inquiries", icon: MessageSquare },
  { href: "/account/assessments", label: "Assessments", icon: Brain },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Account"
      className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/account"
            ? pathname === "/account"
            : pathname.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-300 ${
              active
                ? "gradient-primary text-white"
                : "bg-surface-container-low text-muted-foreground ghost-border hover:bg-surface-container hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
