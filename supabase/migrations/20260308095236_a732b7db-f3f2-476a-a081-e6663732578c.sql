
-- Drop the overly permissive insert policy
DROP POLICY "System can insert notifications" ON public.notifications;

-- Notifications are inserted by SECURITY DEFINER triggers, so no user-facing INSERT policy is needed.
-- Add a restrictive policy: users can only insert notifications for themselves (safety net)
CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
