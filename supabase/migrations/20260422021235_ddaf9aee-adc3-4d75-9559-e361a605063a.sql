
-- Status enum
CREATE TYPE public.borrow_status AS ENUM ('pending', 'approved', 'rejected', 'returned');

-- Borrow requests table
CREATE TABLE public.borrow_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_identifier text NOT NULL,
  status public.borrow_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  due_date date,
  returned_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_borrow_requests_status ON public.borrow_requests(status);
CREATE INDEX idx_borrow_requests_book ON public.borrow_requests(book_id);
CREATE INDEX idx_borrow_requests_identifier ON public.borrow_requests(student_identifier);

ALTER TABLE public.borrow_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view borrow requests"
  ON public.borrow_requests FOR SELECT USING (true);
CREATE POLICY "Anyone can create borrow requests"
  ON public.borrow_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update borrow requests"
  ON public.borrow_requests FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete borrow requests"
  ON public.borrow_requests FOR DELETE USING (true);

-- updated_at trigger (reuse existing function)
CREATE TRIGGER trg_borrow_requests_updated_at
  BEFORE UPDATE ON public.borrow_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Inventory sync: adjust books.available_copies on status transitions
CREATE OR REPLACE FUNCTION public.sync_book_availability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  current_available int;
BEGIN
  -- Approving a request: decrement available copies
  IF (TG_OP = 'UPDATE'
      AND OLD.status = 'pending'
      AND NEW.status = 'approved') THEN
    SELECT available_copies INTO current_available FROM public.books WHERE id = NEW.book_id FOR UPDATE;
    IF current_available IS NULL OR current_available <= 0 THEN
      RAISE EXCEPTION 'No copies available to approve this request';
    END IF;
    UPDATE public.books SET available_copies = available_copies - 1 WHERE id = NEW.book_id;
    NEW.decided_at = now();
  END IF;

  -- Rejecting a pending request: just stamp decided_at
  IF (TG_OP = 'UPDATE'
      AND OLD.status = 'pending'
      AND NEW.status = 'rejected') THEN
    NEW.decided_at = now();
  END IF;

  -- Returning an approved book: increment available copies
  IF (TG_OP = 'UPDATE'
      AND OLD.status = 'approved'
      AND NEW.status = 'returned') THEN
    UPDATE public.books SET available_copies = available_copies + 1 WHERE id = NEW.book_id;
    NEW.returned_at = now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_borrow_requests_sync
  BEFORE UPDATE ON public.borrow_requests
  FOR EACH ROW EXECUTE FUNCTION public.sync_book_availability();
