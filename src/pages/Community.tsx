import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PostCard } from '@/components/PostCard';
import { useToast } from '@/hooks/use-toast';
import { User, LogOut, Search, TrendingUp, ArrowLeft, Image as ImageIcon, X, PlusCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { MobileSidebar } from '@/components/MobileSidebar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import brototypeLogo from '@/assets/brototype-logo.png';

interface Post {
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
}

interface Complaint {
  id: string;
  title: string;
  complaint_number: string;
  upvote_count: number;
}

export default function Community() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [topComplaints, setTopComplaints] = useState<Complaint[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchUserProfile();
    fetchPosts();
    fetchTopComplaints();
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

  const fetchTopComplaints = async () => {
    const { data, error } = await supabase
      .from('complaints')
      .select('id, title, complaint_number, upvote_count')
      .order('upvote_count', { ascending: false })
      .limit(3);

    if (error) {
      console.error('Error fetching top complaints:', error);
    } else {
      setTopComplaints(data || []);
    }
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
        (payload) => {
          if (payload.eventType === 'INSERT') {
            fetchPosts();
          } else if (payload.eventType === 'UPDATE') {
            setPosts(prev => prev.map(post => 
              post.id === payload.new.id ? { ...post, ...payload.new } : post
            ));
          } else if (payload.eventType === 'DELETE') {
            setPosts(prev => prev.filter(post => post.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Image must be less than 2MB',
          variant: 'destructive'
        });
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleCreatePost = async () => {
    if (!user || (!postContent.trim() && !selectedImage)) {
      toast({
        title: 'Error',
        description: 'Please add text or an image!',
        variant: 'destructive'
      });
      return;
    }

    setIsPosting(true);
    try {
      let imageUrl = null;

      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('community-posts')
          .upload(fileName, selectedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('community-posts')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('community_posts')
        .insert({
          user_id: user.id,
          text_content: postContent.trim() || null,
          image_url: imageUrl
        });

      if (error) throw error;

      setPostContent('');
      clearImage();
      setIsDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Your post has been published!'
      });
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: 'Error',
        description: 'Failed to create post. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsPosting(false);
    }
  };

  const PostForm = () => (
    <div className="flex gap-3">
      <Avatar className="h-10 w-10">
        <AvatarImage src={userProfile?.avatar_url || ''} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {userProfile?.full_name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-3">
        <Textarea
          placeholder="What's happening?"
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          maxLength={280}
          className="min-h-[100px] resize-none"
        />
        {imagePreview && (
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="rounded-lg max-h-64 object-cover" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={clearImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-primary"
              onClick={() => document.getElementById('image-upload')?.click()}
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {postContent.length}/280
            </span>
          </div>
          <Button
            onClick={handleCreatePost}
            disabled={(!postContent.trim() && !selectedImage) || isPosting}
            className="bg-primary hover:bg-primary/90"
          >
            {isPosting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-smooth" onClick={() => navigate('/')}>
              <img src={brototypeLogo} alt="Brototype" className="h-10" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Brototype Connect</h1>
                <p className="text-sm text-muted-foreground">Community</p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Post</DialogTitle>
                </DialogHeader>
                <PostForm />
              </DialogContent>
            </Dialog>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/profile')}
              className="rounded-full p-0 h-10 w-10 hover:bg-accent"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={userProfile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {userProfile?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
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
      <div className="container mx-auto px-4 py-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Center Column - Feed (70%) */}
          <div className="lg:col-span-7 xl:col-span-7">
            {/* Create Post */}
            <div className="border-b border-border p-4 bg-card">
              <PostForm />
            </div>

            {/* Posts Feed */}
            <div>
              {posts.map((post) => (
                <PostCard key={post.id} post={post} onUpdate={fetchPosts} />
              ))}
              {posts.length === 0 && (
                <div className="py-12 text-center border-b border-border bg-card">
                  <p className="text-muted-foreground">No posts yet. Be the first to post!</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar (30%) */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-5 pl-6 space-y-4 pt-4">
            {/* Search */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Community"
                  className="pl-10"
                  disabled
                />
              </div>
            </div>

            {/* What's Happening */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-4 text-foreground">
                <TrendingUp className="h-4 w-4" />
                What's Happening
              </h3>
              <div className="space-y-3">
                {['#Placements', '#Hackathons', '#React', '#JavaScript', '#WebDevelopment'].map((topic) => (
                  <div key={topic} className="py-2 cursor-pointer hover:bg-accent rounded-md px-2 transition-colors">
                    <p className="font-medium text-sm text-foreground">{topic}</p>
                    <p className="text-xs text-muted-foreground">Trending in Tech</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Complaints */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-4 text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Top Complaints
              </h3>
              <div className="space-y-3">
                {topComplaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className="py-2 cursor-pointer hover:bg-accent rounded-md px-2 transition-colors"
                    onClick={() => navigate(`/complaint/${complaint.id}`)}
                  >
                    <p className="font-medium text-sm text-foreground line-clamp-2">{complaint.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">{complaint.complaint_number}</p>
                      <p className="text-xs text-primary">{complaint.upvote_count} upvotes</p>
                    </div>
                  </div>
                ))}
                {topComplaints.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No complaints yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
