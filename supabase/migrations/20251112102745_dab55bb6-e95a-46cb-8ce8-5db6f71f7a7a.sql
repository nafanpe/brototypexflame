-- Fix 1: Replace overly permissive storage policy with complaint-aware policy
DROP POLICY IF EXISTS "Authenticated users can view complaint images" ON storage.objects;

CREATE POLICY "Users can view images for accessible complaints"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'complaint-images' AND
  EXISTS (
    SELECT 1 FROM complaint_images ci
    JOIN complaints c ON c.id = ci.complaint_id
    WHERE ci.image_url LIKE '%' || name
    AND (
      c.user_id = auth.uid() OR
      NOT c.is_anonymous OR
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Fix 2: Remove dual role storage - drop role column from profiles table
-- First drop the policy that depends on the role column
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new policy without role check (roles are managed in user_roles table)
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Update create_profile_on_signup function to not insert role
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles (public info only) - NO ROLE
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
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
$$;

-- Now drop the role column from profiles table
ALTER TABLE public.profiles DROP COLUMN role;

-- Fix 3: Set search_path for existing functions that don't have it
CREATE OR REPLACE FUNCTION public.generate_complaint_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.set_complaint_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.complaint_number IS NULL OR NEW.complaint_number = '' THEN
    NEW.complaint_number := generate_complaint_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_upvote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;