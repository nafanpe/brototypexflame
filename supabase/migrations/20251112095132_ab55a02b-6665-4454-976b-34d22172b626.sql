-- Fix the notification trigger to use SECURITY DEFINER
-- This allows the trigger to bypass RLS when creating system notifications

DROP TRIGGER IF EXISTS on_status_change ON complaints;
DROP FUNCTION IF EXISTS public.notify_status_change();

CREATE OR REPLACE FUNCTION public.create_status_change_notification()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, complaint_id, type, title, message)
    VALUES (
      NEW.user_id,
      NEW.id,
      'status_changed',
      'Complaint Status Updated',
      'Your complaint ' || NEW.complaint_number || ' status changed to ' || NEW.status
    );
    
    IF NEW.status = 'resolved' THEN
      NEW.resolved_at = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_status_change
  BEFORE UPDATE ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION create_status_change_notification();

-- Also update the RLS policies for notifications to allow system inserts
-- Admins should be able to create notifications
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Drop the old restrictive policy if it exists
DROP POLICY IF EXISTS "Only system can create notifications" ON public.notifications;