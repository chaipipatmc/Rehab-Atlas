import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import {
  SupabaseUnavailableError,
  fetchWithTimeout,
  throwIfUnavailable,
} from "@/lib/supabase/timeout";

// A fetch that never answers unless its signal aborts — the production
// failure mode (Supabase API not responding, functions hit the 300s limit).
const hangingFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => {
      reject(init.signal?.reason ?? new DOMException("aborted", "AbortError"));
    });
  });

describe("fetchWithTimeout", () => {
  it("aborts a request that never answers", async () => {
    const started = Date.now();
    const f = fetchWithTimeout(50, hangingFetch);
    await expect(f("https://example.invalid/")).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("still honours an abort signal passed by the caller", async () => {
    const f = fetchWithTimeout(10_000, hangingFetch);
    const ctrl = new AbortController();
    const p = f("https://example.invalid/", { signal: ctrl.signal });
    ctrl.abort();
    await expect(p).rejects.toThrow();
  });

  it("passes through a normal response", async () => {
    const ok: typeof fetch = async () => new Response("ok", { status: 200 });
    const res = await fetchWithTimeout(1_000, ok)("https://example.invalid/");
    expect(await res.text()).toBe("ok");
  });
});

describe("throwIfUnavailable", () => {
  it("throws on PostgREST transport failure (status 0)", () => {
    expect(() => throwIfUnavailable({ status: 0 }, "x")).toThrow(SupabaseUnavailableError);
  });

  it("does not throw on real HTTP answers, including 404/406 not-found", () => {
    expect(() => throwIfUnavailable({ status: 200 }, "x")).not.toThrow();
    expect(() => throwIfUnavailable({ status: 406 }, "x")).not.toThrow();
    expect(() => throwIfUnavailable(null, "x")).not.toThrow();
  });
});

describe("supabase-js with a bounded fetch", () => {
  it("turns a hung query into status 0 quickly, which pages convert to a throw", async () => {
    const client = createClient("https://example.supabase.co", "anon-test-key", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchWithTimeout(50, hangingFetch) },
    });
    const started = Date.now();
    const res = await client.from("pages").select("slug").limit(1);
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(res.status).toBe(0);
    expect(() => throwIfUnavailable(res, "pages")).toThrow(SupabaseUnavailableError);
  });
});

describe("transport failure reason in the error message", () => {
  it("includes the short reason and strips URLs", () => {
    expect(() =>
      throwIfUnavailable(
        { status: 0, error: { message: "TypeError: fetch failed https://x.supabase.co/rest/v1/pages?select=*" } },
        "blog list"
      )
    ).toThrow("Supabase unavailable (blog list): TypeError: fetch failed <url>");
  });
});
