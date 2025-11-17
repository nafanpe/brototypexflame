import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ThemeToggle } from '@/components/ThemeToggle';
import { UserBadge } from '@/components/UserBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, MapPin, Clock, User, MessageSquare, Loader2, CheckCircle, XCircle, FileText, Eye, Lock, Trash2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [images, setImages] = useState<any[]>([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminStatus();
    fetchComplaintDetails();
  }, [id, user]);

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

  const fetchComplaintDetails = async () => {
    try {
      const { data: complaintData, error: complaintError } = await supabase
        .from('complaints')
        .select('*, profiles!complaints_user_id_fkey(*)')
        .eq('id', id)
        .maybeSingle();

      if (complaintError) {
        throw complaintError;
      }
      
      if (!complaintData) {
        setLoading(false);
        return;
      }
      
      setComplaint(complaintData);

      const { data: commentsData, error: commentsError } = await supabase
        .from('complaint_comments')
        .select('*, profiles!complaint_comments_user_id_fkey(*)')
        .eq('complaint_id', id)
        .order('created_at', { ascending: true });

      if (commentsError) {
        // Error handled silently, non-critical data
      }

      setComments(commentsData || []);

      // Fetch images
      const { data: imagesData } = await supabase
        .from('complaint_images')
        .select('*')
        .eq('complaint_id', id)
        .order('uploaded_at', { ascending: true });

      setImages(imagesData || []);
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
      // Use edge function for server-side validation and rate limiting
      const { data, error: functionError } = await supabase.functions.invoke('submit-complaint?action=comment', {
        body: {
          complaint_id: id,
          comment: newComment,
          is_internal: false,
        },
      });

      if (functionError) throw new Error(functionError.message);
      if (data?.error) throw new Error(data.error);

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

  const handleStatusChange = async (newStatus: string) => {
    if (!isAdmin || !user) return;

    try {
      // Use edge function for server-side validation and authorization
      const { data, error: functionError } = await supabase.functions.invoke('submit-complaint?action=update-status', {
        body: {
          complaint_id: id,
          status: newStatus,
          resolution_notes: resolutionNotes.trim() || null,
        },
      });

      if (functionError) throw new Error(functionError.message);
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Status Updated',
        description: `Complaint status changed to ${newStatus}`,
      });
      
      fetchComplaintDetails();
      setResolutionNotes('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const handleDeleteComplaint = async () => {
    if (!user || !complaint) return;
    
    // Allow deletion if user is the owner OR if user is admin
    if (complaint.user_id !== user.id && !isAdmin) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Complaint Deleted',
        description: 'Complaint has been deleted successfully',
      });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusIcons: Record<string, { variant: any; Icon: any }> = {
      submitted: { variant: 'default', Icon: FileText },
      in_review: { variant: 'secondary', Icon: Eye },
      in_progress: { variant: 'default', Icon: Clock },
      resolved: { variant: 'default', Icon: CheckCircle },
      closed: { variant: 'secondary', Icon: Lock },
    };
    const config = statusIcons[status] || statusIcons.submitted;
    const IconComponent = config.Icon;
    
    return (
      <Badge variant={config.variant} className="text-sm flex items-center gap-1.5">
        <IconComponent className="h-3.5 w-3.5" />
        {status.replace('_', ' ').toUpperCase()}
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
              {!complaint.is_anonymous && complaint.profiles && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <UserBadge 
                    userId={complaint.user_id} 
                    userName={complaint.profiles.full_name || 'Unknown'} 
                  />
                </div>
              )}
              {complaint.is_anonymous && isAdmin && complaint.profiles && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <UserBadge 
                    userId={complaint.user_id} 
                    userName={complaint.profiles.full_name || 'Unknown'} 
                  />
                  <Badge variant="secondary" className="text-xs">Admin View</Badge>
                </div>
              )}
            </div>

            {complaint.resolution_notes && (
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Resolution Notes
                </h4>
                <p className="text-sm text-muted-foreground">{complaint.resolution_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Change Status</label>
                <Select value={selectedStatus || complaint.status} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedStatus === 'resolved' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Resolution Notes</label>
                  <Textarea
                    placeholder="Add resolution notes..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    maxLength={500}
                    className="min-h-[100px]"
                  />
                </div>
              )}

              <Button 
                onClick={() => handleStatusChange(selectedStatus || complaint.status)}
                disabled={!selectedStatus || selectedStatus === complaint.status}
                className="w-full"
              >
                Update Status
              </Button>
            </CardContent>
          </Card>
        )}

        {images.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Images ({images.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image) => (
                  <a
                    key={image.id}
                    href={image.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group aspect-square rounded-lg overflow-hidden border hover:shadow-lg transition-smooth"
                  >
                    <img
                      src={image.thumbnail_url || image.image_url}
                      alt="Complaint evidence"
                      className="w-full h-full object-cover transition-smooth group-hover:opacity-90"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
                      {comment.profiles && (
                        <UserBadge 
                          userId={comment.user_id} 
                          userName={comment.profiles.full_name || 'Unknown'} 
                        />
                      )}
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

            {user && complaint && (user.id === complaint.user_id || isAdmin) && (
              <div className="pt-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={deleting}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Complaint
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this
                        complaint and all associated comments and images.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteComplaint}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
