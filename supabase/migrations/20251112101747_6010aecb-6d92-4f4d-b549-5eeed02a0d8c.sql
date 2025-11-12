-- Create a separate table for sensitive profile information
CREATE TABLE public.profiles_sensitive (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles_sensitive
ALTER TABLE public.profiles_sensitive ENABLE ROW LEVEL SECURITY;

-- Only users can read their own sensitive data
CREATE POLICY "Users can read their own sensitive data"
ON public.profiles_sensitive
FOR SELECT
USING (auth.uid() = id);

-- Only users can update their own sensitive data
CREATE POLICY "Users can update their own sensitive data"
ON public.profiles_sensitive
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admins can read all sensitive data
CREATE POLICY "Admins can read all sensitive data"
ON public.profiles_sensitive
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update sensitive data
CREATE POLICY "Admins can update all sensitive data"
ON public.profiles_sensitive
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert on signup
CREATE POLICY "System can insert sensitive data"
ON public.profiles_sensitive
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Migrate existing email and phone data to profiles_sensitive
INSERT INTO public.profiles_sensitive (id, email, phone_number)
SELECT id, email, phone_number FROM public.profiles
ON CONFLICT (id) DO NOTHING;

-- Remove sensitive columns from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone_number;

-- Add policy to allow reading profiles of non-anonymous complaint submitters
CREATE POLICY "Users can read profiles of non-anonymous complaint submitters"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.complaints
    WHERE complaints.user_id = profiles.id
    AND complaints.is_anonymous = FALSE
  )
);

-- Update the signup trigger to insert into both tables
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Insert into profiles (public info only)
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student')
  );
  
  -- Insert into profiles_sensitive (private info)
  INSERT INTO public.profiles_sensitive (id, email, phone_number)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone_number'
  );
  
  -- Insert into user_roles (the secure way)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student')
  );
  
  RETURN NEW;
END;
$function$;

-- Add trigger for updated_at on profiles_sensitive
CREATE TRIGGER update_profiles_sensitive_updated_at
BEFORE UPDATE ON public.profiles_sensitive
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();