-- Create function to get programme-wise voting statistics
CREATE OR REPLACE FUNCTION get_programme_voting_stats()
RETURNS TABLE (
  programme VARCHAR,
  total_students BIGINT,
  voted_students BIGINT,
  turnout_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.programme,
    COUNT(DISTINCT s.student_id) as total_students,
    COUNT(DISTINCT CASE WHEN s.has_voted THEN s.student_id END) as voted_students,
    ROUND(
      (COUNT(DISTINCT CASE WHEN s.has_voted THEN s.student_id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT s.student_id), 0)) * 100, 1
    ) as turnout_percentage
  FROM students s
  LEFT JOIN student_details sd ON s.student_id = sd.student_id
  WHERE sd.programme IS NOT NULL
  GROUP BY sd.programme
  ORDER BY sd.programme;
END;
$$ LANGUAGE plpgsql;

-- Create function to get level-wise voting statistics
CREATE OR REPLACE FUNCTION get_level_voting_stats()
RETURNS TABLE (
  level INTEGER,
  total_students BIGINT,
  voted_students BIGINT,
  turnout_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.level,
    COUNT(DISTINCT s.student_id) as total_students,
    COUNT(DISTINCT CASE WHEN s.has_voted THEN s.student_id END) as voted_students,
    ROUND(
      (COUNT(DISTINCT CASE WHEN s.has_voted THEN s.student_id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT s.student_id), 0)) * 100, 1
    ) as turnout_percentage
  FROM students s
  LEFT JOIN student_details sd ON s.student_id = sd.student_id
  WHERE sd.level IS NOT NULL
  GROUP BY sd.level
  ORDER BY sd.level;
END;
$$ LANGUAGE plpgsql;

-- Create function to get detailed programme-level breakdown
CREATE OR REPLACE FUNCTION get_programme_level_breakdown()
RETURNS TABLE (
  programme VARCHAR,
  level INTEGER,
  total_students BIGINT,
  voted_students BIGINT,
  turnout_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sd.programme,
    sd.level,
    COUNT(DISTINCT s.student_id) as total_students,
    COUNT(DISTINCT CASE WHEN s.has_voted THEN s.student_id END) as voted_students,
    ROUND(
      (COUNT(DISTINCT CASE WHEN s.has_voted THEN s.student_id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT s.student_id), 0)) * 100, 1
    ) as turnout_percentage
  FROM students s
  LEFT JOIN student_details sd ON s.student_id = sd.student_id
  WHERE sd.programme IS NOT NULL AND sd.level IS NOT NULL
  GROUP BY sd.programme, sd.level
  ORDER BY sd.programme, sd.level;
END;
$$ LANGUAGE plpgsql;
