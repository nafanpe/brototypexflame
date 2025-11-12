import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft, MapPin, Clock, User, MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [complaint, setComplaint] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchComplaintDetails();
  }, [id, user]);

  const fetchComplaintDetails = async () => {
    try {
      const { data: complaintData, error: complaintError } = await supabase
        .from('complaints')
        .select('*, profiles(*)')
        .eq('id', id)
        .maybeSingle();

      if (complaintError) throw complaintError;
      setComplaint(complaintData);

      const { data: commentsData } = await supabase
        .from('complaint_comments')
        .select('*, profiles(*)')
        .eq('complaint_id', id)
        .order('created_at', { ascending: true });

      setComments(commentsData || []);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load complaint details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('complaint_comments').insert({
        complaint_id: id,
        user_id: user.id,
        comment: newComment,
        is_internal: false,
      });

      if (error) throw error;

      setNewComment('');
      fetchComplaintDetails();
      toast({
        title: 'Comment Added',
        description: 'Your comment has been posted',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: string }> = {
      submitted: { variant: 'default', icon: '🆕' },
      in_review: { variant: 'secondary', icon: '👀' },
      in_progress: { variant: 'default', icon: '⚡' },
      resolved: { variant: 'default', icon: '✅' },
      closed: { variant: 'secondary', icon: '🔒' },
    };
    const config = variants[status] || variants.submitted;
    return (
      <Badge variant={config.variant} className="text-sm">
        {config.icon} {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getUrgencyColor = (urgency: string) => {
    const colors: Record<string, string> = {
      low: 'text-muted-foreground',
      medium: 'text-warning',
      high: 'text-danger',
      critical: 'text-destructive',
    };
    return colors[urgency] || colors.medium;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Complaint Not Found</h2>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')} className="hover-scale">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">Complaint Details</h1>
                <p className="text-sm text-muted-foreground">{complaint.complaint_number}</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{complaint.title}</CardTitle>
                <div className="flex flex-wrap gap-2 mb-4">
                  {getStatusBadge(complaint.status)}
                  <Badge variant="outline" className={getUrgencyColor(complaint.urgency)}>
                    {complaint.urgency.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">{complaint.category}</Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="prose max-w-none">
              <p className="text-foreground">{complaint.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              {complaint.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{complaint.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(complaint.created_at), 'MMM dd, yyyy')}</span>
              </div>
              {!complaint.is_anonymous && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{complaint.profiles?.full_name || 'Unknown'}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No comments yet</p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border-l-2 border-primary/20 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">
                        {comment.profiles?.full_name || 'Unknown'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm">{comment.comment}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t space-y-3">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={800}
                className="min-h-[100px]"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {newComment.length}/800 characters
                </span>
                <Button onClick={handleAddComment} disabled={submitting || !newComment.trim()}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    'Post Comment'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
