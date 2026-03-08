-- Reply likes table
CREATE TABLE public.reply_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id uuid NOT NULL REFERENCES public.replies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reply_id, user_id)
);

ALTER TABLE public.reply_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes viewable by authenticated" ON public.reply_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like replies" ON public.reply_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike own likes" ON public.reply_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
