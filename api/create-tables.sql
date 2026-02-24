-- Gradify Web: Database Schema for Shared Hosting MySQL
-- Run this once in your hosting control panel (phpMyAdmin etc.)

CREATE TABLE IF NOT EXISTS user_settings (
    uid         VARCHAR(128)     NOT NULL PRIMARY KEY COMMENT 'Firebase UID',
    email       VARCHAR(255)     NOT NULL COMMENT 'Student email (verified server-side)',
    settings    JSON             NOT NULL COMMENT 'JSON blob of user preferences',
    created_at  DATETIME         NOT NULL DEFAULT NOW(),
    updated_at  DATETIME         NOT NULL DEFAULT NOW() ON UPDATE NOW(),

    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
