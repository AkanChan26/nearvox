
CREATE OR REPLACE FUNCTION public.increment_topic_views(topic_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  UPDATE public.topics SET views_count = views_count + 1 WHERE id = topic_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_topic_views(uuid) TO authenticated;
