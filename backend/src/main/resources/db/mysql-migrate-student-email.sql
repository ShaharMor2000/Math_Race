-- Run once on existing MySQL databases after upgrading the codebase.
-- Safe to ignore "Duplicate column name" if email already exists.

ALTER TABLE students ADD COLUMN email VARCHAR(190) NULL AFTER display_name;
