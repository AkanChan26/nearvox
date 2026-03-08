
-- Allow members to update their own last_read_at
CREATE POLICY "Members can update own read status"
ON public.conversation_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
