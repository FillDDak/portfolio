import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 서버에서는 빌드하지 않고 .next/standalone 결과물만 올려서 실행한다.
  output: "standalone",
  poweredByHeader: false,
  // 이미지 변환(sharp)의 네이티브 라이브러리 파일(.dll/.so)이 자동 추적에서 빠져 standalone 에서 로드에 실패한다.
  // 관련 패키지를 통째로 포함시킨다.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/sharp/**/*", "./node_modules/@img/**/*"],
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // /api/admin 요청은 proxy 를 거치면서 본문이 메모리에 잠시 담긴다. PDF(20MB) 업로드가 잘리지 않게 한도를 맞춘다.
    proxyClientMaxBodySize: "25mb",
  },
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
