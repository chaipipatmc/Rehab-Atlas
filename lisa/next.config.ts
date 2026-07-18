import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // lisa/ lives inside the Rehab-Atlas repo which has its own lockfile —
  // pin the workspace root so Turbopack doesn't resolve against the parent app.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
