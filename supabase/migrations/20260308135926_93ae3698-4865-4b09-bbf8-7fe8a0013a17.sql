CREATE TABLE IF NOT EXISTS public.topic_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(topic_id, user_id)
);

ALTER TABLE public.topic_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes viewable by authenticated" ON public.topic_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like topics" ON public.topic_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike own likes" ON public.topic_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add likes_count to topics
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;

-- Trigger to update topic likes count
CREATE OR REPLACE FUNCTION public.update_topic_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.topics SET likes_count = likes_count + 1 WHERE id = NEW.topic_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.topics SET likes_count = likes_count - 1 WHERE id = OLD.topic_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER update_topic_likes_count_trigger
AFTER INSERT OR DELETE ON public.topic_likes
FOR EACH ROW EXECUTE FUNCTION public.update_topic_likes_count();