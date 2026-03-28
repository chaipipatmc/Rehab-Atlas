import { redirect } from "next/navigation";
import Link from "next/link";
import { Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { CenterCard } from "@/components/centers/center-card";
import type { Center, CenterPhoto } from "@/types/center";

export const metadata = {
  title: "Saved Centers — Rehab-Atlas",
  description: "Your saved rehab centers for easy reference.",
};

export default async function SavedCentersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/account/saved");
  }

  // Fetch saved center IDs
  const { data: savedRows } = await supabase
    .from("saved_centers")
    .select("center_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const centerIds = (savedRows || []).map((r: { center_id: string }) => r.center_id);

  // Fetch center details with photos
  let centers: (Center & { photos?: CenterPhoto[] })[] = [];
  if (centerIds.length > 0) {
    const { data } = await supabase
      .from("centers")
      .select("*, photos:center_photos(id, url, alt_text, sort_order)")
      .in("id", centerIds)
      .eq("status", "published")
      .order("sort_order", { referencedTable: "center_photos" })
      .limit(1, { referencedTable: "center_photos" });

    if (data) {
      // Preserve the saved order (most recently saved first)
      const centerMap = new Map(data.map((c) => [c.id, c]));
      centers = centerIds
        .map((id: string) => centerMap.get(id))
        .filter(Boolean) as (Center & { photos?: CenterPhoto[] })[];
    }
  }

  return (
    <div className="bg-surface min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 py-8 md:py-12 max-w-6xl">
        <h1 className="text-headline-lg font-semibold text-foreground mb-2">
          Saved Centers
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Centers you&apos;ve saved for later reference.
        </p>

        {centers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {centers.map((center) => (
              <CenterCard key={center.id} center={center} />
            ))}
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-ambient text-center">
            <Heart className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-headline-sm font-semibold text-foreground">
              No saved centers yet
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
              Browse our directory and tap the heart icon on any center to save
              it here for easy reference.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                className="rounded-full gradient-primary text-white hover:opacity-90"
                asChild
              >
                <Link href="/centers">
                  Browse Directory
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
