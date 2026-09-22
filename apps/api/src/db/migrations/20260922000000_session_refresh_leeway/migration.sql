-- Refresh-token leeway: previous-jti grace window + anomaly counter.
-- Lets a lost-response retry present the superseded jti a bounded number
-- of times; unknown jtis still trigger full session revocation.
ALTER TABLE "Session" ADD COLUMN "previous_refresh_id" TEXT;
ALTER TABLE "Session" ADD COLUMN "previous_issued_at" TIMESTAMPTZ(3);
ALTER TABLE "Session" ADD COLUMN "old_token_use_count" INTEGER NOT NULL DEFAULT 0;
