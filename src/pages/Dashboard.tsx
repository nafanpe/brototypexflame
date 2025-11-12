import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  PlusCircle, 
  Search, 
  LogOut,
  TrendingUp,
  FileText,
  Eye,
  CheckCircle,
  Lock,
  ArrowUp,
  Hash,
  User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import brototypeLogo from '@/assets/brototype-logo.png';
import { MobileSidebar } from '@/components/MobileSidebar';

interface Complaint {
  id: string;
  complaint_number: string;
  title: string;
  status: string;
  category: string;
  urgency: string;
  created_at: string;
  upvote_count: number;
  location: string;
  user_id: string;
}

interface UserUpvote {
  complaint_id: string;
}

interface Stats {
  total: number;
  active: number;
  resolved: number;
}

const statusConfig = {
  submitted: { label: 'Submitted', icon: <FileText className="h-3.5 w-3.5" />, color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/30' },
  in_review: { label: 'In Review', icon: <Eye className="h-3.5 w-3.5" />, color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-500/30' },
  in_progress: { label: 'In Progress', icon: <Clock className="h-3.5 w-3.5" />, color: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-500/30' },
  resolved: { label: 'Resolved', icon: <CheckCircle className="h-3.5 w-3.5" />, color: 'bg-green-500/20 text-green-700 dark:text-green-300 hover:bg-green-500/30' },
  closed: { label: 'Closed', icon: <Lock className="h-3.5 w-3.5" />, color: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 hover:bg-gray-500/30' },
};

const urgencyColors = {
  low: 'text-muted-foreground',
  medium: 'text-warning',
  high: 'text-danger',
  critical: 'text-danger font-bold',
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchComplaints();
    fetchUserUpvotes();
    setupRealtimeSubscription();
  }, [user, navigate]);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setComplaints(data || []);
      
      const total = data?.length || 0;
      const active = data?.filter(c => 
        ['submitted', 'in_review', 'in_progress'].includes(c.status)
      ).length || 0;
      const resolved = data?.filter(c => 
        ['resolved', 'closed'].includes(c.status)
      ).length || 0;

      setStats({ total, active, resolved });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserUpvotes = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('complaint_upvotes')
      .select('complaint_id')
      .eq('user_id', user.id);

    if (data) {
      setUserUpvotes(new Set(data.map((u: UserUpvote) => u.complaint_id)));
    }
  };

  const handleUpvote = async (complaintId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const isUpvoted = userUpvotes.has(complaintId);

    try {
      if (isUpvoted) {
        await supabase
          .from('complaint_upvotes')
          .delete()
          .eq('user_id', user.id)
          .eq('complaint_id', complaintId);
      } else {
        await supabase
          .from('complaint_upvotes')
          .insert({ user_id: user.id, complaint_id: complaintId });
      }

      fetchComplaints();
      fetchUserUpvotes();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const getComplaintNumber = (complaintNumber: string) => {
    const match = complaintNumber.match(/-(\d+)$/);
    return match ? `#${match[1]}` : '#1';
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('complaints-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints'
        },
        () => {
          fetchComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         complaint.complaint_number.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'active') {
      return matchesSearch && ['submitted', 'in_review', 'in_progress'].includes(complaint.status);
    } else if (filter === 'resolved') {
      return matchesSearch && ['resolved', 'closed'].includes(complaint.status);
    }
    return matchesSearch;
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    if (diffMs < 0) return 'Just now';
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-10 animate-fade-in">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          
          {/* ===== DESKTOP HEADER (Visible MD and up) ===== */}
          <div className="hidden md:flex items-center gap-3 cursor-pointer hover:opacity-80 transition-smooth" onClick={() => navigate('/')}>
            <img src={brototypeLogo} alt="Brototype" className="h-10" />
            <div>
              <h1 className="text-2xl font-bold">Brototype Connect</h1>
              <p className="text-sm text-muted-foreground">Complaint Management System</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
              <User className="h-4 w-4" />
            </Button>
            <NotificationBell />
            <ThemeToggle />
            <Button variant="outline" onClick={signOut} className="hover-highlight">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>

          {/* ===== MOBILE HEADER (Visible BELOW MD) ===== */}
          <div className="flex md:hidden items-center justify-between w-full">
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-smooth" onClick={() => navigate('/')}>
              <img src={brototypeLogo} alt="Brototype" className="h-9" />
            </div>
            <MobileSidebar />
          </div>

        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in">
          <Card className="shadow-card hover:shadow-card-hover transition-smooth hover-highlight">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">All time submissions</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-card-hover transition-smooth hover-highlight">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Complaints</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{stats.active}</div>
              <p className="text-xs text-muted-foreground mt-1">Pending resolution</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-card-hover transition-smooth hover-highlight">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully closed</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search complaints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              onClick={() => setFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={filter === 'resolved' ? 'default' : 'outline'}
              onClick={() => setFilter('resolved')}
            >
              Resolved
            </Button>
          </div>
          <Button onClick={() => navigate('/new-complaint')} className="gap-2">
            <PlusCircle className="h-4 w-4" />
            New Complaint
          </Button>
        </div>

        {/* Complaints Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading complaints...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No complaints found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try adjusting your search' : 'Start by creating your first complaint'}
              </p>
              {!searchQuery && (
                <Button onClick={() => navigate('/new-complaint')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Complaint
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredComplaints.map((complaint) => (
              <Card 
                key={complaint.id} 
                className="shadow-card hover:shadow-card-hover transition-smooth cursor-pointer hover-highlight"
                onClick={() => navigate(`/complaint/${complaint.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {getComplaintNumber(complaint.complaint_number)}
                      </Badge>
                      <Badge className={`flex items-center gap-1.5 ${statusConfig[complaint.status as keyof typeof statusConfig]?.color}`}>
                        {statusConfig[complaint.status as keyof typeof statusConfig]?.icon} {statusConfig[complaint.status as keyof typeof statusConfig]?.label}
                      </Badge>
                    </div>
                    <span className={`text-xs font-medium ${urgencyColors[complaint.urgency as keyof typeof urgencyColors]}`}>
                      {complaint.urgency.toUpperCase()}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold mb-2 line-clamp-2">{complaint.title}</h3>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span>{formatTimeAgo(complaint.created_at)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="px-2 py-1 bg-muted rounded text-xs">
                        {complaint.category}
                      </span>
                      {complaint.location && (
                        <span className="text-xs truncate">{complaint.location}</span>
                      )}
                    </div>
                    <Button
                      variant={userUpvotes.has(complaint.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={(e) => handleUpvote(complaint.id, e)}
                      className={`gap-1 ${!userUpvotes.has(complaint.id) ? 'border-muted-foreground/30 text-muted-foreground hover:bg-muted hover:text-foreground' : 'bg-gray-300 dark:bg-primary text-gray-900 dark:text-primary-foreground hover:bg-gray-400 dark:hover:bg-primary/90'}`}
                    >
                      <ArrowUp className="h-3 w-3" />
                      <span className="text-xs">{complaint.upvote_count}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}