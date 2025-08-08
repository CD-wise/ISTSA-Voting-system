-- Create students table (only storing IDs and voting status)
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(20) UNIQUE NOT NULL,
  has_voted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create student_details table (for storing entered details during voting)
CREATE TABLE IF NOT EXISTS student_details (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  email VARCHAR(100) NOT NULL,
  programme VARCHAR(50) NOT NULL CHECK (programme IN ('Computer Science', 'Information Technology', 'Cybersecurity')),
  level INTEGER NOT NULL CHECK (level IN (100, 200, 300, 400)),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create voting categories table
CREATE TABLE IF NOT EXISTS voting_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  display_order INTEGER NOT NULL
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category_id INTEGER REFERENCES voting_categories(id),
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create votes table
CREATE TABLE IF NOT EXISTS votes (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  candidate_id INTEGER REFERENCES candidates(id),
  category_id INTEGER REFERENCES voting_categories(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, category_id)
);

-- Create OTP table for verification
CREATE TABLE IF NOT EXISTS student_otps (
  id SERIAL PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
