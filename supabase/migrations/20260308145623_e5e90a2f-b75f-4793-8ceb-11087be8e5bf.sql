
-- Conversations table (direct + group)
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name text, -- only for groups
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Conversation members
CREATE TABLE public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Chat messages
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS: conversations - members can view
CREATE POLICY "Members can view conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = id AND cm.user_id = auth.uid()
  ));

-- RLS: conversations - authenticated can create
CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- RLS: conversations - creator can update (rename groups)
CREATE POLICY "Creator can update conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

-- RLS: conversation_members - members can view members
CREATE POLICY "Members can view members" ON public.conversation_members
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid()
  ));

-- RLS: conversation_members - conversation creator or self can insert
CREATE POLICY "Users can add members" ON public.conversation_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid()
    ) OR user_id = auth.uid()
  );

-- RLS: conversation_members - self can leave
CREATE POLICY "Users can leave conversations" ON public.conversation_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS: chat_messages - members can view
CREATE POLICY "Members can view messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid()
  ));

-- RLS: chat_messages - members can send
CREATE POLICY "Members can send messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = conversation_id AND cm.user_id = auth.uid()
    )
  );

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Update conversations.updated_at on new message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();
