
-- Fix function search path
CREATE OR REPLACE FUNCTION public.update_topic_on_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.topics 
  SET replies_count = replies_count + 1, last_activity_at = now()
  WHERE id = NEW.topic_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_invite_ticket_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.invite_tickets (owner_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_anonymous_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
  SELECT 
    (ARRAY['Shadow','Ghost','Phantom','Cipher','Drift','Echo','Void','Raven','Storm','Neon','Silent','Midnight','Frost','Ember','Pulse','Stealth','Vapor','Apex','Nebula','Flux'])[floor(random()*20+1)::int]
    || 
    (ARRAY['Walker','Voice','Runner','Hawk','Byte','Fox','Sage','Wolf','Node','Blade','Rider','Spark','Dusk','Wave','Ray','Soul','Core','Vex','Arc','Zen'])[floor(random()*20+1)::int]
$$;

-- Fix overly permissive anon RLS on invite_tickets
DROP POLICY IF EXISTS "Ticket validation for anon" ON public.invite_tickets;
DROP POLICY IF EXISTS "Ticket update for anon" ON public.invite_tickets;

-- Instead allow service role / edge function to validate tickets
-- For client-side validation, use a security definer function
CREATE OR REPLACE FUNCTION public.validate_invite_code(code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invite_tickets
    WHERE invite_code = code AND is_used = false
  )
$$;

CREATE OR REPLACE FUNCTION public.consume_invite_code(code text, new_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.invite_tickets
  SET is_used = true, used_by = new_user_id, used_at = now()
  WHERE invite_code = code AND is_used = false;
  
  UPDATE public.profiles
  SET invited_by = (SELECT owner_id FROM public.invite_tickets WHERE invite_code = code)
  WHERE user_id = new_user_id;
END;
$$;

-- Grant execute to anon for pre-signup validation
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_invite_code(text, uuid) TO authenticated;
