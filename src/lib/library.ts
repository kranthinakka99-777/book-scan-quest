import { supabase } from "@/integrations/supabase/client";

export type Book = {
  id: string;
  name: string;
  author: string | null;
  rack_number: number;
  branch: string | null;
  total_copies: number;
  available_copies: number;
  created_at: string;
  updated_at: string;
};

export async function fetchBooks(): Promise<Book[]> {
  const { data, error } = await supabase.from("books").select("*").order("name");
  if (error) throw error;
  return data as Book[];
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

export type BorrowStatus = "pending" | "approved" | "rejected" | "returned";

export type BorrowRequest = {
  id: string;
  book_id: string;
  student_name: string;
  student_identifier: string;
  status: BorrowStatus;
  requested_at: string;
  decided_at: string | null;
  due_date: string | null;
  returned_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BorrowRequestWithBook = BorrowRequest & { book: Book | null };

export async function createBorrowRequest(input: {
  book_id: string;
  student_name: string;
  student_identifier: string;
  notes?: string;
}) {
  const { error } = await supabase.from("borrow_requests").insert({
    book_id: input.book_id,
    student_name: input.student_name,
    student_identifier: input.student_identifier,
    notes: input.notes ?? null,
  });
  if (error) throw error;
}

export async function fetchMyRequests(identifier: string): Promise<BorrowRequestWithBook[]> {
  const { data, error } = await supabase
    .from("borrow_requests")
    .select("*, book:books(*)")
    .eq("student_identifier", identifier)
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BorrowRequestWithBook[];
}

export async function fetchAllRequests(): Promise<BorrowRequestWithBook[]> {
  const { data, error } = await supabase
    .from("borrow_requests")
    .select("*, book:books(*)")
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BorrowRequestWithBook[];
}

export async function approveRequest(id: string, dueDate: string) {
  const { error } = await supabase
    .from("borrow_requests")
    .update({ status: "approved", due_date: dueDate })
    .eq("id", id);
  if (error) throw error;
}

export async function rejectRequest(id: string) {
  const { error } = await supabase
    .from("borrow_requests")
    .update({ status: "rejected" })
    .eq("id", id);
  if (error) throw error;
}

export async function markReturned(id: string) {
  const { error } = await supabase
    .from("borrow_requests")
    .update({ status: "returned" })
    .eq("id", id);
  if (error) throw error;
}
