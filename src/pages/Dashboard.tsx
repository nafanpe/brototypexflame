import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Users,
  Timer,
  LayoutGrid,
  List,
  MoreVertical
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, Bar, BarChart, Cell, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import brototypeLogo from '@/assets/brototype-logo.png';
import { MobileSidebar } from '@/components/MobileSidebar';
import NewsTicker from '@/components/NewsTicker';

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
  resolved_at: string | null;
  updated_at: string;
}

interface UserUpvote {
  complaint_id: string;
}

interface Stats {
  total: number;
  active: number;
  resolved: number;
  avgResolutionTime: number;
}

interface CategoryData {
  category: string;
  count: number;
  fill: string;
}

interface UrgencyData {
  urgency: string;
  count: number;
  fill: string;
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
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, resolved: 0, avgResolutionTime: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved' | 'mine'>('all');
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [userRole, setUserRole] = useState<string>('student');
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [urgencyData, setUrgencyData] = useState<UrgencyData[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchUserProfile();
    fetchComplaints();
    fetchUserUpvotes();
    setupRealtimeSubscription();
  }, [user, navigate]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();
    
    if (data) setUserProfile(data);

    // Fetch user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (roleData) {
      setUserRole(roleData.role);
      // Set default view based on role
      setViewType(roleData.role === 'student' ? 'grid' : 'list');
    }
  };

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

      setStats({ total, active, resolved, avgResolutionTime: 0 });

      // Calculate category data for chart
      const categoryMap = new Map<string, number>();
      data?.forEach(complaint => {
        categoryMap.set(complaint.category, (categoryMap.get(complaint.category) || 0) + 1);
      });

      const categoryColors: Record<string, string> = {
        facilities: '#8b5cf6',
        technical: '#3b82f6',
        academic: '#10b981',
        food: '#f59e0b',
        transport: '#ef4444',
        other: '#6b7280'
      };

      const catData: CategoryData[] = Array.from(categoryMap.entries()).map(([category, count]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        count,
        fill: categoryColors[category] || 'hsl(var(--muted-foreground))'
      }));
      setCategoryData(catData);

      // Calculate urgency data for ALL complaints (not just active)
      const urgencyMap = new Map<string, number>();
      data?.forEach(complaint => {
        urgencyMap.set(complaint.urgency, (urgencyMap.get(complaint.urgency) || 0) + 1);
      });

      const urgencyColors: Record<string, string> = {
        critical: 'hsl(0 84.2% 60.2%)',
        high: 'hsl(24.6 95% 53.1%)',
        medium: 'hsl(47.9 95.8% 53.1%)',
        low: 'hsl(var(--muted-foreground))'
      };

      const urgData: UrgencyData[] = ['critical', 'high', 'medium', 'low'].map(urgency => ({
        urgency: urgency.charAt(0).toUpperCase() + urgency.slice(1),
        count: urgencyMap.get(urgency) || 0,
        fill: urgencyColors[urgency] || 'hsl(var(--muted-foreground))'
      }));
      setUrgencyData(urgData);
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

  const handleDelete = async (complaintId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || userRole !== 'admin') return;

    if (!confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Complaint deleted successfully',
      });

      await fetchComplaints();
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
    
    if (filter === 'mine') {
      return matchesSearch && complaint.user_id === user?.id;
    } else if (filter === 'active') {
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
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      {/* Ticker Section (Fixed Height, No Shrink) */}
      <div className="flex-none w-full z-10">
        <NewsTicker />
      </div>

      {/* Scrollable Dashboard Content (Fills remaining space) */}
      <div className="flex-1 overflow-y-auto">
        <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 animate-fade-in">
          <Card className="shadow-card hover:shadow-card-hover transition-smooth hover-highlight">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time submissions</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-card-hover transition-smooth hover-highlight">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-sm font-medium">Active Complaints</CardTitle>
              <AlertCircle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Pending resolution</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-card-hover transition-smooth hover-highlight">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <div className="text-2xl font-bold">{stats.resolved}</div>
              <p className="text-xs text-muted-foreground">Successfully closed</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section - Only visible to Admins and Staff */}
        {(userRole === 'admin' || userRole === 'staff') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 animate-fade-in">
            {/* Donut Chart - Complaints by Category */}
            <Card className="shadow-card hover:shadow-card-hover transition-smooth">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Top Problem Areas</CardTitle>
                <p className="text-xs text-muted-foreground">Complaints by Category</p>
              </CardHeader>
              <CardContent className="pb-2">
                {categoryData.length > 0 ? (
                  <>
                    <ChartContainer
                      config={{
                        facilities: { label: 'Facilities', color: '#8b5cf6' },
                        technical: { label: 'Technical', color: '#3b82f6' },
                        academic: { label: 'Academic', color: '#10b981' },
                        food: { label: 'Food', color: '#f59e0b' },
                        transport: { label: 'Transport', color: '#ef4444' },
                        other: { label: 'Other', color: '#6b7280' }
                      }}
                      className="h-[140px]"
                    >
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="count"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={55}
                          paddingAngle={2}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-wrap gap-3 mt-2 justify-center">
                      {categoryData.map((entry, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                          <span className="text-xs text-foreground">{entry.category}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[140px] flex items-center justify-center text-sm text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart - Active Complaints by Urgency */}
            <Card className="shadow-card hover:shadow-card-hover transition-smooth">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Immediate Triage</CardTitle>
                <p className="text-xs text-muted-foreground">All Complaints by Urgency</p>
              </CardHeader>
              <CardContent className="pb-2">
                {urgencyData.some(d => d.count > 0) ? (
                  <ChartContainer
                    config={{
                      critical: { label: 'Critical', color: 'hsl(0 84.2% 60.2%)' },
                      high: { label: 'High', color: 'hsl(24.6 95% 53.1%)' },
                      medium: { label: 'Medium', color: 'hsl(47.9 95.8% 53.1%)' },
                      low: { label: 'Low', color: 'hsl(var(--muted-foreground))' }
                    }}
                    className="h-[140px]"
                  >
                    <BarChart data={urgencyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="urgency" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {urgencyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[140px] flex items-center justify-center text-sm text-muted-foreground">
                    No active complaints
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Bar - Search, Filters, View Toggle, and New Complaint */}
        <div className="flex flex-col md:flex-row gap-3 mb-4 items-stretch md:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search complaints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filter Dropdown */}
          <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Complaints</SelectItem>
              <SelectItem value="mine">My Complaints</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <ToggleGroup type="single" value={viewType} onValueChange={(value) => value && setViewType(value as 'grid' | 'list')}>
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>

          {/* New Complaint Button */}
          <Button onClick={() => navigate('/new-complaint')} className="whitespace-nowrap">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Complaint
          </Button>
        </div>

        {/* Complaints - List or Grid View */}
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
        ) : viewType === 'list' ? (
          /* List View - Table */
          <Card className="shadow-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Upvotes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComplaints.map((complaint) => (
                    <TableRow 
                      key={complaint.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/complaint/${complaint.id}`)}
                    >
                      <TableCell className="font-mono text-sm">
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Hash className="h-3 w-3" />
                          {getComplaintNumber(complaint.complaint_number)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        {complaint.title}
                      </TableCell>
                      <TableCell>
                        <Badge className={`flex items-center gap-1.5 w-fit ${statusConfig[complaint.status as keyof typeof statusConfig]?.color}`}>
                          {statusConfig[complaint.status as keyof typeof statusConfig]?.icon}
                          {statusConfig[complaint.status as keyof typeof statusConfig]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${urgencyColors[complaint.urgency as keyof typeof urgencyColors]}`}>
                          {complaint.urgency.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {complaint.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatTimeAgo(complaint.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ArrowUp className={`h-4 w-4 ${userUpvotes.has(complaint.id) ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="text-sm">{complaint.upvote_count}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/complaint/${complaint.id}`);
                            }}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleUpvote(complaint.id, e as any)}>
                              {userUpvotes.has(complaint.id) ? 'Remove Upvote' : 'Upvote'}
                            </DropdownMenuItem>
                            {userRole === 'admin' && (
                              <DropdownMenuItem 
                                onClick={(e) => handleDelete(complaint.id, e as any)}
                                className="text-destructive focus:text-destructive"
                              >
                                Delete Complaint
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          /* Grid View - Cards */
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
                      className="gap-1.5"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      {complaint.upvote_count}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        </main>
      </div>
    </div>
  );
}