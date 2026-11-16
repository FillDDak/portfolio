import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 서버에서는 빌드하지 않고 .next/standalone 결과물만 올려서 실행한다.
  output: "standalone",
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
