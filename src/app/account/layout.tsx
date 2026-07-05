import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountNav } from "./account-nav";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/account");
  }

  return (
    <div className="bg-surface">
      <div className="container mx-auto px-4 sm:px-6 pt-6 max-w-6xl">
        <AccountNav />
      </div>
      {children}
    </div>
  );
}
