import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL 환경 변수가 설정되지 않았습니다.");
  }
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

// 개발 서버의 핫 리로드에서 연결이 계속 늘어나지 않도록 전역에 한 번만 만든다.
export const db: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
