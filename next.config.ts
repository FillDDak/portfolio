import type { NextConfig } from "next";
import { buildSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  // 서버에서는 빌드하지 않고 .next/standalone 결과물만 올려서 실행한다.
  output: "standalone",
  poweredByHeader: false,
  // 이미지 변환(sharp)의 네이티브 라이브러리 파일(.dll/.so)이 자동 추적에서 빠져 standalone 에서 로드에 실패한다.
  // 관련 패키지를 통째로 포함시킨다.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/**/*",
      // 공유 미리보기 이미지(opengraph-image)가 실행 중에 읽는 글꼴 파일
      "./node_modules/pretendard/dist/public/static/Pretendard-Bold.otf",
      "./node_modules/pretendard/dist/public/static/Pretendard-Medium.otf",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders({ isDev: process.env.NODE_ENV === "development" }),
      },
    ];
  },
  // 프로젝트 상세처럼 요청 시점에 제목·설명이 정해지는 페이지는 이 태그들을 본문 뒤쪽에 이어서 보낸다.
  // 스크립트를 실행하지 않는 수집기는 그렇게 보내면 읽지 못하므로, 아래 User-Agent 에는 <head> 에 넣어 보낸다.
  // Next.js 기본 목록에 국내 서비스(카카오톡 미리보기, 다음)와 일반적인 수집기 이름을 더했다.
  // (모든 요청에 적용하는 /.*/ 는 링크를 미리 불러오는 요청이 끝나지 않는 문제가 있어 쓰지 않는다.)
  htmlLimitedBots:
    /bot|crawl|spider|slurp|scrap|preview|kakaotalk|Daum|Yeti|facebookexternalhit|facebookcatalog|WhatsApp|[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|yandex|sogou|tumblr|vkShare|ia_archiver|SkypeUri|googleweblight/i,
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
