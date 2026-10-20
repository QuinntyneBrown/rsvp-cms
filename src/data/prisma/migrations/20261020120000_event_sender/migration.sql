-- AlterTable
ALTER TABLE "events" ADD COLUMN     "sender_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "reply_to" TEXT NOT NULL DEFAULT '';
