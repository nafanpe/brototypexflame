import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, TrendingUp, MessageSquare, Clock, BarChart3, PieChart, LineChart, RefreshCw, Download, Pencil, MessageCircle } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart as RePieChart, Pie, Cell, LineChart as ReLineChart, Line } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface KPIData {
  totalUsers: number;
  platformHealth: number;
  communityActivity: number;
  avgResolutionTime: string;
}

interface CategoryData {
  name: string;
  value: number;
}

interface StaffPerformance {
  name: string;
  resolved: number;
  avgTime: number;
}

interface SatisfactionTrend {
  date: string;
  rating: number;
}

interface TopContributor {
  id: string;
  full_name: string;
  avatar_url: string | null;
  posts: number;
  totalLikes: number;
}

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  email?: string;
  role?: string;
}

interface ActivityDay {
  date: string;
  count: number;
}

interface TrendingTopic {
  word: string;
  count: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpiData, setKpiData] = useState<KPIData>({
    totalUsers: 0,
    platformHealth: 0,
    communityActivity: 0,
    avgResolutionTime: '0h'
  });
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformance[]>([]);
  const [satisfactionTrend, setSatisfactionTrend] = useState<SatisfactionTrend[]>([]);
  const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activityHeatmap, setActivityHeatmap] = useState<ActivityDay[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
  }, [user, navigate]);

  const checkAdminAccess = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!data) {
      toast.error('Access Denied', {
        description: 'You do not have admin privileges'
      });
      navigate('/dashboard');
      return;
    }

    fetchAllData();
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchKPIData(),
      fetchCategoryData(),
      fetchStaffPerformance(),
      fetchSatisfactionTrend(),
      fetchTopContributors(),
      fetchUsers(),
      fetchActivityHeatmap(),
      fetchTrendingTopics()
    ]);
    setLoading(false);
    setLastUpdated(new Date());
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const fetchKPIData = async () => {
    // Total Users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Platform Health (resolved vs total)
    const { count: totalComplaints } = await supabase
      .from('complaints')
      .select('*', { count: 'exact', head: true });

    const { count: resolvedComplaints } = await supabase
      .from('complaints')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved');

    const platformHealth = totalComplaints ? Math.round((resolvedComplaints || 0) / totalComplaints * 100) : 0;

    // Community Activity Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: postsToday } = await supabase
      .from('community_posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    const { count: commentsToday } = await supabase
      .from('community_comments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Avg Resolution Time
    const { data: resolvedData } = await supabase
      .from('complaints')
      .select('created_at, resolved_at')
      .eq('status', 'resolved')
      .not('resolved_at', 'is', null);

    let avgTime = '0h';
    if (resolvedData && resolvedData.length > 0) {
      const totalHours = resolvedData.reduce((sum, item) => {
        const created = new Date(item.created_at);
        const resolved = new Date(item.resolved_at!);
        const hours = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      const avg = totalHours / resolvedData.length;
      avgTime = avg < 24 ? `${avg.toFixed(1)}h` : `${(avg / 24).toFixed(1)} days`;
    }

    setKpiData({
      totalUsers: totalUsers || 0,
      platformHealth,
      communityActivity: (postsToday || 0) + (commentsToday || 0),
      avgResolutionTime: avgTime
    });
  };

  const fetchCategoryData = async () => {
    const { data } = await supabase
      .from('complaints')
      .select('category');

    if (data) {
      const categoryCount: Record<string, number> = {};
      data.forEach(item => {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      });

      const chartData = Object.entries(categoryCount).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      setCategoryData(chartData);
    }
  };

  const fetchStaffPerformance = async () => {
    const { data: complaints } = await supabase
      .from('complaints')
      .select('assigned_to, created_at, resolved_at')
      .eq('status', 'resolved')
      .not('assigned_to', 'is', null)
      .not('resolved_at', 'is', null);

    if (complaints) {
      const staffMap: Record<string, { resolved: number; totalTime: number }> = {};

      complaints.forEach(item => {
        if (!item.assigned_to) return;
        
        if (!staffMap[item.assigned_to]) {
          staffMap[item.assigned_to] = { resolved: 0, totalTime: 0 };
        }

        staffMap[item.assigned_to].resolved += 1;

        const created = new Date(item.created_at);
        const resolved = new Date(item.resolved_at!);
        const hours = (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
        staffMap[item.assigned_to].totalTime += hours;
      });

      // Get staff names
      const staffIds = Object.keys(staffMap);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', staffIds);

      const performanceData = staffIds.map(id => {
        const profile = profiles?.find(p => p.id === id);
        return {
          name: profile?.full_name || 'Unknown',
          resolved: staffMap[id].resolved,
          avgTime: parseFloat((staffMap[id].totalTime / staffMap[id].resolved).toFixed(1))
        };
      });

      setStaffPerformance(performanceData);
    }
  };

  const fetchSatisfactionTrend = async () => {
    const { data } = await supabase
      .from('complaints')
      .select('resolved_at, satisfaction_rating')
      .not('satisfaction_rating', 'is', null)
      .not('resolved_at', 'is', null)
      .order('resolved_at', { ascending: true })
      .limit(30);

    if (data) {
      const trendData = data.map(item => ({
        date: new Date(item.resolved_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rating: item.satisfaction_rating!
      }));

      setSatisfactionTrend(trendData);
    }
  };

  const fetchTopContributors = async () => {
    const { data: posts } = await supabase
      .from('community_posts')
      .select('user_id, like_count');

    if (posts) {
      const userMap: Record<string, { posts: number; totalLikes: number }> = {};

      posts.forEach(post => {
        if (!userMap[post.user_id]) {
          userMap[post.user_id] = { posts: 0, totalLikes: 0 };
        }
        userMap[post.user_id].posts += 1;
        userMap[post.user_id].totalLikes += post.like_count;
      });

      const userIds = Object.keys(userMap);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const contributors = userIds
        .map(id => {
          const profile = profiles?.find(p => p.id === id);
          return {
            id,
            full_name: profile?.full_name || 'Unknown',
            avatar_url: profile?.avatar_url || null,
            posts: userMap[id].posts,
            totalLikes: userMap[id].totalLikes
          };
        })
        .sort((a, b) => b.totalLikes - a.totalLikes)
        .slice(0, 10);

      setTopContributors(contributors);
    }
  };

  const fetchUsers = async () => {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, created_at')
      .order('created_at', { ascending: false });

    const { data: sensitiveData } = await supabase
      .from('profiles_sensitive')
      .select('id, email');

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (profilesData) {
      const usersWithDetails = profilesData.map(profile => {
        const sensitive = sensitiveData?.find(s => s.id === profile.id);
        const role = rolesData?.find(r => r.user_id === profile.id);

        return {
          ...profile,
          email: sensitive?.email,
          role: role?.role || 'student'
        };
      });

      setUsers(usersWithDetails);
      setFilteredUsers(usersWithDetails);
    }
  };

  const fetchActivityHeatmap = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: complaints } = await supabase
      .from('complaints')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const { data: posts } = await supabase
      .from('community_posts')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const activityMap: { [key: string]: number } = {};

    // Initialize all 30 days with 0
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      activityMap[dateStr] = 0;
    }

    // Count complaints
    complaints?.forEach(c => {
      const dateStr = c.created_at.split('T')[0];
      if (activityMap[dateStr] !== undefined) {
        activityMap[dateStr] += 1;
      }
    });

    // Count posts
    posts?.forEach(p => {
      const dateStr = p.created_at.split('T')[0];
      if (activityMap[dateStr] !== undefined) {
        activityMap[dateStr] += 1;
      }
    });

    const heatmapData = Object.entries(activityMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setActivityHeatmap(heatmapData);
  };

  const fetchTrendingTopics = async () => {
    const { data: posts } = await supabase
      .from('community_posts')
      .select('text_content')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!posts) return;

    // Stop words to filter out
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'is',
      'are', 'was', 'were', 'been', 'has', 'had', 'can', 'could', 'should', 'would'
    ]);

    const wordCount: { [key: string]: number } = {};

    posts.forEach(post => {
      const words = post.text_content
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));

      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
    });

    const topWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));

    setTrendingTopics(topWords);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredUsers(users);
      return;
    }

    const filtered = users.filter(user =>
      user.full_name.toLowerCase().includes(query.toLowerCase()) ||
      user.email?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'staff':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getActivityColor = (count: number) => {
    if (count === 0) return 'bg-secondary';
    if (count <= 2) return 'bg-primary/30';
    if (count <= 5) return 'bg-primary/60';
    return 'bg-primary';
  };

  const exportComplaintsCSV = async () => {
    const { data: complaints } = await supabase
      .from('complaints')
      .select('id, complaint_number, title, category, status, urgency, created_at, resolved_at')
      .order('created_at', { ascending: false });

    if (!complaints) {
      toast.error('No data to export');
      return;
    }

    const headers = ['ID', 'Number', 'Title', 'Category', 'Status', 'Urgency', 'Created', 'Resolved'];
    const rows = complaints.map(c => [
      c.id,
      c.complaint_number,
      c.title,
      c.category,
      c.status,
      c.urgency,
      new Date(c.created_at).toLocaleDateString(),
      c.resolved_at ? new Date(c.resolved_at).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complaints_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('CSV exported successfully');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Panel</h1>
          <p className="text-muted-foreground">Strategic oversight and analytics dashboard</p>
          <p className="text-xs text-muted-foreground mt-1">Last updated: {lastUpdated.toLocaleTimeString()}</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="complaints">Complaint Analytics</TabsTrigger>
          <TabsTrigger value="community">Community Pulse</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.totalUsers}</div>
                <p className="text-xs text-muted-foreground">Registered members</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.platformHealth}%</div>
                <p className="text-xs text-muted-foreground">Resolution rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Community Activity</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.communityActivity}</div>
                <p className="text-xs text-muted-foreground">Posts + Comments today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.avgResolutionTime}</div>
                <p className="text-xs text-muted-foreground">Time to resolve</p>
              </CardContent>
            </Card>
          </div>

          {/* Activity Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Activity Heatmap (Last 30 Days)
              </CardTitle>
              <CardDescription>Daily platform activity including complaints and community posts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-10 gap-2">
                {activityHeatmap.map((day, index) => (
                  <div
                    key={index}
                    className={`aspect-square rounded ${getActivityColor(day.count)} transition-colors cursor-pointer`}
                    title={`${new Date(day.date).toLocaleDateString()}: ${day.count} activities`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-secondary" />
                  <span>None</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary/30" />
                  <span>1-2</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary/60" />
                  <span>3-5</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary" />
                  <span>6+</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Complaint Analytics Tab */}
        <TabsContent value="complaints" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Deep Dive Analytics</h2>
              <p className="text-muted-foreground">Detailed breakdown of complaint patterns and resolution</p>
            </div>
            <Button onClick={exportComplaintsCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Problem Areas - Donut Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Problem Areas
                </CardTitle>
                <CardDescription>Breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Resolution Efficiency - Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Resolution Efficiency
                </CardTitle>
                <CardDescription>Staff performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {staffPerformance.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={staffPerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="resolved" fill="hsl(var(--chart-1))" name="Resolved" />
                      <Bar dataKey="avgTime" fill="hsl(var(--chart-2))" name="Avg Time (hrs)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No staff performance data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Satisfaction Trend - Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Satisfaction Trend
              </CardTitle>
              <CardDescription>Average rating over time</CardDescription>
            </CardHeader>
            <CardContent>
              {satisfactionTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ReLineChart data={satisfactionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="rating" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Rating" />
                  </ReLineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No satisfaction rating data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Community Pulse Tab */}
        <TabsContent value="community" className="space-y-6">
          <h2 className="text-2xl font-bold">Social Data Insights</h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Contributors */}
            <Card>
              <CardHeader>
                <CardTitle>Top Contributors</CardTitle>
                <CardDescription>Most active community members</CardDescription>
              </CardHeader>
              <CardContent>
                {topContributors.length > 0 ? (
                  <div className="space-y-4">
                    {topContributors.map((contributor, index) => (
                      <div key={contributor.id} className="flex items-center gap-4">
                        <div className="font-bold text-muted-foreground w-6">{index + 1}.</div>
                        <Avatar>
                          <AvatarImage src={contributor.avatar_url || ''} />
                          <AvatarFallback>{contributor.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium">{contributor.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {contributor.posts} posts • {contributor.totalLikes} total likes
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No community activity yet
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trending Topics */}
            <Card>
              <CardHeader>
                <CardTitle>Trending Topics</CardTitle>
                <CardDescription>Most discussed keywords in posts</CardDescription>
              </CardHeader>
              <CardContent>
                {trendingTopics.length > 0 ? (
                  <div className="space-y-3">
                    {trendingTopics.map((topic, index) => (
                      <div key={topic.word} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-muted-foreground w-6">{index + 1}.</div>
                          <Badge variant="secondary" className="text-sm">
                            #{topic.word}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {topic.count} mentions
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No trending topics found
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: User Management */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Directory</CardTitle>
              <CardDescription>Manage all platform users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={user.avatar_url || ''} />
                            <AvatarFallback>{user.full_name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.full_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role || 'student')}>
                          {user.role || 'student'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
