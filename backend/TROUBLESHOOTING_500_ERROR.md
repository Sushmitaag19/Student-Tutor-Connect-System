# Troubleshooting 500 Error on Student Registration

## Common Cause: Missing Database Column

The most common cause of a 500 error during student registration is that the `subjects` column doesn't exist in your `students` table.

## Quick Fix

### Option 1: Run the Migration Script (Recommended)

If you're using PostgreSQL command line (psql):

```bash
psql -U postgres -d Student_tutor -f backend/migration_add_subjects_column.sql
```

Or manually in psql:

```sql
\c Student_tutor

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS subjects TEXT[];

COMMENT ON COLUMN students.subjects IS 'Array of subjects that the student is interested in learning';
```

### Option 2: Check Current Schema

Run the verification script:

```bash
cd backend
node check-db-schema.js
```

This will tell you if the column exists and show you all current columns.

## Verify the Fix

After running the migration:

1. Restart your backend server
2. Try registering a student again
3. Check the server console logs for any errors

## Still Getting Errors?

If you're still getting a 500 error after adding the column:

1. **Check Server Logs**: Look at the console output when you try to register. The improved error handling will show more details.

2. **Verify Database Connection**: Make sure your `backend/connection.env` file has the correct database credentials.

3. **Check PostgreSQL Version**: The `TEXT[]` array type requires PostgreSQL. If you're using a different database, you may need to adjust the schema.

4. **Test Directly**: Try inserting a test record directly in the database:
   ```sql
   INSERT INTO students (user_id, academic_level, subjects, preferred_mode)
   VALUES (1, 'Bachelors', ARRAY['Math', 'Physics'], 'online');
   ```

## Error Message Details

With the improved error handling, you should now see more specific error messages:

- **"Database schema error"**: The `subjects` column doesn't exist (run migration)
- **"Foreign key constraint failed"**: The `user_id` doesn't exist in the `users` table
- **"Profile already exists"**: A student profile already exists for this user

Check the server console output for detailed error information.

