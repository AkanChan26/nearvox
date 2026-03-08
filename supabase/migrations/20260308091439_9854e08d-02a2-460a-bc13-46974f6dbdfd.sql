
-- Create messages table for user-to-user and broadcast messaging
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID DEFAULT NULL,
  content TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Everyone can read messages sent to them or broadcast messages
CREATE POLICY "Users can read own messages" ON public.messages
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid() OR recipient_id IS NULL OR sender_id = auth.uid());

-- Users can send messages
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Users can delete own sent messages, admins can delete any
CREATE POLICY "Users can delete own messages" ON public.messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Create trigger to send welcome message on new user signup
CREATE OR REPLACE FUNCTION public.send_welcome_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.messages (sender_id, recipient_id, content, is_system)
  VALUES (
    NEW.user_id,
    NEW.user_id,
    'Welcome to NEARVOX, ' || COALESCE(NEW.anonymous_name, NEW.username) || '! You are now part of the anonymous network. Browse topics, share posts, and connect with your community. Stay anonymous, stay vocal.',
    true
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_profile_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_message();
