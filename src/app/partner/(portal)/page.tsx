import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Pencil, Image, Clock, Eye, ExternalLink, BookOpen, CheckCircle, FileText, MousePointerClick, TrendingUp, Percent, ArrowDown } from "lucide-react";

export default async function PartnerDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("center_id")
    .eq("id", user!.id)
    .single();

  const { data: center } = await supabase
    .from("centers")
    .select("*")
    .eq("id", profile!.center_id!)
    .single();

  const { count: photoCount } = await supabase
    .from("center_photos")
    .select("*", { count: "exact", head: true })
    .eq("center_id", profile!.center_id!);

  const { count: pendingCount } = await supabase
    .from("center_edit_requests")
    .select("*", { count: "exact", head: true })
    .eq("center_id", profile!.center_id!)
    .eq("status", "pending");

  const { count: totalEdits } = await supabase
    .from("center_edit_requests")
    .select("*", { count: "exact", head: true })
    .eq("center_id", profile!.center_id!);

  // Article counts (use admin client to bypass RLS on pages table)
  const admin = createAdminClient();
  const { data: articles } = await admin
    .from("pages")
    .select("status")
    .eq("author_center_id", profile!.center_id!)
    .eq("author_type", "partner");

  const articlePublished = (articles || []).filter((a) => a.status === "published").length;
  const articleDraft = (articles || []).filter((a) => a.status === "draft").length;
  const articleTotal = (articles || []).length;

  // Profile analytics (all time + last 30 days)
  const { data: analyticsAll } = await admin
    .from("center_analytics")
    .select("profile_views, card_clicks, inquiry_clicks")
    .eq("center_id", profile!.center_id!);

  const totalViews = (analyticsAll || []).reduce((sum, r) => sum + (r.profile_views || 0), 0);
  const totalClicks = (analyticsAll || []).reduce((sum, r) => sum + (r.card_clicks || 0), 0);
  const totalInquiryClicks = (analyticsAll || []).reduce((sum, r) => sum + (r.inquiry_clicks || 0), 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: analytics30d } = await admin
    .from("center_analytics")
    .select("profile_views, card_clicks")
    .eq("center_id", profile!.center_id!)
    .gte("event_date", thirtyDaysAgo.toISOString().split("T")[0]);

  const views30d = (analytics30d || []).reduce((sum, r) => sum + (r.profile_views || 0), 0);
  const clicks30d = (analytics30d || []).reduce((sum, r) => sum + (r.card_clicks || 0), 0);

  // Commission & blog tier data
  const commissionRate = (center?.commission_rate as number) || null;
  const agreementStatus = (center?.agreement_status as string) || "none";
  const hasActiveAgreement = agreementStatus === "active";

  // Current month blog count (approved articles published this calendar month)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: currentMonthBlogs } = await admin
    .from("pages")
    .select("id")
    .eq("author_center_id", profile!.center_id!)
    .eq("author_type", "partner")
    .eq("status", "published")
    .gte("created_at", startOfMonth)
    .lte("created_at", endOfMonth);

  const blogsThisMonth = currentMonthBlogs?.length || 0;

  // Determine effective rate and tier
  const effectiveRate = blogsThisMonth >= 6 ? 8 : blogsThisMonth >= 3 ? 10 : 12;
  const currentTier = blogsThisMonth >= 6 ? "Premium" : blogsThisMonth >= 3 ? "Standard" : "Base";
  const blogsToNextTier = blogsThisMonth >= 6 ? 0 : blogsThisMonth >= 3 ? (6 - blogsThisMonth) : (3 - blogsThisMonth);
  const nextTierRate = blogsThisMonth >= 6 ? null : blogsThisMonth >= 3 ? 8 : 10;
  const nextTierBlogs = blogsThisMonth >= 6 ? null : blogsThisMonth >= 3 ? 6 : 3;

  // Last month's blog count (determines this month's applied rate)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1).toISOString();
  const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: lastMonthBlogs } = await admin
    .from("pages")
    .select("id")
    .eq("author_center_id", profile!.center_id!)
    .eq("author_type", "partner")
    .eq("status", "published")
    .gte("created_at", startOfLastMonth)
    .lte("created_at", endOfLastMonth);

  const blogsLastMonth = lastMonthBlogs?.length || 0;
  const appliedRate = blogsLastMonth >= 6 ? 8 : blogsLastMonth >= 3 ? 10 : 12;
  const appliedTier = blogsLastMonth >= 6 ? "Premium" : blogsLastMonth >= 3 ? "Standard" : "Base";

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonthName = monthNames[now.getMonth()];
  const lastMonthName = monthNames[lastMonth.getMonth()];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-headline-lg font-semibold text-foreground">{center?.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-[10px] uppercase tracking-wider font-medium rounded-full px-2 py-0.5 ${
              center?.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}>
              {center?.status}
            </span>
            {center?.slug && (
              <Link href={`/centers/${center.slug}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                <ExternalLink className="h-3 w-3" /> View public profile
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Profile Performance */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Profile Performance</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <Eye className="h-4 w-4 text-primary mb-1.5" />
            <p className="text-2xl font-semibold text-foreground">{totalViews.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Profile Views</p>
            <p className="text-[10px] text-primary mt-0.5">{views30d} last 30 days</p>
          </div>
          <div>
            <MousePointerClick className="h-4 w-4 text-primary mb-1.5" />
            <p className="text-2xl font-semibold text-foreground">{totalClicks.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Card Clicks</p>
            <p className="text-[10px] text-primary mt-0.5">{clicks30d} last 30 days</p>
          </div>
          <div>
            <TrendingUp className="h-4 w-4 text-emerald-600 mb-1.5" />
            <p className="text-2xl font-semibold text-foreground">{totalInquiryClicks.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Inquiry Clicks</p>
          </div>
          <div>
            <CheckCircle className="h-4 w-4 text-amber-600 mb-1.5" />
            <p className="text-2xl font-semibold text-foreground">
              {totalViews > 0 ? ((totalInquiryClicks / totalViews) * 100).toFixed(1) : "0.0"}%
            </p>
            <p className="text-[10px] text-muted-foreground">Conversion Rate</p>
          </div>
        </div>
      </div>

      {/* Commission & Blog Progress */}
      {hasActiveAgreement && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Commission & Blog Progress</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Current Applied Rate */}
            <div className="bg-primary/5 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                Your Commission Rate ({currentMonthName})
              </p>
              <p className="text-3xl font-semibold text-primary">{appliedRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {appliedTier} tier — based on {blogsLastMonth} blog{blogsLastMonth !== 1 ? "s" : ""} published in {lastMonthName}
              </p>
            </div>

            {/* Blog Progress This Month */}
            <div className="bg-surface-container-low rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                Blogs Published in {currentMonthName}
              </p>
              <p className="text-3xl font-semibold text-foreground">{blogsThisMonth}</p>
              {blogsToNextTier > 0 && nextTierRate ? (
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-primary font-medium">{blogsToNextTier} more</span> to reach {nextTierBlogs} blogs and unlock <span className="font-medium">{nextTierRate}%</span> next month
                </p>
              ) : (
                <p className="text-xs text-emerald-600 mt-1 font-medium">
                  Maximum discount reached — 8% next month
                </p>
              )}
            </div>
          </div>

          {/* Commission Tiers */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { blogs: 0, rate: 12, label: "Base", tier: blogsThisMonth < 3 },
              { blogs: 3, rate: 10, label: "Standard", tier: blogsThisMonth >= 3 && blogsThisMonth < 6 },
              { blogs: 6, rate: 8, label: "Premium", tier: blogsThisMonth >= 6 },
            ].map(({ blogs, rate, label, tier }) => (
              <div
                key={label}
                className={`rounded-lg p-3 text-center ${
                  tier ? "bg-primary/10 ring-1 ring-primary/20" : "bg-surface-container-low"
                }`}
              >
                <p className={`text-lg font-semibold ${tier ? "text-primary" : "text-foreground"}`}>{rate}%</p>
                <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                <p className="text-[10px] text-muted-foreground">{blogs === 0 ? "0-2" : blogs} blogs/mo</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
            Blog count resets on the 1st of each month. Only approved (published) blogs count toward your tier. This month&apos;s blogs determine next month&apos;s commission rate.
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient">
          <Image className="h-5 w-5 text-primary mb-2" />
          <p className="text-2xl font-semibold text-foreground">{photoCount || 0}</p>
          <p className="text-xs text-muted-foreground">Photos</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient">
          <Clock className="h-5 w-5 text-amber-600 mb-2" />
          <p className="text-2xl font-semibold text-foreground">{pendingCount || 0}</p>
          <p className="text-xs text-muted-foreground">Pending Edits</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient">
          <CheckCircle className="h-5 w-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-semibold text-foreground">{articlePublished}</p>
          <p className="text-xs text-muted-foreground">Published Articles</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient">
          <FileText className="h-5 w-5 text-amber-600 mb-2" />
          <p className="text-2xl font-semibold text-foreground">{articleDraft}</p>
          <p className="text-xs text-muted-foreground">Drafts / Pending</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient">
          <BookOpen className="h-5 w-5 text-primary mb-2" />
          <p className="text-2xl font-semibold text-foreground">{articleTotal}</p>
          <p className="text-xs text-muted-foreground">Total Articles</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient">
          <Clock className="h-5 w-5 text-muted-foreground mb-2" />
          <p className="text-2xl font-semibold text-foreground">{totalEdits || 0}</p>
          <p className="text-xs text-muted-foreground">Total Changes</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/partner/edit" className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient hover:shadow-ambient-lg transition-all duration-300 group">
          <Pencil className="h-5 w-5 text-primary mb-3" />
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Edit Center Profile</h3>
          <p className="text-xs text-muted-foreground mt-1">Update description, contact info, and pricing</p>
        </Link>
        <Link href="/partner/photos" className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient hover:shadow-ambient-lg transition-all duration-300 group">
          <Image className="h-5 w-5 text-primary mb-3" />
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Manage Photos</h3>
          <p className="text-xs text-muted-foreground mt-1">Add, remove, or reorder facility photos</p>
        </Link>
        <Link href="/partner/blog" className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient hover:shadow-ambient-lg transition-all duration-300 group">
          <BookOpen className="h-5 w-5 text-primary mb-3" />
          <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">My Articles</h3>
          <p className="text-xs text-muted-foreground mt-1">Write and manage your articles</p>
        </Link>
      </div>

      {/* Info Notice */}
      <div className="mt-8 bg-primary/5 rounded-xl p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          All changes you submit are reviewed by the Rehab-Atlas team before going live. This ensures accuracy and quality across our directory. Typical review time is 24-48 hours.
        </p>
      </div>
    </div>
  );
}
