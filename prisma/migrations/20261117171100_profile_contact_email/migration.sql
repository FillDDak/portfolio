-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "name" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "coreStack" TEXT NOT NULL DEFAULT '',
    "githubUrl" TEXT NOT NULL DEFAULT '',
    "velogUrl" TEXT NOT NULL DEFAULT '',
    "notionUrl" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "resumeFile" TEXT,
    "resumeUpdatedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Profile" ("bio", "coreStack", "githubUrl", "id", "jobTitle", "name", "notionUrl", "resumeFile", "resumeUpdatedAt", "tagline", "updatedAt", "velogUrl") SELECT "bio", "coreStack", "githubUrl", "id", "jobTitle", "name", "notionUrl", "resumeFile", "resumeUpdatedAt", "tagline", "updatedAt", "velogUrl" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
