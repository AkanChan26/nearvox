
-- 1. Blocked users table
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks" ON public.blocked_users
  FOR SELECT TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "Users can block" ON public.blocked_users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON public.blocked_users
  FOR DELETE TO authenticated USING (auth.uid() = blocker_id);

-- 2. Message reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view reactions" ON public.message_reactions
  FOR SELECT TO authenticated
  USING (
    public.is_conversation_member(
      (SELECT conversation_id FROM public.chat_messages WHERE id = message_id),
      auth.uid()
    )
  );
CREATE POLICY "Members can add reactions" ON public.message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    public.is_conversation_member(
      (SELECT conversation_id FROM public.chat_messages WHERE id = message_id),
      auth.uid()
    )
  );
CREATE POLICY "Users can remove own reactions" ON public.message_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Allow message editing (sender only)
CREATE POLICY "Sender can update own messages" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- 4. Allow message deletion (sender only)
CREATE POLICY "Sender can delete own messages" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- 5. Add is_edited and deleted_at columns to chat_messages
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;

-- 6. Allow deleting conversation members (for leaving/deleting conversations)
-- Already exists per schema

-- 7. Allow conversation deletion by creator
CREATE POLICY "Creator can delete conversations" ON public.conversations
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- 8. Add realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
