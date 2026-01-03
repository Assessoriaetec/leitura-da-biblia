-- Secure function to get a specific user's reading history
-- Bypasses RLS to allow Admin viewing

CREATE OR REPLACE FUNCTION get_user_history(target_user_id UUID)
RETURNS TABLE (
  day_number INTEGER, -- Changed to INTEGER to match typical usage, or BIGINT if column is bigint
  updated_at TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CAST(rp.day_number AS INTEGER), 
    rp.updated_at
  FROM reading_progress rp
  WHERE rp.user_id = target_user_id AND rp.is_read = true
  ORDER BY rp.day_number ASC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_user_history(uuid) TO authenticated;
