
-- Add last_read_at column to conversation_members for unread tracking
ALTER TABLE public.conversation_members ADD COLUMN IF NOT EXISTS last_read_at timestamptz DEFAULT now();

-- Create a trigger function to send notifications when a new chat message is sent
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _member RECORD;
  _sender_name TEXT;
  _convo_name TEXT;
BEGIN
  -- Get sender display name
  SELECT COALESCE(anonymous_name, username) INTO _sender_name
  FROM public.profiles WHERE user_id = NEW.sender_id;

  -- Get conversation name
  SELECT COALESCE(c.name, 'Direct Message') INTO _convo_name
  FROM public.conversations c WHERE c.id = NEW.conversation_id;

  -- Notify all members except sender
  FOR _member IN
    SELECT user_id FROM public.conversation_members
    WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      _member.user_id,
      'New message from ' || _sender_name,
      LEFT(NEW.content, 100),
      'chat_message',
      NEW.conversation_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger on chat_messages
DROP TRIGGER IF EXISTS on_chat_message_notify ON public.chat_messages;
CREATE TRIGGER on_chat_message_notify
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_chat_message();
