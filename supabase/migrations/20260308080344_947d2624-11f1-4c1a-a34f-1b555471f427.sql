
-- Topics table
CREATE TABLE public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  user_id uuid NOT NULL,
  location text,
  views_count integer NOT NULL DEFAULT 0,
  replies_count integer NOT NULL DEFAULT 0,
  is_announcement boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Replies table
CREATE TABLE public.replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Invite tickets table
CREATE TABLE public.invite_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  invite_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  used_by uuid,
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_at timestamp with time zone
);

-- Add invited_by to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invited_by uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS anonymous_name text;

-- Enable RLS
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_tickets ENABLE ROW LEVEL SECURITY;

-- Topics RLS
CREATE POLICY "Topics viewable by authenticated" ON public.topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create topics" ON public.topics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own topics, admins all" ON public.topics FOR UPDATE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete topics" ON public.topics FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Replies RLS
CREATE POLICY "Replies viewable by authenticated" ON public.replies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create replies" ON public.replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own replies, admins all" ON public.replies FOR DELETE TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Invite tickets RLS
CREATE POLICY "Users can view own tickets" ON public.invite_tickets FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Admins can view all tickets" ON public.invite_tickets FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create tickets" ON public.invite_tickets FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own tickets" ON public.invite_tickets FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Ticket validation for anon" ON public.invite_tickets FOR SELECT TO anon USING (true);
CREATE POLICY "Ticket update for anon" ON public.invite_tickets FOR UPDATE TO anon USING (true);

-- Trigger to update replies_count and last_activity_at on topics
CREATE OR REPLACE FUNCTION public.update_topic_on_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.topics 
  SET replies_count = replies_count + 1, last_activity_at = now()
  WHERE id = NEW.topic_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_reply_insert
  AFTER INSERT ON public.replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_topic_on_reply();

-- Trigger to give new users 1 invite ticket
CREATE OR REPLACE FUNCTION public.create_invite_ticket_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.invite_tickets (owner_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_user_create_ticket
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_invite_ticket_for_new_user();

-- Function to generate anonymous names
CREATE OR REPLACE FUNCTION public.generate_anonymous_name()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 
    (ARRAY['Shadow','Ghost','Phantom','Cipher','Drift','Echo','Void','Raven','Storm','Neon','Silent','Midnight','Frost','Ember','Pulse','Stealth','Vapor','Apex','Nebula','Flux'])[floor(random()*20+1)::int]
    || 
    (ARRAY['Walker','Voice','Runner','Hawk','Byte','Fox','Sage','Wolf','Node','Blade','Rider','Spark','Dusk','Wave','Ray','Soul','Core','Vex','Arc','Zen'])[floor(random()*20+1)::int]
$$;

-- Update handle_new_user to set anonymous name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, anonymous_name)
  VALUES (NEW.id, 'User_' || LEFT(NEW.id::text, 8), public.generate_anonymous_name());
  RETURN NEW;
END;
$$;

-- Enable realtime for topics and replies
ALTER PUBLICATION supabase_realtime ADD TABLE public.topics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.replies;
