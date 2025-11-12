import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Heart, MessageCircle, Trash2, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface PostCardProps {
  post: {
    id: string;
    created_at: string;
    user_id: string;
    text_content: string;
    image_url: string | null;
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
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    checkLikeStatus();
    fetchLikeCount();
    fetchCommentCount();
    checkAdminStatus();
    fetchUserRole();
  }, [post.id, user]);

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

  const fetchLikeCount = async () => {
    const { count } = await supabase
      .from('community_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);
    
    setLikeCount(count || 0);
  };

  const fetchCommentCount = async () => {
    const { count } = await supabase
      .from('community_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);
    
    setCommentCount(count || 0);
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

  const fetchUserRole = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', post.user_id)
      .maybeSingle();
    
    setUserRole(data?.role || null);
  };

  const handleLike = async () => {
    if (!user) return;

    if (isLiked) {
      await supabase
        .from('community_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);
      
      setIsLiked(false);
      setLikeCount(prev => prev - 1);
    } else {
      await supabase
        .from('community_likes')
        .insert({
          post_id: post.id,
          user_id: user.id
        });
      
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
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
    fetchCommentCount();
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.profiles.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {post.profiles.full_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{post.profiles.full_name}</p>
                {(userRole === 'admin' || userRole === 'staff') && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {userRole === 'admin' ? 'Admin' : 'Staff'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          {(isAdmin || post.user_id === user?.id) && (
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm whitespace-pre-wrap">{post.text_content}</p>

        <div className="flex items-center gap-4 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={isLiked ? 'text-red-500' : ''}
          >
            <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
            {likeCount}
          </Button>

          <Sheet open={sheetOpen} onOpenChange={handleSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <MessageCircle className="h-4 w-4 mr-1" />
                {commentCount}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Comments</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {/* Add Comment */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    maxLength={200}
                    className="min-h-[80px]"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {newComment.length}/200
                    </span>
                    <Button
                      onClick={handleComment}
                      disabled={!newComment.trim() || isCommenting}
                      size="sm"
                    >
                      {isCommenting ? 'Posting...' : 'Comment'}
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4 pt-4 border-t">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.profiles.avatar_url || ''} />
                        <AvatarFallback className="bg-muted">
                          {comment.profiles.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg p-3">
                          <p className="font-semibold text-sm">{comment.profiles.full_name}</p>
                          <p className="text-sm mt-1">{comment.text_content}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-3">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </CardContent>
    </Card>
  );
}
