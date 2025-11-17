-- Update RLS policy to allow all authenticated users to see all complaints
-- The "anonymous" flag will only hide the creator's identity in the UI, not the complaint itself

-- Drop the old policy that only allowed viewing non-anonymous complaints
DROP POLICY IF EXISTS "Users can read non-anonymous complaints" ON complaints;

-- Create new policy that allows all authenticated users to see all complaints
CREATE POLICY "Authenticated users can read all complaints"
ON complaints
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);