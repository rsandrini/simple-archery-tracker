/*
  Warnings:

  - Added the required column `updatedAt` to the `Arrow` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Arrow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "score" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "isX" BOOLEAN NOT NULL DEFAULT false,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "distance" TEXT,
    "spotIndex" INTEGER,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Arrow_endId_fkey" FOREIGN KEY ("endId") REFERENCES "End" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Arrow" ("distance", "endId", "id", "index", "isX", "points", "score", "spotIndex", "x", "y", "updatedAt") SELECT "distance", "endId", "id", "index", "isX", "points", "score", "spotIndex", "x", "y", CURRENT_TIMESTAMP FROM "Arrow";
DROP TABLE "Arrow";
ALTER TABLE "new_Arrow" RENAME TO "Arrow";
CREATE UNIQUE INDEX "Arrow_endId_index_key" ON "Arrow"("endId", "index");
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "targetVariant" TEXT NOT NULL DEFAULT '1-SPOT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "notes" TEXT,
    "rating" INTEGER,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("createdAt", "id", "modality", "notes", "rating", "targetVariant", "userId", "updatedAt") SELECT "createdAt", "id", "modality", "notes", "rating", "targetVariant", "userId", CURRENT_TIMESTAMP FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
