import path from "path";
import type { NextConfig } from "next";

// lisa/ lives inside the Rehab-Atlas repo — pin BOTH roots to this folder so
// Next.js doesn't treat the repo root as the workspace root (which would pull
// in the parent app's src/middleware.ts and lockfile). On Vercel, keep these
// in sync or outputFileTracingRoot wins and points at /vercel/path0.
const root = path.join(__dirname);

const nextConfig: NextConfig = {
  outputFileTracingRoot: root,
  turbopack: {
    root,
  },
};

export default nextConfig;
