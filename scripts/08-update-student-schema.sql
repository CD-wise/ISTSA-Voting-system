-- Add additional columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS name VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(15);
ALTER TABLE students ADD COLUMN IF NOT EXISTS programme VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS level VARCHAR(20);

-- Create table for SMS OTP tracking
CREATE TABLE IF NOT EXISTS sms_otps (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create voting status table if not exists
CREATE TABLE IF NOT EXISTS voting_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_open BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default voting status
INSERT INTO voting_status (id, is_open) VALUES (1, TRUE) ON CONFLICT (id) DO NOTHING;

-- Update student_details table to remove degree_type requirement
ALTER TABLE student_details DROP COLUMN IF EXISTS degree_type;

-- Clean up any null student_id rows that might cause issues
DELETE FROM students WHERE student_id IS NULL OR student_id = '';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sms_otps_student_id ON sms_otps(student_id);
CREATE INDEX IF NOT EXISTS idx_sms_otps_expires_at ON sms_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
