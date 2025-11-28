import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Upload, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function NewComplaint() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [urgency, setUrgency] = useState('medium');
  const [location, setLocation] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [adminOnly, setAdminOnly] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [isPolishing, setIsPolishing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, 3 - images.length);
      setImages([...images, ...newFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleMagicRewrite = () => {
    if (!description.trim()) return;

    setIsPolishing(true);
    
    // Simulate AI processing with 1.5 second delay
    setTimeout(() => {
      const text = description.toLowerCase();
      let polishedText = '';

      if (text.includes('wifi') || text.includes('net') || text.includes('internet')) {
        polishedText = 'The internet connectivity in the facility is unstable, hindering my workflow and academic activities.';
      } else if (text.includes('ac') || text.includes('hot') || text.includes('cold') || text.includes('temperature')) {
        polishedText = 'The air conditioning unit appears to be malfunctioning, resulting in uncomfortable temperatures that affect productivity.';
      } else if (text.includes('clean') || text.includes('dirty') || text.includes('mess')) {
        polishedText = 'The facility requires maintenance and cleaning services to ensure a hygienic and comfortable environment.';
      } else if (text.includes('light') || text.includes('dark') || text.includes('bulb')) {
        polishedText = 'There is insufficient lighting in the working area, creating visibility issues that impact work quality.';
      } else if (text.includes('noise') || text.includes('loud') || text.includes('sound')) {
        polishedText = 'Excessive noise levels in the facility are disrupting concentration and affecting the learning environment.';
      } else {
        polishedText = 'I am encountering a technical issue that requires attention from the administration to ensure optimal facility operations.';
      }

      setDescription(polishedText);
      setIsPolishing(false);
      
      toast({
        title: 'Text Polished ✨',
        description: 'Your description has been professionally rewritten.',
      });
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to submit a complaint',
      });
      return;
    }

    if (title.length < 5 || title.length > 80) {
      toast({
        variant: 'destructive',
        title: 'Invalid Title',
        description: 'Title must be between 5 and 80 characters',
      });
      return;
    }

    if (description.length < 20 || description.length > 1500) {
      toast({
        variant: 'destructive',
        title: 'Invalid Description',
        description: 'Description must be between 20 and 1500 characters',
      });
      return;
    }

    setLoading(true);

    try {
      // Use edge function for server-side validation and rate limiting
      const { data, error: functionError } = await supabase.functions.invoke('submit-complaint?action=create', {
        body: {
          title,
          description,
          category,
          urgency,
          location: location || null,
          is_anonymous: isAnonymous,
          admin_only: adminOnly,
        },
      });

      if (functionError) throw new Error(functionError.message);
      if (data?.error) throw new Error(data.error);

      const complaint = data.complaint;

      // Upload images if any
      if (images.length > 0 && complaint) {
        for (const image of images) {
          const fileExt = image.name.split('.').pop();
          const fileName = `${user.id}/${complaint.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('complaint-images')
            .upload(fileName, image);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('complaint-images')
            .getPublicUrl(fileName);

          await supabase.from('complaint_images').insert({
            complaint_id: complaint.id,
            image_url: publicUrl,
            thumbnail_url: publicUrl,
            file_size: image.size,
          });
        }
      }

      // Fire confetti celebration
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast({
        title: 'Complaint Submitted! 🎉',
        description: `Your complaint #${complaint.complaint_number} has been created successfully.`,
      });

      navigate('/dashboard');
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

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="shadow-card-hover">
          <CardHeader>
            <CardTitle>Submit New Complaint</CardTitle>
            <CardDescription>
              Provide detailed information about your complaint to help us resolve it quickly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-danger">*</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({title.length}/80)
                  </span>
                </Label>
                <Input
                  id="title"
                  placeholder="Brief description of the issue"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">
                    Description <span className="text-danger">*</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({description.length}/1500)
                    </span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleMagicRewrite}
                    disabled={description.length === 0 || isPolishing}
                    className="gap-2"
                  >
                    {isPolishing ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Polishing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        AI Polish
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="description"
                  placeholder="Provide detailed information about your complaint"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  maxLength={1500}
                  required
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="category">
                    Category <span className="text-danger">*</span>
                  </Label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facilities">🏢 Facilities</SelectItem>
                      <SelectItem value="technical">💻 Technical</SelectItem>
                      <SelectItem value="academic">📚 Academic</SelectItem>
                      <SelectItem value="food">🍽️ Food</SelectItem>
                      <SelectItem value="transport">🚗 Transport</SelectItem>
                      <SelectItem value="other">📝 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Building A, Room 101"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>
                  Urgency Level <span className="text-danger">*</span>
                </Label>
                <RadioGroup value={urgency} onValueChange={setUrgency}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="low" />
                    <Label htmlFor="low" className="cursor-pointer text-muted-foreground">
                      Low - Can wait
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium" className="cursor-pointer text-warning">
                      Medium - Should be addressed soon
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="high" />
                    <Label htmlFor="high" className="cursor-pointer text-danger">
                      High - Needs quick attention
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="critical" id="critical" />
                    <Label htmlFor="critical" className="cursor-pointer text-danger font-bold">
                      Critical - Urgent action required
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Images (Max 3)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  {images.length < 3 ? (
                    <label className="cursor-pointer">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPG, PNG or WebP (Max 2MB each)
                      </p>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <p className="text-sm text-muted-foreground">Maximum 3 images reached</p>
                  )}
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                />
                <Label
                  htmlFor="anonymous"
                  className="cursor-pointer text-sm font-normal"
                >
                  Submit anonymously (your identity will be hidden from other users)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="adminOnly"
                  checked={adminOnly}
                  onCheckedChange={(checked) => setAdminOnly(checked as boolean)}
                />
                <Label
                  htmlFor="adminOnly"
                  className="cursor-pointer text-sm font-normal"
                >
                  Visible to admins only (enhanced privacy protection)
                </Label>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Complaint'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}