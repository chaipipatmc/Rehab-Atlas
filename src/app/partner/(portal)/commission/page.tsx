"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Receipt, CheckCircle, Clock, AlertCircle, TrendingUp,
} from "lucide-react";

interface CommissionReport {
  id: string;
  year_month: string;
  total_leads_forwarded: number;
  total_admitted: number;
  total_not_admitted: number;
  total_pending: number;
  commission_rate: number | null;
  total_treatment_fees: number | null;
  total_commission: number | null;
  currency: string;
  payment_status: string;
  payment_due_date: string | null;
  payment_received_date: string | null;
  invoice_number: string | null;
  generated_at: string;
}

interface CenterInfo {
  commission_rate: number | null;
  commission_type: string | null;
  agreement_status: string | null;
  price_min: number | null;
  price_max: number | null;
}

const PAYMENT_STATUS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800", icon: Clock },
  invoiced: { label: "Invoiced", color: "bg-blue-100 text-blue-800", icon: Receipt },
  paid: { label: "Paid", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-800", icon: AlertCircle },
  waived: { label: "Waived", color: "bg-gray-100 text-gray-700", icon: CheckCircle },
};

export default function PartnerCommissionPage() {
  const [reports, setReports] = useState<CommissionReport[]>([]);
  const [center, setCenter] = useState<CenterInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonthStats, setCurrentMonthStats] = useState({ forwarded: 0, admitted: 0, pending: 0 });

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("center_id")
        .eq("id", user!.id)
        .single();

      if (!profile?.center_id) return;

      // Load center commission info
      const { data: centerData } = await supabase
        .from("centers")
        .select("commission_rate, commission_type, agreement_status, price_min, price_max")
        .eq("id", profile.center_id)
        .single();
      setCenter(centerData as CenterInfo | null);

      // Load commission reports
      const { data: reportData } = await supabase
        .from("commission_reports")
        .select("*")
        .eq("center_id", profile.center_id)
        .order("year_month", { ascending: false });
      setReports((reportData || []) as CommissionReport[]);

      // Calculate current month stats from lead_forwards
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: forwards } = await supabase
        .from("lead_forwards")
        .select("partner_status")
        .eq("center_id", profile.center_id)
        .gte("created_at", startOfMonth);

      if (forwards) {
        setCurrentMonthStats({
          forwarded: forwards.length,
          admitted: forwards.filter((f) => f.partner_status === "admitted").length,
          pending: forwards.filter((f) => f.partner_status === "pending").length,
        });
      }

      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="animate-pulse h-96 bg-surface-container rounded-2xl" />;

  const treatmentFee = center?.price_min || 0;
  const currentRate = center?.commission_rate || 12;
  const estimatedCommissionPerAdmission = treatmentFee * (currentRate / 100);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const now = new Date();
  const currentMonthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  // Total outstanding
  const totalOutstanding = reports
    .filter((r) => r.payment_status === "pending" || r.payment_status === "invoiced" || r.payment_status === "overdue")
    .reduce((sum, r) => sum + (r.total_commission || 0), 0);

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Receipt className="h-6 w-6 text-primary" />
          <h1 className="text-headline-lg font-semibold text-foreground">Commission Report</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Monthly commission summary based on admitted referrals and your listed treatment fees.
        </p>
      </div>

      {/* Current Month Overview */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-ambient mb-8">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">{currentMonthLabel} — Current Month</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-semibold text-foreground">{currentMonthStats.forwarded}</p>
            <p className="text-xs text-muted-foreground">Referrals</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-emerald-700">{currentMonthStats.admitted}</p>
            <p className="text-xs text-muted-foreground">Admitted</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-primary">{currentRate}%</p>
            <p className="text-xs text-muted-foreground">Commission Rate</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">
              ${(currentMonthStats.admitted * estimatedCommissionPerAdmission).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground">Est. Commission</p>
          </div>
        </div>
        {currentMonthStats.pending > 0 && (
          <p className="text-xs text-amber-600 mt-3">
            {currentMonthStats.pending} referral{currentMonthStats.pending !== 1 ? "s" : ""} still pending your update
          </p>
        )}
      </div>

      {/* Commission Structure */}
      <div className="bg-primary/5 rounded-xl p-4 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">How Commission Works</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Commission is calculated as <span className="font-medium text-foreground">{currentRate}%</span> of your listed treatment fee (<span className="font-medium text-foreground">${treatmentFee.toLocaleString()}</span>).
          This rate is determined by the number of approved blogs you published last month.
          Commission applies to all admitted clients referred through Rehab-Atlas.
        </p>
        {totalOutstanding > 0 && (
          <p className="text-xs text-foreground font-medium mt-2">
            Total outstanding: ${totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {/* Monthly Reports */}
      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Monthly Reports</h2>

      {reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map((report) => {
            const [year, month] = report.year_month.split("-");
            const monthLabel = `${monthNames[parseInt(month, 10) - 1]} ${year}`;
            const paymentInfo = PAYMENT_STATUS[report.payment_status] || PAYMENT_STATUS.pending;
            const PaymentIcon = paymentInfo.icon;

            return (
              <div key={report.id} className="bg-surface-container-lowest rounded-2xl shadow-ambient overflow-hidden">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-foreground">{monthLabel}</h3>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-0.5 ${paymentInfo.color}`}>
                      <PaymentIcon className="h-3 w-3" />
                      {paymentInfo.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Referrals</p>
                      <p className="font-medium">{report.total_leads_forwarded}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Admitted</p>
                      <p className="font-medium text-emerald-700">{report.total_admitted}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Rate</p>
                      <p className="font-medium">{report.commission_rate || currentRate}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Commission Due</p>
                      <p className="font-semibold text-foreground">
                        ${(report.total_commission || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  {report.invoice_number && (
                    <p className="text-[10px] text-muted-foreground mt-2">Invoice: {report.invoice_number}</p>
                  )}
                  {report.payment_due_date && (
                    <p className="text-[10px] text-muted-foreground">Due: {new Date(report.payment_due_date).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl p-12 shadow-ambient text-center">
          <Receipt className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No commission reports yet. Reports are generated monthly once referrals are processed.</p>
        </div>
      )}
    </div>
  );
}
