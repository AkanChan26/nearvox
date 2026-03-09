
-- Create read_posts table for tracking which posts/topics a user has read
CREATE TABLE public.read_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'post',
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

ALTER TABLE public.read_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own read posts"
ON public.read_posts FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read posts"
ON public.read_posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own read posts"
ON public.read_posts FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE TO authenticated
USING (auth.uid() = user_id);
