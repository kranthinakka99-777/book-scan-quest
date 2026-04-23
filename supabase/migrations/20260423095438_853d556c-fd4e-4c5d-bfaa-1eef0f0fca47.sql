
-- Student profile table linked to auth users
CREATE TABLE public.student_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  roll_number text NOT NULL,
  branch text NOT NULL,
  identifier_type text NOT NULL CHECK (identifier_type IN ('email','phone')),
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_profiles_roll ON public.student_profiles(roll_number);
CREATE INDEX idx_student_profiles_branch ON public.student_profiles(branch);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- A user can read/update their own profile
CREATE POLICY "Users view own profile"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own profile"
  ON public.student_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
  ON public.student_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Anyone (including the book-map gate which uses anon key) can view student list.
-- This matches the existing permissive model used for books/borrow_requests in this app.
CREATE POLICY "Public can view student profiles"
  ON public.student_profiles FOR SELECT
  TO anon
  USING (true);

-- Reuse existing updated_at trigger function
CREATE TRIGGER trg_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
