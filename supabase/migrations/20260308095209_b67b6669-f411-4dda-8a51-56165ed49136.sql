
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_id text DEFAULT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- Trigger: notify post owner on new comment
CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id uuid;
  commenter_name text;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  IF post_owner_id IS NULL OR post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(anonymous_name, username) INTO commenter_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  VALUES (post_owner_id, 'comment', 'New Comment', commenter_name || ' commented on your post', NEW.post_id::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_comment_notify
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- Trigger: notify post owner on new like
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_owner_id uuid;
  liker_name text;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.posts WHERE id = NEW.post_id;
  IF post_owner_id IS NULL OR post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(anonymous_name, username) INTO liker_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  VALUES (post_owner_id, 'like', 'Post Liked', liker_name || ' liked your post', NEW.post_id::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_like_notify
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Trigger: notify all users on new announcement
CREATE OR REPLACE FUNCTION public.notify_on_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  SELECT p.user_id, 'announcement', 'New Announcement', NEW.title, NEW.id::text
  FROM public.profiles p
  WHERE p.user_id != NEW.admin_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_announcement_notify
  AFTER INSERT ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_announcement();

-- Trigger: notify all users on new post (except the poster)
CREATE OR REPLACE FUNCTION public.notify_on_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  poster_name text;
BEGIN
  SELECT COALESCE(anonymous_name, username) INTO poster_name FROM public.profiles WHERE user_id = NEW.user_id;
  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  SELECT p.user_id, 'new_post', 'New Post', poster_name || ' shared a new post', NEW.id::text
  FROM public.profiles p
  WHERE p.user_id != NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_post_notify
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_post();

-- Trigger: notify user when they get reported
CREATE OR REPLACE FUNCTION public.notify_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  IF NEW.reported_user_id IS NOT NULL THEN
    target_user_id := NEW.reported_user_id;
  ELSIF NEW.reported_post_id IS NOT NULL THEN
    SELECT user_id INTO target_user_id FROM public.posts WHERE id = NEW.reported_post_id;
  END IF;
  IF target_user_id IS NOT NULL AND target_user_id != NEW.reporter_id THEN
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (target_user_id, 'report', 'Content Reported', 'One of your posts has been flagged for review', COALESCE(NEW.reported_post_id::text, ''));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_report_notify
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_report();
