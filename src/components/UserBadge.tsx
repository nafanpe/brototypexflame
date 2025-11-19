import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield, Pencil, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserBadgeProps {
  userId: string;
  userName: string;
  className?: string;
}

export function UserBadge({ userId, userName, className = '' }: UserBadgeProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [postCount, setPostCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    checkUserStatus();
  }, [userId]);

  const checkUserStatus = async () => {
    // Check admin status
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    setIsAdmin(!!roleData);

    // Check post count
    const { count: posts } = await supabase
      .from('community_posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    setPostCount(posts || 0);

    // Check comment count
    const { count: comments } = await supabase
      .from('community_comments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    setCommentCount(comments || 0);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span>{userName}</span>
      <div className="flex items-center gap-1">
        {isAdmin && (
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        )}
        {postCount > 5 && (
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <Pencil className="h-3 w-3" />
            Writer
          </Badge>
        )}
        {commentCount > 10 && (
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <MessageCircle className="h-3 w-3" />
            Chatter
          </Badge>
        )}
      </div>
    </div>
  );
}
