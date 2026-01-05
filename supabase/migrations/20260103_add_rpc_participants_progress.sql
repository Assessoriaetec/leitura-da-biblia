-- DROP existing function to avoid signature conflicts
DROP FUNCTION IF EXISTS get_participants_progress();

-- Create secure function returning JSON to avoid type mismatch issues
CREATE OR REPLACE FUNCTION get_participants_progress()
RETURNS JSON
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(t) INTO result
  FROM (
    SELECT 
      rp.user_id,
      COUNT(rp.day_number) as completed_days,
      COALESCE(MAX(rp.day_number), 0) as last_read_day
    FROM reading_progress rp
    WHERE rp.is_read = true
    GROUP BY rp.user_id
  ) t;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_participants_progress() TO authenticated;

-- Verification: Run this line to test if it works (it should return data)
SELECT get_participants_progress();
