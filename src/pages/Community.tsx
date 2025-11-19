import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNewPost } from '@/contexts/NewPostContext';
import { supabase } from '@/integrations/supabase/client';
import { NewPostDialog } from '@/components/NewPostDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PostCard } from '@/components/PostCard';
import { useToast } from '@/hooks/use-toast';
import { User, LogOut, Search, TrendingUp, ArrowLeft, Image as ImageIcon, X, PlusCircle, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

interface TrendingTopic {
  word: string;
  count: number;
}

export default function Community() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isOpen, closeDialog } = useNewPost();
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [topComplaints, setTopComplaints] = useState<Complaint[]>([]);
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);

  useEffect(() => {
    if (!user && !loading) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchUserProfile();
      fetchPosts();
      fetchTopComplaints();
      fetchTopPosts();
      fetchTrendingTopics();
      subscribeToRealtimePosts();
    }
  }, [user, loading]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();
    
    if (data) setUserProfile(data);
  };

  const fetchPosts = async (search?: string) => {
    let query = supabase
      .from('community_posts')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `);

    // Apply search filter if query exists
    if (search && search.trim()) {
      query = query.ilike('text_content', `%${search.trim()}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

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

  const fetchTopPosts = async () => {
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .order('like_count', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching top posts:', error);
    } else {
      setTopPosts(data || []);
    }
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
      fetchPosts();
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


  return (
    <div className="min-h-screen bg-background dark:bg-black">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-0">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Center Column - Feed (70%) */}
          <div className="lg:col-span-7 xl:col-span-7">
            {/* Create Post */}
            <div className="border-b border-border dark:border-gray-800 p-4 bg-card dark:bg-black">
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
                    className="min-h-[60px] resize-none dark:bg-black dark:border-gray-800 dark:text-white dark:placeholder:text-gray-500"
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
                        className="text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-primary"
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        <ImageIcon className="h-5 w-5" />
                      </Button>
                      <span className="text-xs text-muted-foreground dark:text-gray-500">
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
            </div>

            {/* Posts Feed */}
            <div>
              {posts.length === 0 && searchQuery ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No posts found matching "{searchQuery}"</p>
                  <Button 
                    variant="link" 
                    onClick={() => {
                      setSearchQuery('');
                      fetchPosts();
                    }}
                    className="mt-2"
                  >
                    Clear search
                  </Button>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No posts yet. Be the first to post!</p>
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard key={post.id} post={post} onUpdate={() => fetchPosts(searchQuery)} />
                ))
              )}
              {posts.length === 0 && (
                <div className="py-12 text-center border-b border-border dark:border-gray-800 bg-card dark:bg-black">
                  <p className="text-muted-foreground dark:text-gray-500">No posts yet. Be the first to post!</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar (30%) */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-5 pl-6 space-y-4 pt-4">
            {/* Search */}
            <div className="bg-card dark:bg-black border border-border dark:border-gray-800 rounded-lg p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-gray-500" />
                <Input
                  placeholder="Search Community"
                  className="pl-10 dark:bg-black dark:border-gray-800 dark:text-white dark:placeholder:text-gray-500"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    fetchPosts(e.target.value);
                  }}
                />
              </div>
            </div>

            {/* Trending Topics */}
            <div className="bg-card dark:bg-black border border-border dark:border-gray-800 rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-4 text-foreground dark:text-white">
                <Hash className="h-4 w-4" />
                Trending Topics
              </h3>
              {trendingTopics.length > 0 ? (
                <div className="space-y-3">
                  {trendingTopics.map((topic, index) => (
                    <div key={topic.word} className="flex items-center justify-between py-2 hover:bg-accent dark:hover:bg-gray-900 rounded-md px-2 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-muted-foreground dark:text-gray-500 text-sm w-6">{index + 1}.</span>
                        <Badge variant="secondary" className="text-sm">
                          #{topic.word}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground dark:text-gray-500">
                        {topic.count} {topic.count === 1 ? 'mention' : 'mentions'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground dark:text-gray-500 text-center py-2">No trending topics yet</p>
              )}
            </div>

            {/* Top Posts */}
            <div className="bg-card dark:bg-black border border-border dark:border-gray-800 rounded-lg p-4">
              <h3 className="font-semibold flex items-center gap-2 mb-4 text-foreground dark:text-white">
                <TrendingUp className="h-4 w-4" />
                Top Posts
              </h3>
              <div className="space-y-3">
                {topPosts.map((post) => (
                  <div key={post.id} className="py-2 cursor-pointer hover:bg-accent dark:hover:bg-gray-900 rounded-md px-2 transition-colors">
                    <p className="font-medium text-sm text-foreground dark:text-white line-clamp-2">{post.text_content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground dark:text-gray-500">{post.profiles?.full_name || 'Unknown User'}</p>
                      <span className="text-xs text-muted-foreground dark:text-gray-500">•</span>
                      <p className="text-xs text-muted-foreground dark:text-gray-500">{post.like_count} likes</p>
                    </div>
                  </div>
                ))}
                {topPosts.length === 0 && (
                  <p className="text-xs text-muted-foreground dark:text-gray-500 text-center py-2">No posts yet</p>
                )}
              </div>
            </div>

            {/* Top Complaints */}
            <div className="bg-card dark:bg-black border border-border dark:border-gray-800 rounded-lg p-4">
              <h3 className="font-semibold mb-4 text-foreground dark:text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Top Complaints
              </h3>
              <div className="space-y-3">
                {topComplaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className="py-2 cursor-pointer hover:bg-accent dark:hover:bg-gray-900 rounded-md px-2 transition-colors"
                    onClick={() => navigate(`/complaint/${complaint.id}`)}
                  >
                    <p className="font-medium text-sm text-foreground dark:text-white line-clamp-2">{complaint.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground dark:text-gray-500">{complaint.complaint_number}</p>
                      <p className="text-xs text-primary">{complaint.upvote_count} upvotes</p>
                    </div>
                  </div>
                ))}
                {topComplaints.length === 0 && (
                  <p className="text-xs text-muted-foreground dark:text-gray-500 text-center py-4">No complaints yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Post Dialog - triggered from sidebar */}
      <NewPostDialog 
        open={isOpen} 
        onOpenChange={closeDialog}
        onPostCreated={fetchPosts}
      />
    </div>
  );
}
