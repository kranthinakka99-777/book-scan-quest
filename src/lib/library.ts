import { supabase } from "@/integrations/supabase/client";

export type Book = {
  id: string;
  book_id: string;
  name: string;
  author: string | null;
  rack_number: number;
  total_copies: number;
  available_copies: number;
  created_at: string;
  updated_at: string;
};

export async function fetchBooks(): Promise<Book[]> {
  const { data, error } = await supabase.from("books").select("*").order("book_id");
  if (error) throw error;
  return data as Book[];
}

export async function findBookByBookId(bookId: string): Promise<Book | null> {
  const { data, error } = await supabase.from("books").select("*").eq("book_id", bookId).maybeSingle();
  if (error) throw error;
  return (data as Book) ?? null;
}

export async function upsertBook(book: Omit<Book, "id" | "created_at" | "updated_at"> & { id?: string }) {
  if (book.id) {
    const { id, ...rest } = book;
    const { error } = await supabase.from("books").update(rest).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("books").insert(book);
    if (error) throw error;
  }
}

export async function deleteBook(id: string) {
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) throw error;
}
