"use client";

import { useEffect } from "react";

/**
 * Supabase email links (password reset, magic link, email confirm) use the
 * project's Site URL as their redirect base. If the configured redirect URL
 * isn't allow-listed in the Supabase dashboard, the link falls back to the bare
 * Site URL — i.e. it lands on `/?code=...` instead of `/auth/callback?code=...`,
 * and the code is never exchanged. This fire-and-forget catcher forwards any
 * stray `?code=` that lands outside the auth flow to `/auth/callback`, so a
 * reset link works even when the dashboard redirect allow-list is incomplete.
 *
 * No-ops on `/auth/*` (the callback + reset pages handle the code themselves)
 * and when there's no `code` param, so it has no effect on normal navigation.
 */
export function AuthCodeCatcher() {
  useEffect(() => {
    const { pathname, search } = window.location;
    if (pathname.startsWith("/auth/")) return;

    const params = new URLSearchParams(search);
    const code = params.get("code");
    if (!code) return;

    // Preserve an explicit `next` if present; otherwise assume a recovery link
    // and send the user to the set-a-new-password screen after the exchange.
    if (!params.get("next")) {
      params.set("next", "/auth/reset-password");
    }
    window.location.replace(`/auth/callback?${params.toString()}`);
  }, []);

  return null;
}
