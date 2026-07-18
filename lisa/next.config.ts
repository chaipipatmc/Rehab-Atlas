import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

// Local dev only: the parent Rehab-Atlas repo has its own lockfile, so pin the
// workspace root to this folder or Next infers the repo root and compiles the
// parent app's middleware. On Vercel (Root Directory = lisa, "include files
// outside root" disabled) the defaults are already correct — and overriding
// outputFileTracingRoot there breaks Vercel's build-output collection.
if (!process.env.VERCEL) {
  const root = path.join(__dirname);
  nextConfig.outputFileTracingRoot = root;
  nextConfig.turbopack = { root };
}

export default nextConfig;
