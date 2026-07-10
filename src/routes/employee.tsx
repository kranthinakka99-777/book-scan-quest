import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, ArrowLeft, QrCode, Plus, Pencil, Trash2, X, Check, Inbox, RotateCcw, Lock, Users, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  fetchBooks, upsertBook, deleteBook, type Book,
  fetchAllRequests, approveRequest, rejectRequest, markReturned,
  type BorrowRequestWithBook,
  fetchAllStudents, type StudentProfile,
} from "@/lib/library";
import { QrScanner } from "@/components/QrScanner";
import { supabase } from "@/integrations/supabase/client";

const OWNER_EMAIL = "kranthinakka99@gmail.com";

export const Route = createFileRoute("/employee")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Employee Dashboard — Smart AI Library" },
      { name: "description", content: "Book map — manage books, scan QR codes, and update rack inventory." },
      { property: "og:title", content: "Employee Dashboard — Smart AI Library" },
      { property: "og:description", content: "Manage books, scan QR codes, and update rack inventory." },
      { property: "og:url", content: "https://book-scan-quest.lovable.app/employee" },
    ],
    links: [{ rel: "canonical", href: "https://book-scan-quest.lovable.app/employee" }],
  }),
  component: EmployeeGate,
});

function EmployeeGate() {
  const [state, setState] = useState<"loading" | "signed-out" | "wrong-user" | "owner">("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const resolve = (userEmail: string | null | undefined) => {
      setEmail(userEmail ?? null);
      if (!userEmail) setState("signed-out");
      else if (userEmail.toLowerCase() === OWNER_EMAIL) setState("owner");
      else setState("wrong-user");
    };
    supabase.auth.getUser().then(({ data }) => resolve(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      resolve(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (state === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (state === "signed-out") return <OwnerLogin />;
  if (state === "wrong-user") return <NotAuthorized email={email} />;
  return <EmployeeDashboard />;
}

function OwnerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    const trimmed = email.trim();
    if (trimmed.toLowerCase() !== OWNER_EMAIL) {
      toast.error("This email is not the Book Map owner");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
        const { error } = await supabase.auth.signUp({
          email: trimmed,
          password,
          options: { emailRedirectTo: `${window.location.origin}/employee` },
        });
        if (error) throw error;
        toast.success("Owner account created — signing you in…");
        // Try to sign in immediately (works when email confirmation is off)
        await supabase.auth.signInWithPassword({ email: trimmed, password });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
        if (error) throw error;
        toast.success("Welcome back, owner");
      }
    } catch (e: any) {
      toast.error(e?.message ?? (mode === "signup" ? "Signup failed" : "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--gradient-hero)" }}>
      <Toaster />
      <Card className="w-full max-w-md p-7">
        <div className="flex items-center gap-3 mb-2">
          <Lock className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Owner access</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          The Book Map is restricted to the owner account. Sign in with the
          owner email and password to continue.
        </p>
        <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-md mb-4">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`text-sm py-1.5 rounded ${mode === m ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            >
              {m === "signin" ? "Sign in" : "Create owner account"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Owner email"
            autoFocus
            autoComplete="email"
            maxLength={200}
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Set a password (min 8 chars)" : "Password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            maxLength={200}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !email || !password} className="flex-1">
              {loading
                ? (mode === "signup" ? "Creating…" : "Signing in…")
                : (mode === "signup" ? "Create owner account" : "Sign in as owner")}
            </Button>
            <Link to="/" className="inline-flex items-center justify-center text-sm px-3 rounded-md border hover:bg-muted">
              Back
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

function NotAuthorized({ email }: { email: string | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--gradient-hero)" }}>
      <Toaster />
      <Card className="w-full max-w-md p-7">
        <div className="flex items-center gap-3 mb-2">
          <Mail className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Not authorized</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          You're signed in as <span className="font-medium">{email ?? "(unknown)"}</span>,
          but the Book Map is restricted to the owner account.
        </p>
        <div className="flex gap-2">
          <Button onClick={() => supabase.auth.signOut()} className="flex-1">Sign out</Button>
          <Link to="/" className="inline-flex items-center justify-center text-sm px-3 rounded-md border hover:bg-muted">
            Back
          </Link>
        </div>
      </Card>
    </div>
  );
}

type FormState = {
  id?: string;
  name: string;
  author: string;
  rack_number: number;
  branch: string;
  total_copies: number;
  available_copies: number;
};

const BRANCHES = ["AIML", "CSE", "EEE", "ECE", "MEC", "CIVIL", "IT"];
const empty: FormState = { name: "", author: "", rack_number: 1, branch: "", total_copies: 1, available_copies: 1 };

function EmployeeDashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [rack, setRack] = useState<number | "all">("all");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState<"books" | "queue" | "students">("books");
  const [requests, setRequests] = useState<BorrowRequestWithBook[]>([]);
  const [queueFilter, setQueueFilter] = useState<"pending" | "approved" | "all">("pending");
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  const reload = () => fetchBooks().then(setBooks).catch((e) => toast.error(e.message));
  const reloadRequests = () => fetchAllRequests().then(setRequests).catch((e) => toast.error(e.message));
  const reloadStudents = () => fetchAllStudents().then(setStudents).catch((e) => toast.error(e.message));

  useEffect(() => { reload(); reloadRequests(); reloadStudents(); }, []);

  const visible = rack === "all" ? books : books.filter((b) => b.rack_number === rack);

  const startEdit = (b: Book) => setEditing({
    id: b.id, name: b.name, author: b.author ?? "",
    rack_number: b.rack_number, branch: b.branch ?? "",
    total_copies: b.total_copies, available_copies: b.available_copies,
  });

  const startNew = (preset?: Partial<FormState>) => setEditing({ ...empty, rack_number: rack === "all" ? 1 : rack, ...preset });

  const onScan = async (text: string) => {
    setScanning(false);
    const code = text.trim();
    // Parse QR payload for name & author. Supports JSON {name,author},
    // two-line text (line 1 = name, line 2 = author), or "name|author".
    let parsed: { name?: string; author?: string } = {};
    try {
      const j = JSON.parse(code);
      if (j && typeof j === "object") {
        parsed = {
          name: typeof j.name === "string" ? j.name : undefined,
          author: typeof j.author === "string" ? j.author : undefined,
        };
      }
    } catch {
      const lines = code.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        parsed = { name: lines[0], author: lines[1] };
      } else if (code.includes("|")) {
        const [name, author] = code.split("|").map((s) => s.trim());
        parsed = { name, author };
      } else {
        parsed = { name: code };
      }
    }
    if (!parsed.name) {
      toast.error("Could not read book name from QR");
      return;
    }
    startNew({ name: parsed.name, author: parsed.author ?? "" });
    toast.success("Prefilled from QR — review & save");
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error("Name is required"); return; }
    if (editing.available_copies > editing.total_copies) { toast.error("Available cannot exceed total"); return; }
    try {
      await upsertBook({
        id: editing.id,
        name: editing.name.trim(),
        author: editing.author.trim() || null,
        rack_number: Number(editing.rack_number),
        branch: editing.branch.trim() || null,
        total_copies: Number(editing.total_copies),
        available_copies: Number(editing.available_copies),
      });
      toast.success("Saved");
      setEditing(null);
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (b: Book) => {
    if (!confirm(`Delete "${b.name}"?`)) return;
    try { await deleteBook(b.id); toast.success("Deleted"); reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleApprove = async (id: string) => {
    const days = prompt("Loan period in days?", "14");
    if (!days) return;
    const n = parseInt(days, 10);
    if (!Number.isFinite(n) || n <= 0 || n > 365) { toast.error("Enter 1–365 days"); return; }
    const due = new Date();
    due.setDate(due.getDate() + n);
    try {
      await approveRequest(id, due.toISOString().slice(0, 10));
      toast.success("Approved");
      reloadRequests(); reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Reject this request?")) return;
    try { await rejectRequest(id); toast.success("Rejected"); reloadRequests(); }
    catch (e: any) { toast.error(e.message); }
  };

  const handleReturn = async (id: string) => {
    try { await markReturned(id); toast.success("Marked returned"); reloadRequests(); reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const visibleRequests = requests.filter((r) =>
    queueFilter === "all" ? true : r.status === queueFilter
  );

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b" style={{ background: "var(--gradient-hero)" }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-primary-foreground">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Smart AI Library — Book Map Management</h1>
              <p className="text-sm text-primary-foreground/85">Catalog, borrow queue, and students</p>
            </div>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); }}
            className="inline-flex items-center gap-2 text-sm bg-white/15 hover:bg-white/25 px-3 py-2 rounded-md transition"
          >
            <ArrowLeft className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setTab("books")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === "books" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Books
          </button>
          <button
            onClick={() => setTab("queue")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition inline-flex items-center gap-2 ${tab === "queue" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Inbox className="w-4 h-4" /> Borrow queue
            {pendingCount > 0 && <Badge variant="destructive">{pendingCount}</Badge>}
          </button>
          <button
            onClick={() => setTab("students")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition inline-flex items-center gap-2 ${tab === "students" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Users className="w-4 h-4" /> Students
            {students.length > 0 && <Badge variant="secondary">{students.length}</Badge>}
          </button>
        </div>

        {tab === "books" && (
          <>
        <div className="flex flex-wrap gap-3 mb-6">
          <Button onClick={() => setScanning(true)} className="gap-2"><QrCode className="w-4 h-4" /> Scan QR</Button>
          <Button onClick={() => startNew()} variant="secondary" className="gap-2"><Plus className="w-4 h-4" /> Add book</Button>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium mb-2">Filter by rack</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setRack("all")} className={`px-3 py-1.5 rounded-md text-sm border ${rack === "all" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>All</button>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((r) => (
              <button key={r} onClick={() => setRack(r)} className={`px-3 py-1.5 rounded-md text-sm border ${rack === r ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
                Rack {r}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {visible.map((b) => (
            <Card key={b.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold">{b.name}</h2>
                  <Badge variant={b.available_copies > 0 ? "default" : "destructive"}>
                    {b.available_copies}/{b.total_copies}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {b.author ?? "—"} · Rack {b.rack_number}
                  {b.branch ? ` · ${b.branch}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(b)} aria-label={`Edit ${b.name}`}><Pencil className="w-4 h-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => remove(b)} aria-label={`Delete ${b.name}`}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </Card>
          ))}
          {visible.length === 0 && <p className="text-center text-muted-foreground py-8">No books in this rack.</p>}
        </div>
          </>
        )}

        {tab === "queue" && (
          <div>
            <div className="flex flex-wrap gap-2 mb-4">
              {(["pending", "approved", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setQueueFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-sm border capitalize ${queueFilter === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="grid gap-3">
              {visibleRequests.map((r) => {
                const overdue = r.status === "approved" && r.due_date && new Date(r.due_date) < new Date();
                return (
                  <Card key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold">{r.book?.name ?? "Book"}</h2>
                        <Badge variant={
                          r.status === "approved" ? "default"
                          : r.status === "pending" ? "secondary"
                          : r.status === "rejected" ? "destructive"
                          : "outline"
                        } className="capitalize">{r.status}</Badge>
                        {overdue && <Badge variant="destructive">Overdue</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {r.student_name} · {r.student_identifier}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Requested {new Date(r.requested_at).toLocaleString()}
                        {r.due_date ? ` · Due ${new Date(r.due_date).toLocaleDateString()}` : ""}
                        {r.returned_at ? ` · Returned ${new Date(r.returned_at).toLocaleDateString()}` : ""}
                      </p>
                      {r.notes && <p className="text-xs italic text-muted-foreground mt-1">"{r.notes}"</p>}
                    </div>
                    <div className="flex gap-2">
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => handleApprove(r.id)} className="gap-1"><Check className="w-4 h-4" /> Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(r.id)} className="gap-1"><X className="w-4 h-4" /> Reject</Button>
                        </>
                      )}
                      {r.status === "approved" && (
                        <Button size="sm" variant="secondary" onClick={() => handleReturn(r.id)} className="gap-1">
                          <RotateCcw className="w-4 h-4" /> Mark returned
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
              {visibleRequests.length === 0 && <p className="text-center text-muted-foreground py-8">No requests.</p>}
            </div>
          </div>
        )}

        {tab === "students" && (
          <div>
            <div className="mb-4">
              <Input
                placeholder="Search by name, roll number, branch, email, or phone…"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="grid gap-3">
              {students
                .filter((s) => {
                  const q = studentSearch.trim().toLowerCase();
                  if (!q) return true;
                  return [s.full_name, s.roll_number, s.branch, s.email ?? "", s.phone ?? ""]
                    .some((v) => v.toLowerCase().includes(q));
                })
                .map((s) => (
                  <Card key={s.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold">{s.full_name}</h2>
                        <Badge variant="outline">{s.branch}</Badge>
                        <Badge variant="secondary" className="capitalize">{s.identifier_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Roll: {s.roll_number}
                        {s.email ? ` · ${s.email}` : ""}
                        {s.phone ? ` · ${s.phone}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Joined {new Date(s.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </Card>
                ))}
              {students.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No students have signed up yet.</p>
              )}
            </div>
          </div>
        )}
      </main>

      {scanning && <QrScanner onScan={onScan} onClose={() => setScanning(false)} />}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editing.id ? "Edit book" : "Add book"}</h3>
              <button onClick={() => setEditing(null)} aria-label="Close book form" className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Author"><Input value={editing.author} onChange={(e) => setEditing({ ...editing, author: e.target.value })} /></Field>
              <Field label="Rack number (1–10)">
                <Input type="number" min={1} max={10} value={editing.rack_number}
                  onChange={(e) => setEditing({ ...editing, rack_number: Number(e.target.value) })} />
              </Field>
              <Field label="Branch">
                <select
                  value={editing.branch}
                  onChange={(e) => setEditing({ ...editing, branch: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select branch…</option>
                  {BRANCHES.map((br) => (
                    <option key={br} value={br}>{br}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Total copies">
                  <Input type="number" min={0} value={editing.total_copies}
                    onChange={(e) => setEditing({ ...editing, total_copies: Number(e.target.value) })} />
                </Field>
                <Field label="Available copies">
                  <Input type="number" min={0} value={editing.available_copies}
                    onChange={(e) => setEditing({ ...editing, available_copies: Number(e.target.value) })} />
                </Field>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button onClick={save} className="flex-1">Save</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium mb-1 block">{label}</span>
      {children}
    </label>
  );
}
