-- Enable users to delete their own complaints
CREATE POLICY "Users can delete their own complaints"
ON public.complaints
FOR DELETE
USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread 
ON public.notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_complaint_upvotes_user_complaint 
ON public.complaint_upvotes(user_id, complaint_id);

-- Add trigger to create notification when new comment is added
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Notify complaint owner if someone else comments
  IF NEW.user_id != (SELECT user_id FROM complaints WHERE id = NEW.complaint_id) THEN
    INSERT INTO public.notifications (user_id, complaint_id, type, title, message)
    SELECT 
      complaints.user_id,
      NEW.complaint_id,
      'new_comment',
      'New Comment on Your Complaint',
      'Someone commented on your complaint'
    FROM complaints
    WHERE id = NEW.complaint_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_comment_created
AFTER INSERT ON public.complaint_comments
FOR EACH ROW
EXECUTE FUNCTION public.create_comment_notification();