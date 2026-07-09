import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// ---------- Owner (employee) session ----------

type OwnerSession = {
  unlocked?: boolean;
  attempts?: number;
  lockedUntil?: number;
};

function sessionConfig() {
  const password = process.env.ADMIN_SESSION_SECRET;
  if (!password) throw new Error("ADMIN_SESSION_SECRET is not set");
  return {
    password,
    name: "lib-owner",
    maxAge: 60 * 60 * 8, // 8 hours
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

function eq(a: string, b: string) {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

async function requireOwner() {
  const session = await useSession<OwnerSession>(sessionConfig());
  if (!session.data.unlocked) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
}

const MAX_ATTEMPTS = 8;
const LOCK_MS = 5 * 60 * 1000;

export const verifyOwner = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ password: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const expected = process.env.OWNER_PASSWORD;
    if (!expected) throw new Response("Owner password not configured", { status: 500 });

    const session = await useSession<OwnerSession>(sessionConfig());
    const now = Date.now();
    if (session.data.lockedUntil && session.data.lockedUntil > now) {
      const retryAfter = Math.ceil((session.data.lockedUntil - now) / 1000);
      return { ok: false as const, retryAfter };
    }

    if (!eq(data.password, expected)) {
      const attempts = (session.data.attempts ?? 0) + 1;
      const lockedUntil = attempts >= MAX_ATTEMPTS ? now + LOCK_MS : undefined;
      await session.update({
        unlocked: false,
        attempts: lockedUntil ? 0 : attempts,
        lockedUntil,
      });
      return { ok: false as const, retryAfter: lockedUntil ? Math.ceil(LOCK_MS / 1000) : undefined };
    }

    await session.update({ unlocked: true, attempts: 0, lockedUntil: undefined });
    return { ok: true as const };
  });

export const signOutOwner = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<OwnerSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const isOwnerUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<OwnerSession>(sessionConfig());
  return { unlocked: !!session.data.unlocked };
});

// ---------- Books ----------

const bookSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(300),
  author: z.string().max(200).nullable(),
  rack_number: z.number().int().min(1).max(1000),
  branch: z.string().max(50).nullable(),
  total_copies: z.number().int().min(0).max(10000),
  available_copies: z.number().int().min(0).max(10000),
});

export const adminUpsertBook = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => bookSchema.parse(d))
  .handler(async ({ data }) => {
    await requireOwner();
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await (await admin()).from("books").update(rest).eq("id", id);
      if (error) throw new Response("Failed to update book", { status: 500 });
    } else {
      const { id: _omit, ...rest } = data;
      const { error } = await (await admin()).from("books").insert(rest);
      if (error) throw new Response("Failed to insert book", { status: 500 });
    }
    return { ok: true as const };
  });

export const adminDeleteBook = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireOwner();
    const { error } = await (await admin()).from("books").delete().eq("id", data.id);
    if (error) throw new Response("Failed to delete book", { status: 500 });
    return { ok: true as const };
  });

// ---------- Borrow requests ----------

export const adminListRequests = createServerFn({ method: "GET" }).handler(async () => {
  await requireOwner();
  const { data, error } = await (await admin())
    .from("borrow_requests")
    .select("*, book:books(*)")
    .order("requested_at", { ascending: false });
  if (error) throw new Response("Failed to load requests", { status: 500 });
  return data ?? [];
});

export const adminApproveRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    await requireOwner();
    const { error } = await (await admin())
      .from("borrow_requests")
      .update({ status: "approved", due_date: data.due_date })
      .eq("id", data.id);
    if (error) throw new Response("Failed to approve request", { status: 500 });
    return { ok: true as const };
  });

export const adminRejectRequest = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireOwner();
    const { error } = await (await admin())
      .from("borrow_requests")
      .update({ status: "rejected" })
      .eq("id", data.id);
    if (error) throw new Response("Failed to reject request", { status: 500 });
    return { ok: true as const };
  });

export const adminMarkReturned = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await requireOwner();
    const { error } = await (await admin())
      .from("borrow_requests")
      .update({ status: "returned" })
      .eq("id", data.id);
    if (error) throw new Response("Failed to mark returned", { status: 500 });
    return { ok: true as const };
  });

// ---------- Students (employee-only listing) ----------

export const adminListStudents = createServerFn({ method: "GET" }).handler(async () => {
  await requireOwner();
  const { data, error } = await (await admin())
    .from("student_profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Response("Failed to load students", { status: 500 });
  return data ?? [];
});

// ---------- Student-facing borrow flows (require Supabase auth) ----------

const createReqSchema = z.object({
  book_id: z.string().uuid(),
  notes: z.string().max(300).optional(),
});

export const studentCreateRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createReqSchema.parse(d))
  .handler(async ({ data, context }) => {
    // Resolve the student profile server-side; never trust client-supplied identity.
    const sb = await admin();
    const { data: profile, error: pErr } = await sb
      .from("student_profiles")
      .select("full_name, identifier_type, email, phone")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (pErr || !profile) throw new Response("Profile not found", { status: 400 });

    const identifier =
      profile.identifier_type === "email" ? profile.email ?? "" : profile.phone ?? "";
    if (!identifier) throw new Response("Profile missing identifier", { status: 400 });

    const { error } = await sb.from("borrow_requests").insert({
      book_id: data.book_id,
      student_name: profile.full_name,
      student_identifier: identifier,
      notes: data.notes ?? null,
    });
    if (error) throw new Response("Failed to create request", { status: 500 });
    return { ok: true as const };
  });

export const studentListMyRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = await admin();
    const { data: profile } = await sb
      .from("student_profiles")
      .select("identifier_type, email, phone")
      .eq("user_id", context.userId)
      .maybeSingle();
    const identifier = profile
      ? profile.identifier_type === "email"
        ? profile.email ?? ""
        : profile.phone ?? ""
      : "";
    if (!identifier) return [];
    const { data, error } = await sb
      .from("borrow_requests")
      .select("*, book:books(*)")
      .eq("student_identifier", identifier)
      .order("requested_at", { ascending: false });
    if (error) throw new Response("Failed to load your requests", { status: 500 });
    return data ?? [];
  });