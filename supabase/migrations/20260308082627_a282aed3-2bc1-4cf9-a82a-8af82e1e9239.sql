
DROP FUNCTION IF EXISTS public.validate_invite_code(text);
DROP FUNCTION IF EXISTS public.consume_invite_code(text, uuid);

CREATE FUNCTION public.validate_invite_code(_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.invite_tickets
    WHERE invite_code = _code AND is_used = false
  )
$$;

CREATE FUNCTION public.consume_invite_code(_code text, new_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.invite_tickets
  SET is_used = true, used_by = new_user_id, used_at = now()
  WHERE invite_code = _code AND is_used = false;
  
  UPDATE public.profiles
  SET invited_by = (SELECT owner_id FROM public.invite_tickets WHERE invite_code = _code)
  WHERE user_id = new_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_invite_code(text, uuid) TO authenticated;

CREATE POLICY "Users can delete own unused tickets" ON public.invite_tickets 
FOR DELETE TO authenticated 
USING (owner_id = auth.uid() AND is_used = false);
