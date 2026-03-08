
-- Fix self-referencing RLS on conversation_members
-- Create a security definer function to check membership
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  )
$$;

-- Drop old self-referencing policies
DROP POLICY IF EXISTS "Members can view members" ON public.conversation_members;
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Members can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.chat_messages;

-- Recreate with security definer function
CREATE POLICY "Members can view members" ON public.conversation_members
  FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Members can view conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (public.is_conversation_member(id, auth.uid()));

CREATE POLICY "Members can view messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Members can send messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND public.is_conversation_member(conversation_id, auth.uid())
  );
