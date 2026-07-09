import { supabase } from "@/integrations/supabase/client";
import {
  adminUpsertBook,
  adminDeleteBook,
  adminListRequests,
  adminApproveRequest,
  adminRejectRequest,
  adminMarkReturned,
  adminListStudents,
  studentCreateRequest,
  studentListMyRequests,
} from "./library.functions";

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
  await adminUpsertBook({ data: book });
}

export async function deleteBook(id: string) {
  await adminDeleteBook({ data: { id } });
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
  notes?: string;
}) {
  await studentCreateRequest({ data: { book_id: input.book_id, notes: input.notes } });
}

export async function fetchMyRequests(): Promise<BorrowRequestWithBook[]> {
  return (await studentListMyRequests()) as BorrowRequestWithBook[];
}

export async function fetchAllRequests(): Promise<BorrowRequestWithBook[]> {
  return (await adminListRequests()) as BorrowRequestWithBook[];
}

export async function approveRequest(id: string, dueDate: string) {
  await adminApproveRequest({ data: { id, due_date: dueDate } });
}

export async function rejectRequest(id: string) {
  await adminRejectRequest({ data: { id } });
}

export async function markReturned(id: string) {
  await adminMarkReturned({ data: { id } });
}

// ---------- Student profiles ----------
export type StudentProfile = {
  id: string;
  user_id: string;
  full_name: string;
  roll_number: string;
  branch: string;
  identifier_type: "email" | "phone";
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchMyProfile(userId: string): Promise<StudentProfile | null> {
  const { data, error } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as StudentProfile) ?? null;
}

export async function upsertMyProfile(input: {
  user_id: string;
  full_name: string;
  roll_number: string;
  branch: string;
  identifier_type: "email" | "phone";
  email: string | null;
  phone: string | null;
}) {
  const { error } = await supabase
    .from("student_profiles")
    .upsert(input, { onConflict: "user_id" });
  if (error) throw error;
}

export async function fetchAllStudents(): Promise<StudentProfile[]> {
  return (await adminListStudents()) as StudentProfile[];
}
