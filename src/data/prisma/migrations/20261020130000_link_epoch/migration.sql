-- AlterTable
ALTER TABLE "events" ADD COLUMN     "link_epoch" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "guests" ADD COLUMN     "link_epoch" INTEGER NOT NULL DEFAULT 0;
