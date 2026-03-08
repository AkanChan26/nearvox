
-- Add attachments column to posts (array of file paths)
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}';

-- Create post_likes table for like/unlike
CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes viewable by authenticated" ON public.post_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can like posts" ON public.post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own likes" ON public.post_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create storage bucket for post attachments (view only, no download)
INSERT INTO storage.buckets (id, name, public) VALUES ('post-attachments', 'post-attachments', true);

-- Storage policies: authenticated users can upload
CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-attachments');

-- Anyone can view (public bucket)
CREATE POLICY "Anyone can view attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'post-attachments');

-- Only owner and admin can delete attachments
CREATE POLICY "Owner and admin can delete attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'post-attachments' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

-- Function to sync likes count
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER on_post_like_change
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- Add activity_logs table for admin to track user activity
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity" ON public.activity_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert activity" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
