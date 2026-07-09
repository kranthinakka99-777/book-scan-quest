import { createFileRoute, Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search, ArrowLeft, MapPin, BookPlus, X, LogOut, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { LibraryBot } from "@/components/LibraryBot";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchBooks,
  createBorrowRequest,
  fetchMyRequests,
  fetchMyProfile,
  type StudentProfile,
  type Book,
  type BorrowRequestWithBook,
} from "@/lib/library";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Student Dashboard — Smart AI Library" },
      { name: "description", content: "Search the Smart AI Library catalog by name, ID, or author." },
    ],
  }),
  component: StudentDashboard,
});

function StudentDashboard() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<Book | null>(null);
  const [myRequests, setMyRequests] = useState<BorrowRequestWithBook[]>([]);
  const [showMine, setShowMine] = useState(false);

  // Auth gate + load profile
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      const user = data.session?.user;
      if (!user) { navigate({ to: "/student-auth" }); return; }
      try {
        const p = await fetchMyProfile(user.id);
        if (!p) { navigate({ to: "/student-auth" }); return; }
        setProfile(p);
      } catch { /* ignore */ }
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/student-auth" });
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, [navigate]);

  const identifier = profile
    ? (profile.identifier_type === "email" ? profile.email ?? "" : profile.phone ?? "")
    : "";
  const studentName = profile?.full_name ?? "";

  useEffect(() => {
    fetchBooks().then((b) => { setBooks(b); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const reloadMine = () => {
    if (!identifier) { setMyRequests([]); return; }
    fetchMyRequests().then(setMyRequests).catch(() => {});
  };

  useEffect(() => { reloadMine(); }, [identifier]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      (b.author ?? "").toLowerCase().includes(q)
    );
  }, [books, query]);

  const submitRequest = async (_name: string, _id: string, notes: string) => {
    if (!requesting) return;
    try {
      await createBorrowRequest({
        book_id: requesting.id,
        notes: notes.trim() || undefined,
      });
      setRequesting(null);
      toast.success("Request submitted — pending approval");
      reloadMine();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (!authChecked) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b" style={{ background: "var(--gradient-hero)" }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-primary-foreground">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Smart AI Library — Student Dashboard</h1>
              <p className="text-sm text-primary-foreground/85">
                {profile ? `${profile.full_name} · ${profile.roll_number} · ${profile.branch}` : "Search books and manage borrow requests"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowMine((v) => !v)} className="text-sm bg-white/15 hover:bg-white/25 px-3 py-2 rounded-md transition">
              My requests {myRequests.length > 0 && <span className="ml-1 bg-white/25 rounded px-1.5">{myRequests.length}</span>}
            </button>
            <Link to="/student/profile" className="inline-flex items-center gap-2 text-sm bg-white/15 hover:bg-white/25 px-3 py-2 rounded-md transition">
              <UserCircle className="w-4 h-4" /> Profile
            </Link>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 text-sm bg-white/15 hover:bg-white/25 px-3 py-2 rounded-md transition">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {showMine && (
          <Card className="p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">My borrow requests</h2>
              {!identifier && <p className="text-sm text-muted-foreground">Submit a request to start tracking.</p>}
            </div>
            {identifier && myRequests.length === 0 && (
              <p className="text-sm text-muted-foreground">No requests yet for {identifier}.</p>
            )}
            <div className="grid gap-2">
              {myRequests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm border rounded-md p-3">
                  <div className="min-w-0">
                    <p className="font-medium">{r.book?.name ?? "Book"}</p>
                    <p className="text-muted-foreground">
                      Requested {new Date(r.requested_at).toLocaleDateString()}
                      {r.due_date ? ` · Due ${new Date(r.due_date).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by book name or author…"
            className="pl-12 h-14 text-base shadow-sm"
          />
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading books…</p>
        ) : results.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No books match your search.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((b) => {
              const available = b.available_copies > 0;
              return (
                <Card key={b.id} className="p-5 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="text-lg font-semibold leading-tight">{b.name}</h3>
                      {b.author && <p className="text-sm text-muted-foreground">{b.author}</p>}
                    </div>
                    <Badge variant={available ? "default" : "destructive"}>
                      {available ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-3">
                    <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> Rack {b.rack_number}</span>
                    {b.branch && <span>Branch: {b.branch}</span>}
                    <span>{b.available_copies} / {b.total_copies} copies</span>
                  </div>
                  <div className="mt-4">
                    <Button
                      size="sm"
                      disabled={!available}
                      onClick={() => setRequesting(b)}
                      className="gap-2"
                    >
                      <BookPlus className="w-4 h-4" />
                      {available ? "Request to borrow" : "Unavailable"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {requesting && (
        <RequestModal
          book={requesting}
          defaultName={studentName}
          defaultId={identifier}
          onClose={() => setRequesting(null)}
          onSubmit={submitRequest}
        />
      )}

      <LibraryBot />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: "default" | "secondary" | "destructive" | "outline" =
    status === "approved" ? "default"
    : status === "pending" ? "secondary"
    : status === "rejected" ? "destructive"
    : "outline";
  return <Badge variant={variant} className="capitalize">{status}</Badge>;
}

function RequestModal({
  book, defaultName, defaultId, onClose, onSubmit,
}: {
  book: Book;
  defaultName: string;
  defaultId: string;
  onClose: () => void;
  onSubmit: (name: string, id: string, notes: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [id, setId] = useState(defaultId);
  const [notes, setNotes] = useState("");
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Borrow request</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">For: <span className="font-medium text-foreground">{book.name}</span></p>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium mb-1 block">Your name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </label>
          <label className="block">
            <span className="text-sm font-medium mb-1 block">Roll number / Email</span>
            <Input value={id} onChange={(e) => setId(e.target.value)} maxLength={120} />
          </label>
          <label className="block">
            <span className="text-sm font-medium mb-1 block">Notes (optional)</span>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <Button onClick={() => onSubmit(name, id, notes)} className="flex-1">Submit request</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </Card>
    </div>
  );
}
