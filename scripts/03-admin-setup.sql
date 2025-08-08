-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default admin user (password: admin123)
-- In production, use proper password hashing
INSERT INTO admin_users (username, password_hash, full_name) VALUES
('admin', '$2b$10$rQZ9vKKQZ9vKKQZ9vKKQZOeJ9vKKQZ9vKKQZ9vKKQZ9vKKQZ9vKKQ', 'System Administrator'),
('csadmin', '$2b$10$rQZ9vKKQZ9vKKQZ9vKKQZOeJ9vKKQZ9vKKQZ9vKKQZ9vKKQZ9vKKQ', 'CS Department Admin');

-- Create voting statistics view for dashboard
CREATE OR REPLACE VIEW voting_statistics AS
SELECT 
  vc.id as category_id,
  vc.name as category_name,
  c.id as candidate_id,
  c.name as candidate_name,
  COUNT(v.id) as vote_count,
  RANK() OVER (PARTITION BY vc.id ORDER BY COUNT(v.id) DESC) as position
FROM voting_categories vc
LEFT JOIN candidates c ON vc.id = c.category_id
LEFT JOIN votes v ON c.id = v.candidate_id
GROUP BY vc.id, vc.name, c.id, c.name
ORDER BY vc.display_order, COUNT(v.id) DESC;

-- Create student voting details view
CREATE OR REPLACE VIEW student_voting_details AS
SELECT 
  s.student_id,
  sd.name as student_name,
  sd.phone,
  sd.email,
  sd.programme,
  sd.level,
  vc.name as category_name,
  c.name as candidate_name,
  v.created_at as vote_time
FROM students s
LEFT JOIN student_details sd ON s.student_id = sd.student_id
LEFT JOIN votes v ON s.student_id = v.student_id
LEFT JOIN candidates c ON v.candidate_id = c.id
LEFT JOIN voting_categories vc ON v.category_id = vc.id
WHERE s.has_voted = true
ORDER BY s.student_id, vc.display_order;
