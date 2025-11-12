-- Allow everyone to see user roles (for admin badges)
DROP POLICY IF EXISTS "Users can read their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;

CREATE POLICY "Everyone can read user roles"
ON user_roles
FOR SELECT
TO authenticated
USING (true);