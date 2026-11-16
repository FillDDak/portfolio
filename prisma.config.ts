import "dotenv/config";
import { defineConfig } from "prisma/config";

// DATABASE_URL 예: file:./data/dev.db (개발), file:/var/lib/portfolio/portfolio.db (운영)
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./data/dev.db",
  },
});
