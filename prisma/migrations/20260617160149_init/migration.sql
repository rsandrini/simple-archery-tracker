-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "modality" TEXT NOT NULL,
    "targetVariant" TEXT NOT NULL DEFAULT '1-SPOT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "End" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    CONSTRAINT "End_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Arrow" (
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
    CONSTRAINT "Arrow_endId_fkey" FOREIGN KEY ("endId") REFERENCES "End" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "End_sessionId_index_key" ON "End"("sessionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Arrow_endId_index_key" ON "Arrow"("endId", "index");
