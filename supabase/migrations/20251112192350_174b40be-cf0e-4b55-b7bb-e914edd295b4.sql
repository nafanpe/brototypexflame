-- Fix race condition in complaint number generation
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
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  LOOP
    -- Get the next sequence number atomically
    SELECT COALESCE(MAX(
      CASE 
        WHEN complaint_number ~ '^CMP-[0-9]{8}-[0-9]+$' 
        THEN CAST(SPLIT_PART(complaint_number, '-', 3) AS INTEGER)
        ELSE 0
      END
    ), 0) + 1 INTO sequence_num
    FROM public.complaints
    WHERE complaint_number LIKE 'CMP-' || date_part || '-%'
    FOR UPDATE;
    
    new_number := 'CMP-' || date_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
    
    -- Check if this number already exists
    IF NOT EXISTS (SELECT 1 FROM public.complaints WHERE complaint_number = new_number) THEN
      RETURN new_number;
    END IF;
    
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      -- Fallback: add a random suffix to ensure uniqueness
      new_number := 'CMP-' || date_part || '-' || LPAD(sequence_num::TEXT, 3, '0') || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 4);
      RETURN new_number;
    END IF;
    
    -- Small delay before retry
    PERFORM pg_sleep(0.01);
  END LOOP;
END;
$function$;