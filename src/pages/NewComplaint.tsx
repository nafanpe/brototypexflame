import { useState, useEffect, useRef } from 'react';
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
import { ArrowLeft, Loader2, Upload, X, Sparkles, Mic, MicOff } from 'lucide-react';
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
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setDescription(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not access microphone',
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [user, navigate, toast]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, 3 - images.length);
      setImages([...images, ...newFiles]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({
        variant: 'destructive',
        title: 'Not Supported',
        description: 'Speech recognition is not supported in this browser',
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleMagicRewrite = async () => {
    if (!description.trim() || description.length < 3) return;

    setIsPolishing(true);
    
    try {
      // Try Real AI via Edge Function
      const { data, error } = await supabase.functions.invoke('polish-complaint', {
        body: { description }
      });

      if (error || !data?.polishedText) {
        throw new Error('AI service unavailable');
      }

      setDescription(data.polishedText);
      toast({
        title: 'Text Polished with AI ✨',
        description: 'Your description has been professionally rewritten.',
      });

    } catch (err) {
      // Fallback to Local Smart Template Logic
      console.log('Falling back to local polish:', err);
      
      const lower = description.toLowerCase();
      let polished = '';

      // 1. Connectivity Issues
      if (lower.includes('wifi') || lower.includes('internet') || lower.includes('network') || lower.includes('connect')) {
        polished = `I am writing to report persistent connectivity issues regarding: "${description}". The network instability is currently hindering workflow efficiency in this sector. Please investigate the local access points.`;
      } 
      // 2. Hardware/Equipment Issues
      else if (lower.includes('pc') || lower.includes('computer') || lower.includes('monitor') || lower.includes('screen') || lower.includes('mouse') || lower.includes('keyboard')) {
        polished = `I encountered a hardware malfunction with the following equipment: "${description}". The device is not performing as expected and may require technical diagnosis or replacement.`;
      } 
      // 3. Environment/Facilities (AC, Lights, Water)
      else if (lower.includes('ac') || lower.includes('air') || lower.includes('hot') || lower.includes('cold') || lower.includes('water') || lower.includes('leak') || lower.includes('light')) {
        polished = `I wish to bring attention to a facility maintenance issue: "${description}". The current environmental conditions are suboptimal for the workspace. Requesting a maintenance check.`;
      } 
      // 4. Default "Professional Wrapper" (Preserves user input)
      else {
        polished = `I would like to formally report an issue regarding the following: "${description}". This matter requires attention from the administration to ensure facility operations run smoothly.`;
      }

      setDescription(polished);
      toast({
        title: 'Text Polished ✨',
        description: 'Your description has been professionally rewritten (offline mode).',
      });
    } finally {
      setIsPolishing(false);
    }
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
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleVoiceInput}
                      className="gap-2"
                    >
                      {isListening ? (
                        <>
                          <MicOff className="h-3 w-3 animate-pulse text-red-500" />
                          Listening...
                        </>
                      ) : (
                        <>
                          <Mic className="h-3 w-3" />
                          Voice
                        </>
                      )}
                    </Button>
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
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          AI Polish
                        </>
                      )}
                    </Button>
                  </div>
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
                  <Label>Location</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Lab 1', 'Lab 2', 'Lab 3', 'Cafeteria', 'Library', 'Office'].map((loc) => (
                      <Button
                        key={loc}
                        type="button"
                        variant={location === loc ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLocation(loc)}
                        className="w-full"
                      >
                        {loc}
                      </Button>
                    ))}
                  </div>
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