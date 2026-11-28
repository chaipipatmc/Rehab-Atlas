import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** The signed-in user when their profile role is admin, otherwise null. */
export async function verifyAdmin(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role === "admin" ? user : null;
}
