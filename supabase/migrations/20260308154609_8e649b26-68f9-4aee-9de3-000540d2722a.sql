
-- Boards table
CREATE TABLE public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_url text,
  created_by uuid NOT NULL,
  members_count integer NOT NULL DEFAULT 0,
  posts_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Board members
CREATE TABLE public.board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(board_id, user_id)
);

-- Board posts
CREATE TABLE public.board_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  attachments text[] DEFAULT '{}'::text[],
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Board post likes
CREATE TABLE public.board_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.board_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Board post comments
CREATE TABLE public.board_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.board_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_post_comments ENABLE ROW LEVEL SECURITY;

-- Boards RLS
CREATE POLICY "Boards viewable by authenticated" ON public.boards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create boards" ON public.boards FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator or admin can update boards" ON public.boards FOR UPDATE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Creator or admin can delete boards" ON public.boards FOR DELETE TO authenticated USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));

-- Board members RLS
CREATE POLICY "Members viewable by authenticated" ON public.board_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join boards" ON public.board_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave boards" ON public.board_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Board posts RLS
CREATE POLICY "Board posts viewable by authenticated" ON public.board_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members can create posts" ON public.board_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.board_members WHERE board_id = board_posts.board_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own posts" ON public.board_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete own posts" ON public.board_posts FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Board post likes RLS
CREATE POLICY "Likes viewable" ON public.board_post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can like" ON public.board_post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.board_post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Board post comments RLS
CREATE POLICY "Comments viewable" ON public.board_post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can comment" ON public.board_post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.board_post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Triggers for counts
CREATE OR REPLACE FUNCTION public.update_board_members_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.boards SET members_count = members_count + 1 WHERE id = NEW.board_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.boards SET members_count = members_count - 1 WHERE id = OLD.board_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER on_board_member_change
  AFTER INSERT OR DELETE ON public.board_members
  FOR EACH ROW EXECUTE FUNCTION public.update_board_members_count();

CREATE OR REPLACE FUNCTION public.update_board_posts_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.boards SET posts_count = posts_count + 1 WHERE id = NEW.board_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.boards SET posts_count = posts_count - 1 WHERE id = OLD.board_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER on_board_post_change
  AFTER INSERT OR DELETE ON public.board_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_board_posts_count();

CREATE OR REPLACE FUNCTION public.update_board_post_likes_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.board_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.board_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER on_board_post_like_change
  AFTER INSERT OR DELETE ON public.board_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_board_post_likes_count();

CREATE OR REPLACE FUNCTION public.update_board_post_comments_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.board_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.board_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER on_board_post_comment_change
  AFTER INSERT OR DELETE ON public.board_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_board_post_comments_count();
