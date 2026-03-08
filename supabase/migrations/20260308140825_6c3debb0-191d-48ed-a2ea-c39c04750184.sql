CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, username, name, location, anonymous_name, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'anonymous_name', public.generate_anonymous_name()),
    COALESCE(NEW.raw_user_meta_data->>'name', null),
    COALESCE(NEW.raw_user_meta_data->>'region', null),
    COALESCE(NEW.raw_user_meta_data->>'anonymous_name', public.generate_anonymous_name()),
    COALESCE(NEW.raw_user_meta_data->>'avatar', 'user-1')
  );
  RETURN NEW;
END;
$function$;