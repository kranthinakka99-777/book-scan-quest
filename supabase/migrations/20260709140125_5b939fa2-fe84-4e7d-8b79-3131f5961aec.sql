-- Books: keep public SELECT, drop write policies (writes go via server functions using service role)
DROP POLICY IF EXISTS "Anyone can insert books" ON public.books;
DROP POLICY IF EXISTS "Anyone can update books" ON public.books;
DROP POLICY IF EXISTS "Anyone can delete books" ON public.books;

-- Borrow requests: drop all permissive public policies; everything now goes through server functions
DROP POLICY IF EXISTS "Anyone can view borrow requests" ON public.borrow_requests;
DROP POLICY IF EXISTS "Anyone can create borrow requests" ON public.borrow_requests;
DROP POLICY IF EXISTS "Anyone can update borrow requests" ON public.borrow_requests;
DROP POLICY IF EXISTS "Anyone can delete borrow requests" ON public.borrow_requests;

-- Student profiles: drop the anon SELECT-all policy; keep authenticated own-row policies
DROP POLICY IF EXISTS "Public can view student profiles" ON public.student_profiles;

-- Revoke the anon-role grant that backed the removed public SELECT policy
REVOKE SELECT ON public.student_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.books FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.books FROM authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.borrow_requests FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.borrow_requests FROM authenticated;

-- Ensure service_role retains full access for server-side functions
GRANT ALL ON public.books TO service_role;
GRANT ALL ON public.borrow_requests TO service_role;
GRANT ALL ON public.student_profiles TO service_role;