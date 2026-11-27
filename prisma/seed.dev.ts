/**
 * 개발 중 화면 확인용 더미 데이터.
 *
 *   npm run seed:dev          더미 데이터를 채운다
 *   npm run seed:dev:clear    더미 데이터를 지워 "콘텐츠가 비어 있는 초기 상태"로 되돌린다
 *
 * 운영 DB에는 절대 실행하지 않는다. NODE_ENV=production 이면 바로 종료한다.
 */
import "dotenv/config";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

if (process.env.NODE_ENV === "production") {
  console.error("운영 환경에서는 개발용 시드를 실행할 수 없습니다.");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL 이 설정되지 않았습니다.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

async function clear() {
  await db.pageView.deleteMany();
  await db.dailyStat.deleteMany();
  await db.contactMessage.deleteMany();
  await db.project.deleteMany();
  await db.skill.deleteMany();
  await db.certificate.deleteMany();
  await db.experience.deleteMany();
  await db.post.deleteMany();
  await db.profile.update({ where: { id: 1 }, data: { coreStack: "", notionUrl: "" } });
}

/** 단색 바탕에 막대 몇 개를 그린 예시 이미지를 업로드 폴더에 만들고 본문에 넣을 주소를 돌려준다. */
async function seedImage(name: string, background: string, bar: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675">
    <rect width="1200" height="675" fill="${background}"/>
    ${[220, 380, 300, 500, 420]
      .map((h, i) => `<rect x="${170 + i * 180}" y="${575 - h}" width="110" height="${h}" rx="12" fill="${bar}"/>`)
      .join("")}
  </svg>`;
  const dir = path.resolve(process.env.UPLOAD_DIR ?? "./data/uploads", "images");
  await mkdir(dir, { recursive: true });
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(path.join(dir, `${name}.webp`));
  return `/uploads/${name}.webp`;
}

const projectBody = (problem: string, solution: string, result: string) => `## 문제

${problem}

## 해결

${solution}

## 결과

${result}
`;

async function fill() {
  await db.profile.update({
    where: { id: 1 },
    data: { coreStack: "Java, Spring Boot, JPA, MySQL, Redis, AWS" },
  });

  const projects = [
    {
      title: "[예시] 선착순 쿠폰 발급 시스템",
      slug: "example-coupon",
      summary: "동시 요청 1만 건에서도 초과 발급 없이 동작하는 선착순 쿠폰 API",
      role: "백엔드 (API 설계, 동시성 제어, 부하 테스트)",
      teamSize: 4,
      startDate: "2026-03",
      endDate: "2026-06",
      highlights: "초과 발급 0건\n평균 응답 시간 820ms → 95ms\n처리량 1,200 TPS",
      isFeatured: true,
      tags: ["Java", "Spring Boot", "Redis", "MySQL", "k6"],
      demoUrl: "https://example.com",
      githubUrl: "https://github.com/FillDDak",
      docsUrl: "https://example.com/docs",
      body: projectBody(
        "이벤트 시작 직후 요청이 몰리면 재고보다 많은 쿠폰이 발급되었습니다. 비관적 락으로 막으면 정합성은 지켜지지만 응답 시간이 800ms 이상으로 늘었습니다.",
        "재고 차감을 Redis의 원자적 연산으로 옮기고, 발급 내역 저장은 큐에 넣어 비동기로 처리했습니다.\n\n- 재고 확인과 차감을 Lua 스크립트 한 번으로 처리\n- 중복 발급은 사용자별 Set 으로 차단\n- 저장 실패는 재시도 후 별도 테이블에 기록\n\n```java\nLong remain = redis.execute(decreaseScript, keys, userId);\nif (remain < 0) throw new SoldOutException();\n```",
        "| 항목 | 개선 전 | 개선 후 |\n| --- | --- | --- |\n| 초과 발급 | 37건 | 0건 |\n| 평균 응답 시간 | 820ms | 95ms |\n| 처리량 | 140 TPS | 1,200 TPS |\n\nk6로 가상 사용자 1만 명 조건에서 측정했습니다.",
      ),
    },
    {
      title: "[예시] 스터디 모집 게시판",
      slug: "example-study-board",
      summary: "검색과 무한 스크롤을 지원하는 스터디 모집 서비스의 REST API",
      role: "백엔드 (인증, 게시글·댓글 API, 배포)",
      teamSize: 3,
      startDate: "2025-11",
      endDate: "2026-01",
      highlights: "목록 조회 쿼리 12회 → 2회\n테스트 커버리지 82%",
      isFeatured: false,
      tags: ["Java", "Spring Boot", "JPA", "MySQL", "GitHub Actions", "AWS EC2"],
      demoUrl: "",
      githubUrl: "https://github.com/FillDDak",
      docsUrl: "",
      body: projectBody(
        "게시글 목록을 조회할 때 작성자와 태그를 글마다 따로 조회해 N+1 문제가 발생했습니다.",
        "fetch join 과 batch size 설정으로 연관 데이터를 한 번에 가져오고, 커서 기반 페이지네이션으로 바꿨습니다.",
        "목록 조회 한 번에 실행되는 쿼리가 12회에서 2회로 줄었습니다.",
      ),
    },
    {
      title: "[예시] 개인 가계부 API",
      slug: "example-ledger",
      summary: "월별 지출 통계를 제공하는 개인 프로젝트",
      role: "개인 프로젝트 (전체)",
      teamSize: 1,
      startDate: "2025-08",
      endDate: null,
      highlights: "통계 조회 1.4s → 60ms",
      isFeatured: false,
      tags: ["Kotlin", "Spring Boot", "PostgreSQL", "Docker"],
      demoUrl: "",
      githubUrl: "",
      docsUrl: "",
      body: projectBody(
        "거래 내역이 늘어나면서 월별 통계 조회가 1초 이상 걸렸습니다.",
        "일별 집계 테이블을 두고 거래가 저장될 때 함께 갱신하도록 바꿨습니다.",
        "통계 조회 시간이 1.4초에서 60ms로 줄었습니다.",
      ),
    },
  ];

  for (const [index, project] of projects.entries()) {
    const { tags, ...data } = project;
    await db.project.create({
      data: {
        ...data,
        isPublished: true,
        sortOrder: index,
        tags: { create: tags.map((name, sortOrder) => ({ name, sortOrder })) },
      },
    });
  }

  const skills: Record<string, [string, "USED" | "LEARNED"][]> = {
    Backend: [["Java", "USED"], ["Spring Boot", "USED"], ["JPA", "USED"], ["Kotlin", "LEARNED"]],
    Frontend: [["TypeScript", "LEARNED"], ["React", "LEARNED"]],
    Database: [["MySQL", "USED"], ["Redis", "USED"], ["PostgreSQL", "LEARNED"]],
    "Infra·DevOps": [["AWS EC2", "USED"], ["GitHub Actions", "USED"], ["Nginx", "USED"], ["Docker", "LEARNED"]],
    Tools: [["Git", "USED"], ["IntelliJ IDEA", "USED"], ["k6", "USED"]],
  };
  const categories = await db.skillCategory.findMany();
  for (const category of categories) {
    const items = skills[category.name] ?? [];
    for (const [index, [name, level]] of items.entries()) {
      await db.skill.create({ data: { categoryId: category.id, name, level, sortOrder: index } });
    }
  }

  const coupon = await db.project.findUnique({ where: { slug: "example-coupon" }, select: { id: true } });
  await db.experience.createMany({
    data: [
      {
        kind: "EDUCATION",
        title: "[예시] ○○대학교",
        subtitle: "컴퓨터공학과 학사 졸업",
        startDate: "2020-03",
        endDate: "2026-02",
      },
      {
        kind: "TRAINING",
        title: "[예시] ○○ 백엔드 부트캠프",
        subtitle: "Java 백엔드 개발자 과정 (960시간)",
        startDate: "2025-03",
        endDate: "2025-09",
        description: "Spring Boot·JPA 기반 팀 프로젝트 3회, 팀장 1회\n코드 리뷰와 테스트 작성을 매주 진행",
        projectId: coupon?.id ?? null,
      },
      {
        kind: "ACTIVITY",
        title: "[예시] 백엔드 스터디",
        subtitle: "운영진",
        startDate: "2025-10",
        endDate: "",
        description: "매주 대규모 시스템 설계 사례를 읽고 발표",
      },
      { kind: "AWARD", title: "[예시] ○○ 해커톤 우수상", subtitle: "○○협회", startDate: "2025-08" },
    ],
  });

  const studyBoard = await db.project.findUnique({ where: { slug: "example-study-board" }, select: { id: true } });
  // 목록 썸네일 확인용 이미지(본문의 첫 이미지가 썸네일이 된다).
  const chartImage = await seedImage("5eed0000000000000000000000000001", "#1e3a8a", "#60a5fa");
  const flowImage = await seedImage("5eed0000000000000000000000000002", "#14532d", "#4ade80");
  await db.post.createMany({
    data: [
      {
        category: "TROUBLESHOOTING",
        title: "[예시] 선착순 쿠폰 초과 발급 문제",
        slug: "example-coupon-over-issue",
        summary: "동시 요청에서 재고보다 많이 발급되던 문제를 Redis 원자 연산으로 해결했습니다.",
        tags: "Redis, Spring Boot",
        date: "2026-04-10",
        isPublished: true,
        projectId: coupon?.id ?? null,
        body: "## 문제 상황\n\n이벤트 시작 직후 재고 100개에 137개가 발급되었습니다.\n\n![발급 수 그래프](" + chartImage + ")\n\n## 원인\n\n재고 확인과 차감이 서로 다른 쿼리라 그 사이에 다른 요청이 끼어들었습니다.\n\n## 해결\n\n```lua\nlocal remain = redis.call('DECR', KEYS[1])\nif remain < 0 then return -1 end\nreturn remain\n```\n\n## 결과\n\n초과 발급 0건.\n",
      },
      {
        category: "TROUBLESHOOTING",
        title: "[예시] 쿠폰 발급 API 응답 지연",
        slug: "example-coupon-latency",
        summary: "비관적 락 대기로 800ms 넘게 걸리던 응답을 비동기 저장으로 95ms까지 줄였습니다.",
        tags: "MySQL, k6",
        date: "2026-05-02",
        isPublished: true,
        projectId: coupon?.id ?? null,
        body: "## 문제 상황\n\n부하 테스트에서 평균 응답 시간이 820ms 였습니다.\n\n## 원인\n\n락을 기다리는 시간이 대부분이었습니다.\n\n## 해결\n\n발급 내역 저장을 큐로 넘겼습니다.\n\n## 결과\n\n| 항목 | 전 | 후 |\n| --- | --- | --- |\n| 평균 응답 | 820ms | 95ms |\n",
      },
      {
        category: "TROUBLESHOOTING",
        title: "[예시] 게시글 목록 N+1 문제",
        slug: "example-board-n-plus-one",
        summary: "fetch join 과 batch size 로 목록 조회 쿼리를 12회에서 2회로 줄였습니다.",
        tags: "JPA",
        date: "2025-12-15",
        isPublished: true,
        projectId: studyBoard?.id ?? null,
        body: "## 문제 상황\n\n목록 한 번에 쿼리가 12번 실행되었습니다.\n\n## 해결\n\nfetch join 과 `default_batch_fetch_size` 를 썼습니다.\n",
      },
      {
        category: "NOTE",
        title: "[예시] Spring 트랜잭션 전파 정리",
        slug: "example-transaction-propagation",
        summary: "REQUIRED 와 REQUIRES_NEW 의 차이를 예제 코드로 정리했습니다.",
        tags: "Spring Boot",
        date: "2026-06-20",
        isPublished: true,
        body: "## REQUIRED\n\n![전파 흐름](" + flowImage + ")\n\n바깥 트랜잭션에 참여합니다.\n\n## REQUIRES_NEW\n\n항상 새 트랜잭션을 엽니다.\n",
      },
      {
        category: "NOTE",
        title: "[예시] 작성 중인 글",
        slug: "example-draft",
        summary: "비공개 글은 공개 페이지에 보이지 않습니다.",
        date: "2026-07-01",
        isPublished: false,
      },
    ],
  });

  await db.certificate.createMany({
    data: [
      { name: "[예시] 정보처리기사", issuer: "한국산업인력공단", acquiredAt: "2026-06-12", sortOrder: 0 },
      { name: "[예시] SQLD", issuer: "한국데이터산업진흥원", acquiredAt: "2025-12-19", sortOrder: 1 },
    ],
  });
}

async function main() {
  await clear();
  if (process.argv.includes("--clear")) {
    console.log("더미 데이터를 지웠습니다. (콘텐츠가 비어 있는 초기 상태)");
    return;
  }
  await fill();
  console.log("더미 데이터를 채웠습니다.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
