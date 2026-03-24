"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import {
  Menu, LogOut, User, Shield, LayoutDashboard, ChevronDown,
  Building2, MessageCircle, Heart, BookOpen, ClipboardList,
} from "lucide-react";

// Role-specific nav links
const PUBLIC_NAV = [
  { href: "/centers", label: "Centers" },
  { href: "/blog", label: "Articles" },
  { href: "/about", label: "About" },
  { href: "/inquiry", label: "Inquiry" },
];

const USER_NAV = [
  { href: "/centers", label: "Centers" },
  { href: "/blog", label: "Articles" },
  { href: "/assessment", label: "Assessment" },
  { href: "/about", label: "About" },
];

const PARTNER_NAV = [
  { href: "/centers", label: "Centers" },
  { href: "/blog", label: "Articles" },
  { href: "/about", label: "About" },
  { href: "/inquiry", label: "Inquiry" },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/centers", label: "Centers" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/agents", label: "Agents" },
];

interface UserInfo {
  email: string;
  role: string;
  full_name: string | null;
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    async function getUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, full_name")
            .eq("id", authUser.id)
            .single();
          setUser({
            email: authUser.email || "",
            role: profile?.role || "user",
            full_name: profile?.full_name || null,
          });
        }
      } catch {}
      setLoading(false);
    }
    getUser();

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        getUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close menu on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [userMenuOpen]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setUserMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const displayName = user?.full_name || user?.email?.split("@")[0] || "";
  const initials = displayName.slice(0, 2).toUpperCase();
  const isAdmin = user?.role === "admin";
  const isPartner = user?.role === "partner";

  // Choose nav based on role
  const navLinks = !user
    ? PUBLIC_NAV
    : isAdmin
    ? ADMIN_NAV
    : isPartner
    ? PARTNER_NAV
    : USER_NAV;

  // Role label & color
  const roleConfig = isAdmin
    ? { label: "Admin", color: "text-primary", icon: Shield }
    : isPartner
    ? { label: "Center Partner", color: "text-emerald-600", icon: Building2 }
    : { label: "Member", color: "text-muted-foreground", icon: User };

  return (
    <header className="sticky top-0 z-50 w-full glass-nav">
      <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Rehab-<span className="font-bold">Atlas</span>
          </span>
          {user && (isAdmin || isPartner) && (
            <span className={`hidden sm:inline text-[9px] uppercase tracking-widest font-medium ${roleConfig.color} bg-surface-container rounded-full px-2 py-0.5`}>
              {roleConfig.label}
            </span>
          )}
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={`text-sm transition-colors duration-300 ${
                  isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-surface-container animate-pulse" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-surface-container transition-colors duration-300"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                  isAdmin ? "gradient-primary" : isPartner ? "bg-emerald-600" : "bg-muted-foreground"
                }`}>
                  {initials}
                </div>
                <span className="text-sm text-foreground max-w-[120px] truncate">{displayName}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-surface-container-lowest rounded-xl shadow-ambient-lg z-50 py-2 ghost-border">
                  {/* User info */}
                  <div className="px-4 py-2.5 border-b border-surface-container">
                    <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                    <span className={`inline-flex items-center gap-1 mt-1.5 text-[10px] uppercase tracking-wider font-medium ${roleConfig.color}`}>
                      <roleConfig.icon className="h-3 w-3" />
                      {roleConfig.label}
                    </span>
                  </div>

                  {/* Role-specific menu */}
                  <div className="py-1">
                    {/* Normal user items */}
                    <Link href="/account" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-200">
                      <User className="h-4 w-4" /> My Profile
                    </Link>

                    {!isAdmin && !isPartner && (
                      <>
                        <Link href="/account/inquiries" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-200">
                          <MessageCircle className="h-4 w-4" /> My Inquiries
                        </Link>
                        <Link href="/account/saved" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-200">
                          <Heart className="h-4 w-4" /> Saved Centers
                        </Link>
                      </>
                    )}

                    {/* Partner items */}
                    {isPartner && (
                      <>
                        <Link href="/partner" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-200">
                          <Building2 className="h-4 w-4" /> Center Dashboard
                        </Link>
                        <Link href="/partner/edit" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-200">
                          <ClipboardList className="h-4 w-4" /> Edit Center Profile
                        </Link>
                        <Link href="/partner/blog" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-200">
                          <BookOpen className="h-4 w-4" /> My Articles
                        </Link>
                      </>
                    )}

                    {/* Admin items */}
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container transition-colors duration-200">
                        <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-surface-container py-1">
                    <button onClick={handleSignOut} className="flex items-center gap-2.5 px-4 py-2 w-full text-sm text-muted-foreground hover:text-destructive hover:bg-surface-container transition-colors duration-200">
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300">
                Sign In
              </Link>
              <Button className="rounded-full px-5 h-9 text-sm gradient-primary text-white hover:opacity-90 transition-opacity duration-300" asChild>
                <Link href="/assessment">Start Assessment</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="inline-flex items-center justify-center h-10 w-10 rounded-xl hover:bg-surface-container transition-colors duration-300">
              <Menu className="h-5 w-5 text-foreground" />
              <span className="sr-only">Toggle menu</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-80 bg-surface-bright p-0">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-surface-container">
                  <span className="text-lg font-semibold text-foreground">
                    Rehab-<span className="font-bold">Atlas</span>
                  </span>
                </div>

                {/* User info */}
                {user && (
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-container bg-surface-container/30">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0 ${
                      isAdmin ? "gradient-primary" : isPartner ? "bg-emerald-600" : "bg-muted-foreground"
                    }`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                      <span className={`text-[10px] uppercase tracking-wider font-medium ${roleConfig.color}`}>
                        {roleConfig.label}
                      </span>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-3">
                  <div className="space-y-0.5">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container rounded-lg transition-colors duration-200"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>

                  {/* Extra links for logged-in users */}
                  {user && (
                    <>
                      <div className="border-t border-surface-container my-3 mx-3" />
                      <div className="space-y-0.5">
                        {!isAdmin && !isPartner && (
                          <>
                            <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container rounded-lg transition-colors duration-200">
                              <User className="h-4 w-4 flex-shrink-0" /> My Profile
                            </Link>
                            <Link href="/account/inquiries" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container rounded-lg transition-colors duration-200">
                              <MessageCircle className="h-4 w-4 flex-shrink-0" /> My Inquiries
                            </Link>
                            <Link href="/account/saved" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container rounded-lg transition-colors duration-200">
                              <Heart className="h-4 w-4 flex-shrink-0" /> Saved Centers
                            </Link>
                          </>
                        )}
                        {isPartner && (
                          <>
                            <Link href="/partner" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container rounded-lg transition-colors duration-200">
                              <Building2 className="h-4 w-4 flex-shrink-0" /> Center Dashboard
                            </Link>
                            <Link href="/partner/edit" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container rounded-lg transition-colors duration-200">
                              <ClipboardList className="h-4 w-4 flex-shrink-0" /> Edit Profile
                            </Link>
                            <Link href="/partner/blog" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container rounded-lg transition-colors duration-200">
                              <BookOpen className="h-4 w-4 flex-shrink-0" /> My Articles
                            </Link>
                            <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container rounded-lg transition-colors duration-200">
                              <User className="h-4 w-4 flex-shrink-0" /> My Profile
                            </Link>
                          </>
                        )}
                        {isAdmin && (
                          <>
                            <Link href="/admin/edit-requests" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container rounded-lg transition-colors duration-200">
                              <ClipboardList className="h-4 w-4 flex-shrink-0" /> Edit Requests
                            </Link>
                            <Link href="/admin/analytics" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container rounded-lg transition-colors duration-200">
                              <BookOpen className="h-4 w-4 flex-shrink-0" /> Analytics
                            </Link>
                            <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-container rounded-lg transition-colors duration-200">
                              <User className="h-4 w-4 flex-shrink-0" /> My Profile
                            </Link>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </nav>

                {/* Bottom actions */}
                <div className="px-4 py-4 border-t border-surface-container mt-auto">
                  {user ? (
                    <Button variant="outline" className="w-full rounded-full ghost-border border-0" onClick={() => { handleSignOut(); setOpen(false); }}>
                      <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" className="w-full rounded-full ghost-border border-0" asChild>
                        <Link href="/auth/login" onClick={() => setOpen(false)}>Sign In</Link>
                      </Button>
                      <Button className="w-full rounded-full gradient-primary text-white" asChild>
                        <Link href="/assessment" onClick={() => setOpen(false)}>Start Assessment</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
