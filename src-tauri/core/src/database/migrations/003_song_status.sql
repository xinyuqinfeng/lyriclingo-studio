ALTER TABLE songs ADD COLUMN analysis_status TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE songs ADD COLUMN analysis_error TEXT;
