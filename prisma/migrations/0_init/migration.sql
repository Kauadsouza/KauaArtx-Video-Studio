-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Stage" AS ENUM ('IDEIA', 'ROTEIRO', 'GRAVACAO', 'EDICAO', 'THUMBNAIL_TITULO', 'REVISAO', 'AGENDADO', 'POSTADO');

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "stage" "Stage" NOT NULL DEFAULT 'IDEIA',
    "order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT NOT NULL DEFAULT '',
    "thumbnailIdea" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptBlock" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "startSeconds" INTEGER NOT NULL DEFAULT 0,
    "endSeconds" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ScriptBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "stage" "Stage" NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Video_stage_order_idx" ON "Video"("stage", "order");

-- CreateIndex
CREATE INDEX "ScriptBlock_videoId_order_idx" ON "ScriptBlock"("videoId", "order");

-- CreateIndex
CREATE INDEX "ChecklistItem_videoId_stage_order_idx" ON "ChecklistItem"("videoId", "stage", "order");

-- AddForeignKey
ALTER TABLE "ScriptBlock" ADD CONSTRAINT "ScriptBlock_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
