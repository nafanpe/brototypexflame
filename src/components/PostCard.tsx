import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { UserBadge } from '@/components/UserBadge';

interface PostCardProps {
  post: {
    id: string;
    created_at: string;
    user_id: string;
    text_content: string;
    image_url: string | null;
    like_count: number;
    comment_count: number;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  onUpdate: () => void;
}

interface Comment {
  id: string;
  created_at: string;
  text_content: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(post.like_count);
  const [localCommentCount, setLocalCommentCount] = useState(post.comment_count);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    checkLikeStatus();
    checkAdminStatus();
  }, [post.id, user]);

  useEffect(() => {
    setLocalLikeCount(post.like_count);
    setLocalCommentCount(post.comment_count);
  }, [post.like_count, post.comment_count]);

  const checkLikeStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('community_likes')
      .select('*')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .maybeSingle();
    
    setIsLiked(!!data);
  };

  const checkAdminStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    setIsAdmin(!!data);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('community_comments')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    
    setComments(data || []);
  };

  const handleLike = async () => {
    if (!user) return;

    // Optimistic UI update
    setIsLiked(!isLiked);
    setLocalLikeCount(prev => isLiked ? prev - 1 : prev + 1);

    if (isLiked) {
      await supabase
        .from('community_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('community_likes')
        .insert({
          post_id: post.id,
          user_id: user.id
        });
    }
  };

  const handleComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsCommenting(true);
    const { error } = await supabase
      .from('community_comments')
      .insert({
        post_id: post.id,
        user_id: user.id,
        text_content: newComment.trim()
      });

    setIsCommenting(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to post comment.',
        variant: 'destructive'
      });
      return;
    }

    setNewComment('');
    fetchComments();
    toast({
      title: 'Success',
      description: 'Comment posted!'
    });
  };

  const handleDelete = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', post.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete post.',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Post deleted successfully.'
    });
    onUpdate();
  };

  const handleSheetOpen = (open: boolean) => {
    setSheetOpen(open);
    if (open) {
      fetchComments();
    }
  };

  return (
    <div className="border-b border-border dark:border-gray-800 p-4 hover:bg-accent/50 dark:hover:bg-gray-900/50 transition-colors bg-card dark:bg-black">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={post.profiles?.avatar_url || ''} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {post.profiles?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <UserBadge 
                userId={post.user_id} 
                userName={post.profiles?.full_name || 'Unknown User'}
                className="text-foreground dark:text-white"
              />
              <p className="text-xs text-muted-foreground dark:text-gray-500">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
            {(isAdmin || post.user_id === user?.id) && (
              <Button variant="ghost" size="icon" onClick={handleDelete} className="hover:bg-accent dark:hover:bg-gray-800 text-muted-foreground dark:text-gray-400 hover:text-destructive dark:hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {post.text_content && (
            <p className="text-sm text-foreground dark:text-white whitespace-pre-wrap">{post.text_content}</p>
          )}

          {post.image_url && (
            <img 
              src={post.image_url} 
              alt="Post image" 
              className="rounded-lg max-h-96 w-full object-cover mt-2"
            />
          )}

          <div className="flex items-center gap-6 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`hover:bg-accent dark:hover:bg-gray-800 ${isLiked ? 'text-red-500' : 'text-muted-foreground dark:text-gray-400'}`}
            >
              <Heart className={`h-5 w-5 mr-1 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm">{localLikeCount}</span>
            </Button>

            <Sheet open={sheetOpen} onOpenChange={handleSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:bg-accent dark:hover:bg-gray-800 text-muted-foreground dark:text-gray-400">
                  <MessageCircle className="h-5 w-5 mr-1" />
                  <span className="text-sm">{localCommentCount}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto dark:bg-black dark:border-gray-800">
                <SheetHeader>
                  <SheetTitle className="dark:text-white">Comments</SheetTitle>
                </SheetHeader>

                {/* Original Post in Sheet */}
                <div className="mt-6 pb-4 border-b border-border dark:border-gray-800">
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.profiles?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {post.profiles?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <UserBadge 
                        userId={post.user_id} 
                        userName={post.profiles?.full_name || 'Unknown User'}
                        className="text-foreground dark:text-white"
                      />
                      {post.text_content && (
                        <p className="text-sm text-foreground dark:text-white mt-2">{post.text_content}</p>
                      )}
                      {post.image_url && (
                        <img 
                          src={post.image_url} 
                          alt="Post image" 
                          className="rounded-lg max-h-64 w-full object-cover mt-2"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {/* Add Comment */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      maxLength={200}
                      className="min-h-[80px] dark:bg-black dark:border-gray-800 dark:text-white dark:placeholder:text-gray-500"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground dark:text-gray-500">
                        {newComment.length}/200
                      </span>
                      <Button
                        onClick={handleComment}
                        disabled={!newComment.trim() || isCommenting}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                      >
                        {isCommenting ? 'Posting...' : 'Comment'}
                      </Button>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4 pt-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.profiles?.avatar_url || ''} />
                          <AvatarFallback className="bg-muted dark:bg-gray-800 text-muted-foreground dark:text-white">
                            {comment.profiles?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-muted dark:bg-gray-900 rounded-lg p-3">
                            <p className="font-semibold text-sm text-foreground dark:text-white">{comment.profiles?.full_name || 'Unknown User'}</p>
                            <p className="text-sm text-foreground dark:text-white mt-1">{comment.text_content}</p>
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-gray-500 mt-1 ml-3">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-center text-muted-foreground dark:text-gray-500 text-sm py-8">
                        No comments yet. Be the first to comment!
                      </p>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </div>
  );
}
