-- Add degree_type column to student_details table
ALTER TABLE student_details ADD COLUMN degree_type VARCHAR(10);

-- Add constraint to ensure only BTech or HND values
ALTER TABLE student_details ADD CONSTRAINT check_degree_type CHECK (degree_type IN ('BTech', 'HND'));

-- Update existing records with default value (you can change this as needed)
UPDATE student_details SET degree_type = 'BTech' WHERE degree_type IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE student_details ALTER COLUMN degree_type SET NOT NULL;

-- Update the programme-level stats functions to include degree type
CREATE OR REPLACE FUNCTION get_programme_voting_stats()
RETURNS TABLE (
  programme VARCHAR,
  degree_type VARCHAR,
  total_students BIGINT,
  voted_students BIGINT,
  turnout_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.programme,
    sd.degree_type,
    COUNT(DISTINCT s.student_id) as total_students,
    COUNT(DISTINCT CASE WHEN s.has_voted THEN s.student_id END) as voted_students,
    ROUND(
      (COUNT(DISTINCT CASE WHEN s.has_voted THEN s.student_id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT s.student_id), 0)) * 100, 1
    ) as turnout_percentage
  FROM students s
  LEFT JOIN student_details sd ON s.student_id = sd.student_id
  WHERE sd.programme IS NOT NULL AND sd.degree_type IS NOT NULL
  GROUP BY sd.programme, sd.degree_type
  ORDER BY sd.programme, sd.degree_type;
END;
$$ LANGUAGE plpgsql;

-- Update level stats to include degree type
CREATE OR REPLACE FUNCTION get_level_voting_stats()
RETURNS TABLE (
  level INTEGER,
  degree_type VARCHAR,
  total_students BIGINT,
  voted_students BIGINT,
  turnout_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.level,
    sd.degree_type,
    COUNT(DISTINCT s.student_id) as total_students,
    COUNT(DISTINCT CASE WHEN s.has_voted THEN s.student_id END) as voted_students,
    ROUND(
      (COUNT(DISTINCT CASE WHEN s.has_voted THEN s.student_id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT s.student_id), 0)) * 100, 1
    ) as turnout_percentage
  FROM students s
  LEFT JOIN student_details sd ON s.student_id = sd.student_id
  WHERE sd.level IS NOT NULL AND sd.degree_type IS NOT NULL
  GROUP BY sd.level, sd.degree_type
  ORDER BY sd.level, sd.degree_type;
END;
$$ LANGUAGE plpgsql;

-- Create comprehensive programme-level-degree breakdown
CREATE OR REPLACE FUNCTION get_programme_level_degree_breakdown()
RETURNS TABLE (
  programme VARCHAR,
  level INTEGER,
  degree_type VARCHAR,
  total_students BIGINT,
  voted_students BIGINT,
  turnout_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.programme,
    sd.level,
    sd.degree_type,
    COUNT(DISTINCT s.student_id) as total_students,
    COUNT(DISTINCT CASE WHEN s.has_voted THEN s.student_id END) as voted_students,
    ROUND(
      (COUNT(DISTINCT CASE WHEN s.has_voted THEN s.student_id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT s.student_id), 0)) * 100, 1
    ) as turnout_percentage
  FROM students s
  LEFT JOIN student_details sd ON s.student_id = sd.student_id
  WHERE sd.programme IS NOT NULL AND sd.level IS NOT NULL AND sd.degree_type IS NOT NULL
  GROUP BY sd.programme, sd.level, sd.degree_type
  ORDER BY sd.programme, sd.level, sd.degree_type;
END;
$$ LANGUAGE plpgsql;
