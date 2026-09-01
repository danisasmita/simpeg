-- Migration: Email verification (verification tokens + verified flag)
-- Idempotent: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS email_verify_tokens (
    email VARCHAR(255) NOT NULL PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);