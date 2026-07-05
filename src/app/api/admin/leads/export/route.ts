import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}

// Wrap every field in double quotes; double any internal quotes.
function csvField(value: unknown): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

// GET: Export all leads as CSV
export async function GET() {
  const user = await verifyAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: leads, error } = await admin
    .from("leads")
    .select(
      "created_at, name, email, phone, country, who_for, age_range, urgency, budget, concern, status, preferred_center:centers(name)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Leads export failed:", error);
    return NextResponse.json({ error: "Failed to export leads" }, { status: 500 });
  }

  const header = [
    "created_at",
    "name",
    "email",
    "phone",
    "country",
    "who_for",
    "age_range",
    "urgency",
    "budget",
    "concern",
    "status",
    "preferred_center",
  ];

  const rows = (leads || []).map((lead) =>
    [
      lead.created_at,
      lead.name,
      lead.email,
      lead.phone,
      lead.country,
      lead.who_for,
      lead.age_range,
      lead.urgency,
      lead.budget,
      lead.concern,
      lead.status,
      (lead.preferred_center as unknown as { name: string } | null)?.name || "",
    ]
      .map(csvField)
      .join(",")
  );

  const csv = [header.map(csvField).join(","), ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leads-export.csv"',
    },
  });
}
