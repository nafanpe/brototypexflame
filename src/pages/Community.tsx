import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PostCard } from '@/components/PostCard';
import { useToast } from '@/hooks/use-toast';
import { User, LogOut, Search, TrendingUp, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { MobileSidebar } from '@/components/MobileSidebar';
import brototypeLogo from '@/assets/brototype-logo.png';

interface Post {
  id: string;
  created_at: string;
  user_id: string;
  text_content: string;
  image_url: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

export default function Community() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [postContent, setPostContent] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchUserProfile();
    fetchPosts();
    subscribeToRealtimePosts();
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();
    
    if (data) setUserProfile(data);
  };

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      return;
    }

    setPosts(data || []);
  };

  const subscribeToRealtimePosts = () => {
    const channel = supabase
      .channel('community-posts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_posts'
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCreatePost = async () => {
    if (!user || !postContent.trim()) return;

    setIsPosting(true);
    const { error } = await supabase
      .from('community_posts')
      .insert({
        user_id: user.id,
        text_content: postContent.trim()
      });

    setIsPosting(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create post. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    setPostContent('');
    toast({
      title: 'Success',
      description: 'Your post has been published!'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-smooth" onClick={() => navigate('/')}>
              <img src={brototypeLogo} alt="Brototype" className="h-10" />
              <div>
                <h1 className="text-2xl font-bold">Brototype Connect</h1>
                <p className="text-sm text-muted-foreground">Community</p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
              <User className="h-4 w-4" />
            </Button>
            <NotificationBell />
            <ThemeToggle />
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>

          <div className="flex md:hidden items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="hover:bg-accent">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3 cursor-pointer hover:opacity-80" onClick={() => navigate('/')}>
                <img src={brototypeLogo} alt="Brototype" className="h-9" />
              </div>
            </div>
            <MobileSidebar />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Center Column - Feed */}
          <div className="lg:col-span-7 xl:col-span-6 space-y-4">
            {/* Create Post */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={userProfile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {userProfile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Textarea
                      placeholder="What's on your mind?"
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      maxLength={280}
                      className="min-h-[100px] resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {postContent.length}/280
                      </span>
                      <Button
                        onClick={handleCreatePost}
                        disabled={!postContent.trim() || isPosting}
                      >
                        {isPosting ? 'Posting...' : 'Post'}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Posts Feed */}
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
              ))}
              {posts.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No posts yet. Be the first to post!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-4 space-y-4">
            {/* Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search Community"
                    className="pl-10"
                    disabled
                  />
                </div>
              </CardContent>
            </Card>

            {/* What's Happening */}
            <Card>
              <CardHeader>
                <h3 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  What's Happening
                </h3>
              </CardHeader>
              <CardContent className="space-y-3">
                {['Placements', 'Hackathons', 'React', 'JavaScript', 'Web Development'].map((topic) => (
                  <div key={topic} className="py-2 cursor-pointer hover:bg-muted/50 rounded-md px-2 transition-colors">
                    <p className="font-medium text-sm">{topic}</p>
                    <p className="text-xs text-muted-foreground">Trending in Tech</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
