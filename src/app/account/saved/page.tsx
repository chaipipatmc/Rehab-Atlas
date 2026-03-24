"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SavedCentersPage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login?redirect=/account/saved");
      }
    }
    checkAuth();
  }, [router]);

  return (
    <div className="bg-surface min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-2xl">
        <h1 className="text-headline-lg font-semibold text-foreground mb-2">Saved Centers</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Centers you&apos;ve saved for later reference.
        </p>

        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-ambient text-center">
          <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-headline-sm font-semibold text-foreground">Coming Soon</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
            The Saved Centers feature is coming soon. In the meantime, browse our directory to find centers you&apos;re interested in.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="rounded-full gradient-primary text-white hover:opacity-90" asChild>
              <Link href="/centers">
                Browse Directory
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
