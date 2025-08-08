-- First, let's identify and handle duplicate emails
-- Step 1: Find duplicate emails
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Count duplicate emails
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT email, COUNT(*) as email_count
        FROM student_details 
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Log the duplicates found
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Found % duplicate email addresses that need to be resolved.', duplicate_count;
        
        -- Show the duplicate emails for manual review
        RAISE NOTICE 'Duplicate emails found:';
        FOR rec IN 
            SELECT email, COUNT(*) as count, string_agg(student_id, ', ') as student_ids
            FROM student_details 
            WHERE email IS NOT NULL AND email != ''
            GROUP BY email 
            HAVING COUNT(*) > 1
        LOOP
            RAISE NOTICE 'Email: % appears % times for students: %', rec.email, rec.count, rec.student_ids;
        END LOOP;
    ELSE
        RAISE NOTICE 'No duplicate emails found. Safe to proceed with unique constraint.';
    END IF;
END $$;

-- Step 2: Handle duplicates by making them unique
-- We'll append a number to duplicate emails to make them unique
WITH ranked_duplicates AS (
    SELECT 
        id,
        email,
        student_id,
        ROW_NUMBER() OVER (PARTITION BY email ORDER BY id) as rn
    FROM student_details
    WHERE email IS NOT NULL AND email != ''
),
duplicates_to_update AS (
    SELECT 
        id,
        email,
        student_id,
        CASE 
            WHEN rn = 1 THEN email  -- Keep first occurrence unchanged
            ELSE CONCAT(
                SUBSTRING(email FROM 1 FOR POSITION('@' IN email) - 1),
                '_duplicate_', rn,
                SUBSTRING(email FROM POSITION('@' IN email))
            )
        END as new_email
    FROM ranked_duplicates
    WHERE email IN (
        SELECT email 
        FROM student_details 
        WHERE email IS NOT NULL AND email != ''
        GROUP BY email 
        HAVING COUNT(*) > 1
    )
)
UPDATE student_details 
SET email = duplicates_to_update.new_email
FROM duplicates_to_update
WHERE student_details.id = duplicates_to_update.id
AND duplicates_to_update.new_email != duplicates_to_update.email;

-- Step 3: Now safely add the unique constraint
ALTER TABLE student_details ADD CONSTRAINT unique_student_email UNIQUE (email);

-- Step 4: Create index for better performance on email lookups
CREATE INDEX IF NOT EXISTS idx_student_details_email ON student_details(email);

-- Step 5: Create helper function to check email availability
CREATE OR REPLACE FUNCTION check_email_availability(check_email VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    email_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM student_details 
        WHERE LOWER(email) = LOWER(check_email)
    ) INTO email_exists;
    
    RETURN NOT email_exists;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Log completion
DO $$
BEGIN
    RAISE NOTICE 'Email uniqueness constraint successfully added!';
    RAISE NOTICE 'All duplicate emails have been resolved by appending _duplicate_N to the email address.';
    RAISE NOTICE 'You may want to review and manually correct these emails if needed.';
END $$;
