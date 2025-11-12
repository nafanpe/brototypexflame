-- Create trigger for comment count (was missing from previous migration)
DROP TRIGGER IF EXISTS on_comment_change ON public.community_comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comment_count();