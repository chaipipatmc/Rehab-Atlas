"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { MessageCircle, Clock, CheckCircle, ArrowRight, AlertCircle } from "lucide-react";

interface Inquiry {
  id: string;
  concern: string | null;
  status: string;
  created_at: string;
  preferred_center_name: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  new: { label: "Received", color: "text-amber-600", icon: Clock },
  reviewed: { label: "Under Review", color: "text-blue-600", icon: Clock },
  forwarded: { label: "Forwarded", color: "text-primary", icon: CheckCircle },
  closed: { label: "Closed", color: "text-muted-foreground", icon: CheckCircle },
};

export default function MyInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login?redirect=/account/inquiries");
        return;
      }

      try {
        const res = await fetch("/api/my-inquiries");
        if (!res.ok) {
          setError("Unable to load inquiries. Please try again later.");
        } else {
          const data = await res.json();
          setInquiries(data.inquiries || []);
        }
      } catch {
        setError("Unable to load inquiries. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-surface-container animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-surface min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-2xl">
        <h1 className="text-headline-lg font-semibold text-foreground mb-2">My Inquiries</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Track the status of your submitted inquiries.
        </p>

        {error && (
          <div className="bg-destructive/5 rounded-xl p-4 mb-6 flex gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">{error}</p>
          </div>
        )}

        {!error && inquiries.length === 0 && (
          <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-ambient text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-headline-sm font-semibold text-foreground">No inquiries yet</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
              You haven&apos;t submitted any inquiries. When you do, you can track their status here.
            </p>
            <div className="mt-6">
              <Link
                href="/inquiry"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-dim transition-colors duration-300"
              >
                Submit an inquiry <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {!error && inquiries.length > 0 && (
          <div className="space-y-4">
            {inquiries.map((inquiry) => {
              const statusCfg = STATUS_CONFIG[inquiry.status] ?? STATUS_CONFIG.new;
              const StatusIcon = statusCfg.icon;
              return (
                <div
                  key={inquiry.id}
                  className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {inquiry.preferred_center_name && (
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                          {inquiry.preferred_center_name}
                        </p>
                      )}
                      <p className="text-sm text-foreground line-clamp-2">
                        {inquiry.concern || "General inquiry"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(inquiry.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1.5 flex-shrink-0 ${statusCfg.color}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">{statusCfg.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="bg-surface-container-low rounded-xl p-4 flex items-center gap-3 mt-6">
              <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                All inquiries are handled confidentially. Our team will contact you by email.
              </p>
            </div>

            <div className="text-center mt-4">
              <Link
                href="/inquiry"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-dim transition-colors duration-300"
              >
                Submit a new inquiry <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
