-- Add admin_only column to complaints table
ALTER TABLE public.complaints 
ADD COLUMN admin_only boolean DEFAULT false;

-- Update RLS policy for reading complaints to respect admin_only flag
-- Drop existing policy for authenticated users reading all complaints
DROP POLICY IF EXISTS "Authenticated users can read all complaints" ON public.complaints;

-- Create new policy: authenticated users can read non-admin-only complaints
CREATE POLICY "Authenticated users can read non-admin-only complaints"
ON public.complaints
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (admin_only = false OR admin_only IS NULL)
);

-- Admin policy already exists and takes precedence, so admins can see all complaints including admin_only ones