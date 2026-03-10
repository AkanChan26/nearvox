
-- Admin notification function for new user registration
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  SELECT ur.user_id, 'new_user', 'New User Joined',
    COALESCE(NEW.anonymous_name, NEW.username) || ' joined the network from ' || COALESCE(NEW.location, 'unknown region'),
    NEW.user_id::text
  FROM public.user_roles ur WHERE ur.role = 'admin';
  RETURN NEW;
END;
$$;

-- Create all missing triggers
-- Welcome message on profile creation
DROP TRIGGER IF EXISTS on_profile_created_welcome ON public.profiles;
CREATE TRIGGER on_profile_created_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.send_welcome_message();

-- Notify admins on new user
DROP TRIGGER IF EXISTS on_profile_created_notify_admins ON public.profiles;
CREATE TRIGGER on_profile_created_notify_admins
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_new_user();

-- Invite ticket for new user
DROP TRIGGER IF EXISTS on_profile_created_invite ON public.profiles;
CREATE TRIGGER on_profile_created_invite
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_invite_ticket_for_new_user();

-- Notify on new post
DROP TRIGGER IF EXISTS on_post_created_notify ON public.posts;
CREATE TRIGGER on_post_created_notify
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_post();

-- Notify on comment
DROP TRIGGER IF EXISTS on_comment_created_notify ON public.post_comments;
CREATE TRIGGER on_comment_created_notify
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

-- Notify on like
DROP TRIGGER IF EXISTS on_like_created_notify ON public.post_likes;
CREATE TRIGGER on_like_created_notify
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

-- Notify on announcement
DROP TRIGGER IF EXISTS on_announcement_created_notify ON public.announcements;
CREATE TRIGGER on_announcement_created_notify
  AFTER INSERT ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_announcement();

-- Notify on report (to reported user)
DROP TRIGGER IF EXISTS on_report_created_notify ON public.reports;
CREATE TRIGGER on_report_created_notify
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_report();

-- Notify admins on report
DROP TRIGGER IF EXISTS on_report_created_notify_admins ON public.reports;
CREATE TRIGGER on_report_created_notify_admins
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_report();

-- Topic reply counter
DROP TRIGGER IF EXISTS on_reply_created ON public.replies;
CREATE TRIGGER on_reply_created
  AFTER INSERT ON public.replies
  FOR EACH ROW EXECUTE FUNCTION public.update_topic_on_reply();

-- Post likes count
DROP TRIGGER IF EXISTS on_post_like_count ON public.post_likes;
CREATE TRIGGER on_post_like_count
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- Post comments count
DROP TRIGGER IF EXISTS on_post_comment_count ON public.post_comments;
CREATE TRIGGER on_post_comment_count
  AFTER INSERT OR DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- Topic likes count
DROP TRIGGER IF EXISTS on_topic_like_count ON public.topic_likes;
CREATE TRIGGER on_topic_like_count
  AFTER INSERT OR DELETE ON public.topic_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_topic_likes_count();

-- Board member count
DROP TRIGGER IF EXISTS on_board_member_count ON public.board_members;
CREATE TRIGGER on_board_member_count
  AFTER INSERT OR DELETE ON public.board_members
  FOR EACH ROW EXECUTE FUNCTION public.update_board_members_count();

-- Board post count
DROP TRIGGER IF EXISTS on_board_post_count ON public.board_posts;
CREATE TRIGGER on_board_post_count
  AFTER INSERT OR DELETE ON public.board_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_board_posts_count();

-- Board post likes count
DROP TRIGGER IF EXISTS on_board_post_like_count ON public.board_post_likes;
CREATE TRIGGER on_board_post_like_count
  AFTER INSERT OR DELETE ON public.board_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_board_post_likes_count();

-- Board post comments count
DROP TRIGGER IF EXISTS on_board_post_comment_count ON public.board_post_comments;
CREATE TRIGGER on_board_post_comment_count
  AFTER INSERT OR DELETE ON public.board_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_board_post_comments_count();

-- Chat message update conversation
DROP TRIGGER IF EXISTS on_chat_message_update_convo ON public.chat_messages;
CREATE TRIGGER on_chat_message_update_convo
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

-- Chat message notify
DROP TRIGGER IF EXISTS on_chat_message_notify ON public.chat_messages;
CREATE TRIGGER on_chat_message_notify
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_chat_message();
