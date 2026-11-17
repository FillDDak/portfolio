import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/data/public";
import { SITE_MARK } from "@/lib/site";

/** 링크를 공유했을 때 보이는 미리보기 이미지. 프로필 내용으로 그린다. */
export const alt = "포트폴리오 미리보기";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 한글을 그리려면 글꼴 파일이 필요하다(woff2 는 지원하지 않아 otf 를 쓴다).
// next.config.ts 의 outputFileTracingIncludes 가 이 두 파일을 배포 결과물에 포함시킨다.
const fontDir = join(process.cwd(), "node_modules/pretendard/dist/public/static");

export default async function OpengraphImage() {
  const [profile, bold, medium] = await Promise.all([
    getProfile(),
    readFile(join(fontDir, "Pretendard-Bold.otf")),
    readFile(join(fontDir, "Pretendard-Medium.otf")),
  ]);
  const stack = profile.coreStack.slice(0, 6);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0d1017",
          color: "#e9ecf2",
          fontFamily: "Pretendard",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, fontWeight: 500, color: "#9ca6b7" }}>
          {SITE_MARK}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 500, color: "#9fb9ff" }}>
            {profile.jobTitle}
          </div>
          <div style={{ display: "flex", marginTop: 8, fontSize: 104, fontWeight: 700, letterSpacing: -2 }}>
            {profile.name}
          </div>
          {profile.tagline ? (
            <div
              style={{
                display: "flex",
                marginTop: 20,
                maxWidth: 960,
                fontSize: 38,
                fontWeight: 500,
                lineHeight: 1.4,
                color: "#c5ccd9",
              }}
            >
              {profile.tagline}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, minHeight: 52 }}>
          {stack.map((item) => (
            <div
              key={item}
              style={{
                display: "flex",
                padding: "8px 20px",
                borderRadius: 10,
                background: "#1b212d",
                border: "1px solid #364052",
                fontSize: 26,
                fontWeight: 500,
                color: "#c5ccd9",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: bold, style: "normal", weight: 700 },
        { name: "Pretendard", data: medium, style: "normal", weight: 500 },
      ],
    },
  );
}
