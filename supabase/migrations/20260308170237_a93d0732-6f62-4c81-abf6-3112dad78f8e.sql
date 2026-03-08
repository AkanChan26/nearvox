
DROP POLICY IF EXISTS "Admins can delete topics" ON public.topics;
CREATE POLICY "Owner or admin can delete topics"
ON public.topics
FOR DELETE
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));
