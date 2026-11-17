-- CreateTable
CREATE TABLE "EventStat" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "EventStat_event_date_idx" ON "EventStat"("event", "date");

-- CreateIndex
CREATE UNIQUE INDEX "EventStat_date_event_target_key" ON "EventStat"("date", "event", "target");
