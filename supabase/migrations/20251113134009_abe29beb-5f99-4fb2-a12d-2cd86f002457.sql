-- Fix profiles table RLS policy to prevent unauthorized access to user emails
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;

-- Allow users to view only their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));