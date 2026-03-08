
-- Allow conversation creator to see their conversation (needed before members are added)
CREATE POLICY "Creator can view own conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);
