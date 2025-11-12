-- Create enums
CREATE TYPE app_role AS ENUM ('student', 'staff', 'admin');
CREATE TYPE complaint_category AS ENUM ('facilities', 'technical', 'academic', 'food', 'transport', 'other');
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE complaint_status AS ENUM ('submitted', 'in_review', 'in_progress', 'resolved', 'closed');
CREATE TYPE notification_type AS ENUM ('status_changed', 'new_comment', 'assigned', 'resolved');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role app_role NOT NULL,
  batch_department TEXT,
  avatar_url TEXT,
  phone_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) <= 80),
  description TEXT NOT NULL CHECK (char_length(description) <= 1500),
  category complaint_category NOT NULL,
  urgency urgency_level DEFAULT 'medium' NOT NULL,
  status complaint_status DEFAULT 'submitted' NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES public.profiles(id),
  location TEXT CHECK (char_length(location) <= 50),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT CHECK (char_length(resolution_notes) <= 800),
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  upvote_count INTEGER DEFAULT 0 NOT NULL,
  view_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create complaint_images table
CREATE TABLE public.complaint_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create complaint_comments table
CREATE TABLE public.complaint_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  comment TEXT NOT NULL CHECK (char_length(comment) <= 800),
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) <= 60),
  message TEXT NOT NULL CHECK (char_length(message) <= 200),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create complaint_upvotes table
CREATE TABLE public.complaint_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(complaint_id, user_id)
);

-- Create settings table
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Insert default settings
INSERT INTO public.settings (key, value) VALUES
  ('max_complaints_per_day', '10'),
  ('max_images_per_complaint', '3'),
  ('max_image_size_mb', '2'),
  ('enable_anonymous', 'true'),
  ('enable_upvotes', 'true'),
  ('maintenance_mode', 'false');

-- Create function to generate complaint number
CREATE OR REPLACE FUNCTION generate_complaint_number()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  sequence_num INTEGER;
  new_number TEXT;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM public.complaints
  WHERE complaint_number LIKE 'CMP-' || date_part || '-%';
  
  new_number := 'CMP-' || date_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate complaint number
CREATE OR REPLACE FUNCTION set_complaint_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.complaint_number IS NULL OR NEW.complaint_number = '' THEN
    NEW.complaint_number := generate_complaint_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_complaint_number
  BEFORE INSERT ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION set_complaint_number();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update upvote count
CREATE OR REPLACE FUNCTION update_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.complaints
    SET upvote_count = upvote_count + 1
    WHERE id = NEW.complaint_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.complaints
    SET upvote_count = upvote_count - 1
    WHERE id = OLD.complaint_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_upvote_count
  AFTER INSERT OR DELETE ON public.complaint_upvotes
  FOR EACH ROW
  EXECUTE FUNCTION update_upvote_count();

-- Create trigger to create notification on status change
CREATE OR REPLACE FUNCTION create_status_change_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, complaint_id, type, title, message)
    VALUES (
      NEW.user_id,
      NEW.id,
      'status_changed',
      'Complaint Status Updated',
      'Your complaint ' || NEW.complaint_number || ' status changed to ' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_status_change_notification
  AFTER UPDATE ON public.complaints
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION create_status_change_notification();

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role = _role
  )
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    (role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for complaints
CREATE POLICY "Users can read their own complaints"
  ON public.complaints FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can read non-anonymous complaints"
  ON public.complaints FOR SELECT
  USING (NOT is_anonymous);

CREATE POLICY "Admins can read all complaints"
  ON public.complaints FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update complaints"
  ON public.complaints FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their satisfaction rating"
  ON public.complaints FOR UPDATE
  USING (
    user_id = auth.uid() AND
    status IN ('resolved', 'closed')
  )
  WITH CHECK (
    user_id = auth.uid() AND
    status IN ('resolved', 'closed')
  );

-- RLS Policies for complaint_images
CREATE POLICY "Users can read images for accessible complaints"
  ON public.complaint_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.complaints
      WHERE complaints.id = complaint_images.complaint_id
      AND (
        complaints.user_id = auth.uid() OR
        NOT complaints.is_anonymous OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "Users can upload images for their complaints"
  ON public.complaint_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.complaints
      WHERE complaints.id = complaint_images.complaint_id
      AND complaints.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can read all images"
  ON public.complaint_images FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for complaint_comments
CREATE POLICY "Users can read non-internal comments"
  ON public.complaint_comments FOR SELECT
  USING (
    NOT is_internal AND
    EXISTS (
      SELECT 1 FROM public.complaints
      WHERE complaints.id = complaint_comments.complaint_id
      AND (
        complaints.user_id = auth.uid() OR
        NOT complaints.is_anonymous OR
        public.has_role(auth.uid(), 'admin')
      )
    )
  );

CREATE POLICY "Admins can read all comments"
  ON public.complaint_comments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create comments on their complaints"
  ON public.complaint_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.complaints
      WHERE complaints.id = complaint_comments.complaint_id
      AND complaints.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create comments"
  ON public.complaint_comments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for notifications
CREATE POLICY "Users can read their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for complaint_upvotes
CREATE POLICY "Users can read upvotes"
  ON public.complaint_upvotes FOR SELECT
  USING (true);

CREATE POLICY "Users can create upvotes"
  ON public.complaint_upvotes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own upvotes"
  ON public.complaint_upvotes FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for settings
CREATE POLICY "Everyone can read settings"
  ON public.settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update settings"
  ON public.settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('complaint-images', 'complaint-images', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('profile-avatars', 'profile-avatars', true, 1048576, ARRAY['image/jpeg', 'image/png', 'image/webp']);

-- Storage policies for complaint-images
CREATE POLICY "Authenticated users can view complaint images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'complaint-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can upload images to their folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'complaint-images' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete their own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'complaint-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for profile-avatars
CREATE POLICY "Anyone can view profile avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaint_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.complaint_upvotes;