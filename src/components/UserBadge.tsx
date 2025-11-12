import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserBadgeProps {
  userId: string;
  userName: string;
  className?: string;
}

export function UserBadge({ userId, userName, className = '' }: UserBadgeProps) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, [userId]);

  const checkAdminStatus = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    setIsAdmin(!!data);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span>{userName}</span>
      {isAdmin && (
        <Badge variant="secondary" className="flex items-center gap-1 text-xs">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      )}
    </div>
  );
}
