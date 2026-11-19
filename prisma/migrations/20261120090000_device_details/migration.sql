-- AlterTable
ALTER TABLE "PageView" ADD COLUMN "browser" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PageView" ADD COLUMN "os" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PageView" ADD COLUMN "model" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "LoginAttempt" ADD COLUMN "clientInfo" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "LoginAttempt" ADD COLUMN "deviceId" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "LoginAttempt_deviceId_createdAt_idx" ON "LoginAttempt"("deviceId", "createdAt");
