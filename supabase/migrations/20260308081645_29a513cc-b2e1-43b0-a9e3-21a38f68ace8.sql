
-- Add name column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;

-- Update handle_new_user to use metadata from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, name, location, anonymous_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data->>'name', null),
    COALESCE(NEW.raw_user_meta_data->>'region', null),
    public.generate_anonymous_name()
  );
  RETURN NEW;
END;
$$;
