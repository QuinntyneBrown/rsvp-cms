-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('Scheduled', 'Sending', 'Sent', 'Failed');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('Pending', 'Sent', 'Failed', 'Cancelled');

-- CreateTable
CREATE TABLE "organisers" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "password_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "organiser_id" INTEGER NOT NULL,
    "password_version" INTEGER NOT NULL,
    "last_seen" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "organiser_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "venue" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "invite_open" DATE NOT NULL,
    "invite_close" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "group_name" TEXT NOT NULL DEFAULT '',
    "plus_ones" INTEGER NOT NULL DEFAULT 0,
    "token" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "event_id" INTEGER NOT NULL,
    "draft" JSONB NOT NULL DEFAULT '[]',
    "published" JSONB,
    "draft_saved_at" TIMESTAMPTZ(3),
    "published_at" TIMESTAMPTZ(3),

    CONSTRAINT "pages_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "emails" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "send_at" TIMESTAMP(0) NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'Scheduled',
    "recipients" INTEGER NOT NULL,
    "sender_name" TEXT NOT NULL DEFAULT '',
    "reply_to" TEXT NOT NULL DEFAULT '',
    "locked_until" TIMESTAMPTZ(3),
    "sent_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" SERIAL NOT NULL,
    "email_id" INTEGER NOT NULL,
    "guest_id" INTEGER NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'Pending',
    "idempotency_key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ(3),
    "last_error" TEXT,
    "sent_at" TIMESTAMPTZ(3),

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responses" (
    "guest_id" INTEGER NOT NULL,
    "attending" BOOLEAN NOT NULL,
    "party_size" INTEGER NOT NULL,
    "meal" TEXT,
    "guest_names" JSONB NOT NULL DEFAULT '[]',
    "dietary" TEXT NOT NULL DEFAULT '',
    "song" TEXT NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("guest_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisers_email_key" ON "organisers"("email");

-- CreateIndex
CREATE INDEX "sessions_organiser_id_idx" ON "sessions"("organiser_id");

-- CreateIndex
CREATE INDEX "events_organiser_id_date_idx" ON "events"("organiser_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "guests_token_key" ON "guests"("token");

-- CreateIndex
CREATE UNIQUE INDEX "guests_code_key" ON "guests"("code");

-- CreateIndex
CREATE INDEX "guests_event_id_name_idx" ON "guests"("event_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "guests_event_id_email_key" ON "guests"("event_id", "email");

-- CreateIndex
CREATE INDEX "emails_status_send_at_idx" ON "emails"("status", "send_at");

-- CreateIndex
CREATE INDEX "emails_event_id_idx" ON "emails"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_idempotency_key_key" ON "deliveries"("idempotency_key");

-- CreateIndex
CREATE INDEX "deliveries_guest_id_idx" ON "deliveries"("guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_email_id_guest_id_key" ON "deliveries"("email_id", "guest_id");

-- CreateIndex
CREATE INDEX "responses_updated_at_idx" ON "responses"("updated_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_organiser_id_fkey" FOREIGN KEY ("organiser_id") REFERENCES "organisers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organiser_id_fkey" FOREIGN KEY ("organiser_id") REFERENCES "organisers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "emails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
