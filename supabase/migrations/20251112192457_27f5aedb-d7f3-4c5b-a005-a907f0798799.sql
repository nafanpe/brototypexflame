-- Fix FOR UPDATE with aggregate function error
-- Use a simpler approach with proper row locking
CREATE OR REPLACE FUNCTION public.generate_complaint_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  date_part TEXT;
  sequence_num INTEGER;
  new_number TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Lock the complaints table to prevent race conditions during number generation
  LOCK TABLE public.complaints IN SHARE ROW EXCLUSIVE MODE;
  
  -- Get the next sequence number
  SELECT COALESCE(MAX(
    CASE 
      WHEN complaint_number ~ '^CMP-[0-9]{8}-[0-9]+$' 
      THEN CAST(SPLIT_PART(complaint_number, '-', 3) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO sequence_num
  FROM public.complaints
  WHERE complaint_number LIKE 'CMP-' || date_part || '-%';
  
  new_number := 'CMP-' || date_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN new_number;
END;
$function$;