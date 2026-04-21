CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  author TEXT,
  rack_number INTEGER NOT NULL CHECK (rack_number BETWEEN 1 AND 10),
  total_copies INTEGER NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
  available_copies INTEGER NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Anyone can insert books" ON public.books FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update books" ON public.books FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete books" ON public.books FOR DELETE USING (true);

CREATE INDEX idx_books_name ON public.books USING gin (to_tsvector('english', name));
CREATE INDEX idx_books_rack ON public.books (rack_number);

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER books_updated_at BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.books (book_id, name, author, rack_number, total_copies, available_copies) VALUES
('B001', 'The Great Gatsby', 'F. Scott Fitzgerald', 1, 5, 3),
('B002', 'To Kill a Mockingbird', 'Harper Lee', 1, 4, 4),
('B003', '1984', 'George Orwell', 2, 6, 2),
('B004', 'Pride and Prejudice', 'Jane Austen', 2, 3, 0),
('B005', 'The Catcher in the Rye', 'J.D. Salinger', 3, 4, 4),
('B006', 'The Hobbit', 'J.R.R. Tolkien', 3, 5, 1),
('B007', 'Fahrenheit 451', 'Ray Bradbury', 4, 3, 3),
('B008', 'Brave New World', 'Aldous Huxley', 4, 4, 2),
('B009', 'Moby Dick', 'Herman Melville', 5, 2, 2),
('B010', 'War and Peace', 'Leo Tolstoy', 5, 3, 1),
('B011', 'Crime and Punishment', 'Fyodor Dostoevsky', 6, 4, 4),
('B012', 'The Odyssey', 'Homer', 6, 3, 0),
('B013', 'Don Quixote', 'Miguel de Cervantes', 7, 2, 2),
('B014', 'Jane Eyre', 'Charlotte Brontë', 7, 5, 3),
('B015', 'Wuthering Heights', 'Emily Brontë', 8, 3, 3),
('B016', 'The Brothers Karamazov', 'Fyodor Dostoevsky', 8, 2, 1),
('B017', 'Anna Karenina', 'Leo Tolstoy', 9, 4, 4),
('B018', 'Les Misérables', 'Victor Hugo', 9, 3, 2),
('B019', 'A Tale of Two Cities', 'Charles Dickens', 10, 5, 5),
('B020', 'The Picard AI Handbook', 'Ada Lovelace', 10, 6, 6);