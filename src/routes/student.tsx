import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search, ArrowLeft, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchBooks, type Book } from "@/lib/library";

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
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooks().then((b) => { setBooks(b); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      (b.author ?? "").toLowerCase().includes(q)
    );
  }, [books, query]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b" style={{ background: "var(--gradient-hero)" }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-primary-foreground">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Smart AI Library</h1>
              <p className="text-sm text-primary-foreground/85">Student dashboard</p>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm bg-white/15 hover:bg-white/25 px-3 py-2 rounded-md transition">
            <ArrowLeft className="w-4 h-4" /> Logout
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by book name, ID, or author…"
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
                    <span className="font-mono px-2 py-0.5 rounded bg-muted">{b.book_id}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4" /> Rack {b.rack_number}</span>
                    <span>{b.available_copies} / {b.total_copies} copies</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
