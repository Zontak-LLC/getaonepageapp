-- CreateTable
CREATE TABLE "conversation_sessions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "partial_spec" JSONB,
    "partial_intake" JSONB,
    "spec_status" TEXT NOT NULL DEFAULT 'gathering',
    "build_result" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_sessions_session_id_key" ON "conversation_sessions"("session_id");
