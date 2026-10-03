import type { NextConfig } from "next";

import path from "node:path";

const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" } : {}),
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
