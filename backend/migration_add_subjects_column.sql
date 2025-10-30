
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS subjects TEXT[];

COMMENT ON COLUMN students.subjects IS 'Array of subjects that the student is interested in learning';

