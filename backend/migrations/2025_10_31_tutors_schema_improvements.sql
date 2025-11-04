-- Tutors schema improvements: add structured subjects and metadata

-- Add JSONB subjects_taught for flexible subject lists
ALTER TABLE tutors
  ADD COLUMN IF NOT EXISTS subjects_taught JSONB;

-- Add years_experience as integer; keep existing experience text for legacy
ALTER TABLE tutors
  ADD COLUMN IF NOT EXISTS years_experience INTEGER CHECK (years_experience >= 0);

-- Add currency for hourly_rate
ALTER TABLE tutors
  ADD COLUMN IF NOT EXISTS currency CHAR(3) DEFAULT 'USD';

-- Add verification_status with constraint
ALTER TABLE tutors
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

DO $$ BEGIN
  ALTER TABLE tutors
    ADD CONSTRAINT tutors_verification_status_chk
    CHECK (verification_status IN ('pending','approved','rejected'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Index for subjects_taught search
CREATE INDEX IF NOT EXISTS idx_tutors_subjects_taught_gin ON tutors USING GIN (subjects_taught);

-- Helpful name index via users table join typically; still add mode index
CREATE INDEX IF NOT EXISTS idx_tutors_preferred_mode ON tutors(preferred_mode);







