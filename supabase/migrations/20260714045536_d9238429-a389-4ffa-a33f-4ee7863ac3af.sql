
-- Helper: does this borrow_requests row belong to the current user's profile identifier?
CREATE OR REPLACE FUNCTION public.borrow_request_belongs_to_user(_identifier text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_profiles sp
    WHERE sp.user_id = _user_id
      AND (
        (sp.identifier_type = 'email' AND sp.email = _identifier)
        OR (sp.identifier_type = 'phone' AND sp.phone = _identifier)
      )
  )
$$;

CREATE POLICY "Students can view their own borrow requests"
  ON public.borrow_requests
  FOR SELECT
  TO authenticated
  USING (public.borrow_request_belongs_to_user(student_identifier, auth.uid()));

CREATE POLICY "Students can create their own borrow requests"
  ON public.borrow_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (public.borrow_request_belongs_to_user(student_identifier, auth.uid()));
