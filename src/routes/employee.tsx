import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, ArrowLeft, QrCode, Plus, Pencil, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { fetchBooks, upsertBook, deleteBook, findBookByBookId, type Book } from "@/lib/library";
import { QrScanner } from "@/components/QrScanner";

export const Route = createFileRoute("/employee")({
  head: () => ({
    meta: [
      { title: "Employee Dashboard — Smart AI Library" },
      { name: "description", content: "Manage books, scan QR codes, and update rack inventory." },
    ],
  }),
  component: EmployeeDashboard,
});

type FormState = {
  id?: string;
  book_id: string;
  name: string;
  author: string;
  rack_number: number;
  total_copies: number;
  available_copies: number;
};

const empty: FormState = { book_id: "", name: "", author: "", rack_number: 1, total_copies: 1, available_copies: 1 };

function EmployeeDashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [rack, setRack] = useState<number | "all">("all");
  const [editing, setEditing] = useState<FormState | null>(null);
  const [scanning, setScanning] = useState(false);

  const reload = () => fetchBooks().then(setBooks).catch((e) => toast.error(e.message));

  useEffect(() => { reload(); }, []);

  const visible = rack === "all" ? books : books.filter((b) => b.rack_number === rack);

  const startEdit = (b: Book) => setEditing({
    id: b.id, book_id: b.book_id, name: b.name, author: b.author ?? "",
    rack_number: b.rack_number, total_copies: b.total_copies, available_copies: b.available_copies,
  });

  const startNew = (preset?: Partial<FormState>) => setEditing({ ...empty, rack_number: rack === "all" ? 1 : rack, ...preset });

  const onScan = async (text: string) => {
    setScanning(false);
    const code = text.trim();
    try {
      const existing = await findBookByBookId(code);
      if (existing) { startEdit(existing); toast.success(`Found ${existing.name}`); }
      else { startNew({ book_id: code }); toast.info("New book — fill in details"); }
    } catch (e: any) { toast.error(e.message); }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.book_id.trim() || !editing.name.trim()) { toast.error("Book ID and Name are required"); return; }
    if (editing.available_copies > editing.total_copies) { toast.error("Available cannot exceed total"); return; }
    try {
      await upsertBook({
        id: editing.id,
        book_id: editing.book_id.trim(),
        name: editing.name.trim(),
        author: editing.author.trim() || null,
        rack_number: Number(editing.rack_number),
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

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b" style={{ background: "var(--gradient-hero)" }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-primary-foreground">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Smart AI Library</h1>
              <p className="text-sm text-primary-foreground/85">Employee dashboard</p>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm bg-white/15 hover:bg-white/25 px-3 py-2 rounded-md transition">
            <ArrowLeft className="w-4 h-4" /> Logout
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
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
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted">{b.book_id}</span>
                  <h3 className="font-semibold">{b.name}</h3>
                  <Badge variant={b.available_copies > 0 ? "default" : "destructive"}>
                    {b.available_copies}/{b.total_copies}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{b.author ?? "—"} · Rack {b.rack_number}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(b)}><Pencil className="w-4 h-4" /></Button>
                <Button size="sm" variant="outline" onClick={() => remove(b)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </Card>
          ))}
          {visible.length === 0 && <p className="text-center text-muted-foreground py-8">No books in this rack.</p>}
        </div>
      </main>

      {scanning && <QrScanner onScan={onScan} onClose={() => setScanning(false)} />}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editing.id ? "Edit book" : "Add book"}</h3>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <Field label="Book ID"><Input value={editing.book_id} onChange={(e) => setEditing({ ...editing, book_id: e.target.value })} /></Field>
              <Field label="Name"><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Author"><Input value={editing.author} onChange={(e) => setEditing({ ...editing, author: e.target.value })} /></Field>
              <Field label="Rack number (1–10)">
                <Input type="number" min={1} max={10} value={editing.rack_number}
                  onChange={(e) => setEditing({ ...editing, rack_number: Number(e.target.value) })} />
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
