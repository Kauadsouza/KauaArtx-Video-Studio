-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "comments" INTEGER,
ADD COLUMN     "likes" INTEGER,
ADD COLUMN     "metricsAt" TIMESTAMP(3),
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "views" INTEGER,
ADD COLUMN     "youtubeId" TEXT NOT NULL DEFAULT '';
