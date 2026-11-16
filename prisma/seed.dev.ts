/**
 * 개발 중 화면 확인용 더미 데이터.
 *
 *   npm run seed:dev          더미 데이터를 채운다
 *   npm run seed:dev:clear    더미 데이터를 지워 "콘텐츠가 비어 있는 초기 상태"로 되돌린다
 *
 * 운영 DB에는 절대 실행하지 않는다. NODE_ENV=production 이면 바로 종료한다.
 */
import "dotenv/config";
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
  await db.profile.update({ where: { id: 1 }, data: { coreStack: "", notionUrl: "" } });
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
