import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Receipt, Building2, CheckCircle, Clock, AlertCircle, DollarSign } from "lucide-react";

const PAYMENT_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  invoiced: "bg-blue-100 text-blue-800",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800",
  waived: "bg-gray-100 text-gray-700",
};

export default async function AdminCommissionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (profile?.role !== "admin") return <div>Access denied</div>;

  const admin = createAdminClient();

  // Get all commission reports with center info
  const { data: reports } = await admin
    .from("commission_reports")
    .select("*, centers(name, country, city, commission_rate, price_min)")
    .order("year_month", { ascending: false })
    .order("total_commission", { ascending: false })
    .limit(100);

  // Get active centers with agreements for summary
  const { data: activeCenters } = await admin
    .from("centers")
    .select("id, name, commission_rate, agreement_status, price_min, price_max")
    .eq("agreement_status", "active")
    .order("name");

  // Calculate totals per payment status
  const totalByStatus: Record<string, number> = { pending: 0, invoiced: 0, paid: 0, overdue: 0 };
  for (const r of reports || []) {
    const status = (r.payment_status as string) || "pending";
    totalByStatus[status] = (totalByStatus[status] || 0) + ((r.total_commission as number) || 0);
  }

  // Current month lead forwards per center
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { data: currentForwards } = await admin
    .from("lead_forwards")
    .select("center_id, partner_status")
    .gte("created_at", startOfMonth);

  const centerStats: Record<string, { forwarded: number; admitted: number; pending: number }> = {};
  for (const f of currentForwards || []) {
    const cid = f.center_id as string;
    if (!centerStats[cid]) centerStats[cid] = { forwarded: 0, admitted: 0, pending: 0 };
    centerStats[cid].forwarded++;
    if (f.partner_status === "admitted") centerStats[cid].admitted++;
    if (f.partner_status === "pending") centerStats[cid].pending++;
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Receipt className="h-6 w-6 text-primary" />
          <h1 className="text-headline-lg font-semibold text-foreground">Commission Overview</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Track commission across all partner centers.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient">
          <DollarSign className="h-5 w-5 text-amber-600 mb-2" />
          <p className="text-2xl font-semibold text-foreground">${totalByStatus.pending.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient">
          <Receipt className="h-5 w-5 text-blue-600 mb-2" />
          <p className="text-2xl font-semibold text-foreground">${totalByStatus.invoiced.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-muted-foreground">Invoiced</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient">
          <CheckCircle className="h-5 w-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-semibold text-foreground">${totalByStatus.paid.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-muted-foreground">Collected</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient">
          <AlertCircle className="h-5 w-5 text-red-600 mb-2" />
          <p className="text-2xl font-semibold text-foreground">${totalByStatus.overdue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-muted-foreground">Overdue</p>
        </div>
      </div>

      {/* Active Centers — Current Month */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden mb-8">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">Active Partners — {monthNames[now.getMonth()]} {now.getFullYear()}</h2>
          <p className="text-xs text-muted-foreground mt-1">Commission based on listed treatment fees</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="text-left px-6 py-3 font-medium">Center</th>
              <th className="text-left px-6 py-3 font-medium">Rate</th>
              <th className="text-left px-6 py-3 font-medium">Listed Fee</th>
              <th className="text-left px-6 py-3 font-medium">Forwarded</th>
              <th className="text-left px-6 py-3 font-medium">Admitted</th>
              <th className="text-left px-6 py-3 font-medium">Pending</th>
              <th className="text-left px-6 py-3 font-medium">Est. Commission</th>
            </tr>
          </thead>
          <tbody>
            {(activeCenters || []).map((c) => {
              const stats = centerStats[c.id as string] || { forwarded: 0, admitted: 0, pending: 0 };
              const rate = (c.commission_rate as number) || 12;
              const fee = (c.price_min as number) || 0;
              const estCommission = stats.admitted * fee * (rate / 100);

              return (
                <tr key={c.id as string} className="border-t border-surface-container-low hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-6 py-3">
                    <Link href={`/admin/centers/${c.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                      {c.name as string}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-primary">{rate}%</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">${fee.toLocaleString()}</td>
                  <td className="px-6 py-3 text-sm">{stats.forwarded}</td>
                  <td className="px-6 py-3 text-sm text-emerald-700 font-medium">{stats.admitted}</td>
                  <td className="px-6 py-3 text-sm text-amber-600">{stats.pending}</td>
                  <td className="px-6 py-3 text-sm font-semibold">${estCommission.toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                </tr>
              );
            })}
            {(!activeCenters || activeCenters.length === 0) && (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-sm text-muted-foreground">No active partner agreements yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Historical Reports */}
      {reports && reports.length > 0 && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
          <div className="px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">Commission History</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left px-6 py-3 font-medium">Month</th>
                <th className="text-left px-6 py-3 font-medium">Center</th>
                <th className="text-left px-6 py-3 font-medium">Admitted</th>
                <th className="text-left px-6 py-3 font-medium">Commission</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const [year, month] = (r.year_month as string).split("-");
                const monthLabel = `${monthNames[parseInt(month, 10) - 1]} ${year}`;
                const centerInfo = r.centers as Record<string, unknown> | null;
                const statusColor = PAYMENT_COLORS[(r.payment_status as string)] || PAYMENT_COLORS.pending;

                return (
                  <tr key={r.id as string} className="border-t border-surface-container-low">
                    <td className="px-6 py-3 text-sm text-foreground">{monthLabel}</td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{(centerInfo?.name as string) || "—"}</td>
                    <td className="px-6 py-3 text-sm">{r.total_admitted as number}</td>
                    <td className="px-6 py-3 text-sm font-semibold">${((r.total_commission as number) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${statusColor}`}>
                        {(r.payment_status as string || "pending").replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
