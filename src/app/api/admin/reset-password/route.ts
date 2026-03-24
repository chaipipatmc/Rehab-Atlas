import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { randomBytes } from "crypto";

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Rehab-Atlas <onboarding@resend.dev>";

export async function POST(req: Request) {
  // Verify caller is admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { userId, email } = await req.json();
  if (!userId || !email) {
    return NextResponse.json({ error: "Missing userId or email" }, { status: 400 });
  }

  const safeEmail = escapeHtml(String(email));

  // Generate a random temporary password
  const tempPassword = randomBytes(4).toString("hex") + "Aa1!";

  // Update the user's password via admin API
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: tempPassword,
  });

  if (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }

  // Send the new password via email
  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Rehab-Atlas — Your Password Has Been Reset",
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #2d3436;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-family: 'Noto Serif', Georgia, serif; font-size: 22px; color: #45636b; margin: 0;">Rehab-Atlas</h1>
          <p style="font-size: 11px; color: #9aa5a9; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Password Reset</p>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; border-left: 4px solid #45636b;">
          <p style="font-size: 14px; margin: 0 0 16px;">Hi,</p>
          <p style="font-size: 14px; margin: 0 0 16px;">Your password has been reset by our admin team. Here is your new temporary password:</p>

          <div style="background: white; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
            <code style="font-size: 20px; font-weight: bold; color: #45636b; letter-spacing: 2px;">${tempPassword}</code>
          </div>

          <p style="font-size: 13px; color: #5a6a70; margin: 16px 0 0;">
            Please sign in and change your password immediately from your profile settings.
          </p>
        </div>

        <p style="font-size: 11px; color: #9aa5a9; text-align: center; margin-top: 32px;">
          If you did not request this reset, please contact us immediately.
        </p>
      </div>
    `,
  });

  return NextResponse.json({ success: true });
}
