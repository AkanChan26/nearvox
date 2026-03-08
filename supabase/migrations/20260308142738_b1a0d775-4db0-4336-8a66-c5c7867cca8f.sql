-- Allow users to view their own reports (so they can undo them)
CREATE POLICY "Users can view own reports" ON public.reports
FOR SELECT TO authenticated USING (reporter_id = auth.uid());

-- Allow users to delete their own pending reports (undo)
CREATE POLICY "Users can delete own pending reports" ON public.reports
FOR DELETE TO authenticated USING (reporter_id = auth.uid() AND status = 'pending');

-- Notify all admins when a new report is created
CREATE OR REPLACE FUNCTION public.notify_admins_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reporter_name text;
  admin_record record;
BEGIN
  SELECT COALESCE(anonymous_name, username) INTO reporter_name FROM public.profiles WHERE user_id = NEW.reporter_id;
  
  FOR admin_record IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, related_id)
    VALUES (
      admin_record.user_id,
      'report',
      'New Report Submitted',
      COALESCE(reporter_name, 'A user') || ' reported content: ' || LEFT(NEW.reason, 60),
      NEW.id::text
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_report_notify_admins
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_report();