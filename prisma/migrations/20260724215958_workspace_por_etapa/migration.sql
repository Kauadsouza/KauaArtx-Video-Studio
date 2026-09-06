-- CreateEnum
CREATE TYPE "BlockStatus" AS ENUM ('PENDENTE', 'EM_PROGRESSO', 'PRONTO');

-- AlterTable
ALTER TABLE "ScriptBlock" ADD COLUMN     "blockNotes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "editingStatus" "BlockStatus" NOT NULL DEFAULT 'PENDENTE',
ADD COLUMN     "recordingStatus" "BlockStatus" NOT NULL DEFAULT 'PENDENTE';

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "finalTitle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hook" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "learnings" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "publishAt" TIMESTAMP(3),
ADD COLUMN     "references" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "reviewNotes" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tags" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "titleOptions" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "videoUrl" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "youtubeDescription" TEXT NOT NULL DEFAULT '';
