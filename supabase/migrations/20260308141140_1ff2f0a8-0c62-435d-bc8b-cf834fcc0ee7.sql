-- Allow users to update their own replies
CREATE POLICY "Users can update own replies" ON public.replies FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);