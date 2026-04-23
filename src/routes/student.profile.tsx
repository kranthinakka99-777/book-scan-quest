import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Clock, CheckCircle2, XCircle, RotateCcw, LogOut, Mail, Phone, Hash, GraduationCap, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile, fetchMyRequests, type StudentProfile, type BorrowRequestWithBook } from "@/lib/library";

export const Route = createFileRoute("/student/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — Smart AI Library" },
      { name: "description", content: "View your student profile and borrow activity timeline." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [requests, setRequests] = useState<BorrowRequestWithBook[]>([]);
  const [loading, setLoading] = useState(true);

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
        const id = p.identifier_type === "email" ? p.email ?? "" : p.phone ?? "";
        if (id) {
          const r = await fetchMyRequests(id);
          setRequests(r);
        }
      } catch { /* ignore */ }
      setAuthChecked(true);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [navigate]);

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending").length;
    const approved = requests.filter((r) => r.status === "approved").length;
    const returned = requests.filter((r) => r.status === "returned").length;
    const rejected = requests.filter((r) => r.status === "rejected").length;
    return { pending, approved, returned, rejected, total: requests.length };
  }, [requests]);

  const events = useMemo(() => buildTimeline(requests), [requests]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  if (!authChecked || loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <header className="border-b" style={{ background: "var(--gradient-hero)" }}>
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-primary-foreground">
          <div className="flex items-center gap-3">
            <BookOpen className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">My Profile</h1>
              <p className="text-sm text-primary-foreground/85">Activity & borrowing history</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/student" className="inline-flex items-center gap-2 text-sm bg-white/15 hover:bg-white/25 px-3 py-2 rounded-md transition">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 text-sm bg-white/15 hover:bg-white/25 px-3 py-2 rounded-md transition">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Profile card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold shrink-0">
              {profile?.full_name?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold">{profile?.full_name}</h2>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2"><Hash className="w-4 h-4" /> Roll: <span className="text-foreground font-medium">{profile?.roll_number}</span></span>
                <span className="inline-flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Branch: <span className="text-foreground font-medium">{profile?.branch}</span></span>
                {profile?.email && <span className="inline-flex items-center gap-2"><Mail className="w-4 h-4" /> {profile.email}</span>}
                {profile?.phone && <span className="inline-flex items-center gap-2"><Phone className="w-4 h-4" /> {profile.phone}</span>}
                <span className="inline-flex items-center gap-2"><User className="w-4 h-4" /> Joined {profile ? new Date(profile.created_at).toLocaleDateString() : ""}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Pending" value={stats.pending} tone="secondary" />
          <StatCard label="Approved" value={stats.approved} tone="default" />
          <StatCard label="Returned" value={stats.returned} tone="outline" />
          <StatCard label="Rejected" value={stats.rejected} tone="destructive" />
        </div>

        {/* Timeline */}
        <Card className="p-6">
          <h3 className="font-semibold mb-5 flex items-center gap-2"><Clock className="w-5 h-5" /> Recent activity</h3>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet. Borrow a book to get started.</p>
          ) : (
            <ol className="relative border-l-2 border-border pl-6 space-y-6">
              {events.map((e, idx) => (
                <li key={idx} className="relative">
                  <span className={`absolute -left-[31px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-background ${e.dot}`}>
                    {e.icon}
                  </span>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium leading-tight">{e.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{e.bookName}</p>
                      {e.detail && <p className="text-xs text-muted-foreground mt-1">{e.detail}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString()}</p>
                      {e.badge}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="text-center">
          <Button asChild variant="outline">
            <Link to="/student">Browse catalog</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "default" | "secondary" | "destructive" | "outline" }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-end justify-between mt-1">
        <p className="text-2xl font-bold">{value}</p>
        {tone && <Badge variant={tone} className="capitalize">{label}</Badge>}
      </div>
    </Card>
  );
}

type TimelineEvent = {
  at: string;
  title: string;
  bookName: string;
  detail?: string;
  icon: JSX.Element;
  dot: string;
  badge?: JSX.Element;
};

function buildTimeline(requests: BorrowRequestWithBook[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const r of requests) {
    const bookName = r.book?.name ?? "Book";
    events.push({
      at: r.requested_at,
      title: "Requested to borrow",
      bookName,
      detail: r.notes ? `Note: ${r.notes}` : undefined,
      icon: <BookOpen className="w-3 h-3 text-white" />,
      dot: "bg-primary",
      badge: <Badge variant="secondary" className="mt-1">Requested</Badge>,
    });
    if (r.decided_at && r.status !== "pending") {
      const approved = r.status === "approved" || r.status === "returned";
      events.push({
        at: r.decided_at,
        title: approved ? "Approved by librarian" : "Rejected",
        bookName,
        detail: r.due_date && approved ? `Due ${new Date(r.due_date).toLocaleDateString()}` : undefined,
        icon: approved ? <CheckCircle2 className="w-3 h-3 text-white" /> : <XCircle className="w-3 h-3 text-white" />,
        dot: approved ? "bg-green-600" : "bg-destructive",
        badge: <Badge variant={approved ? "default" : "destructive"} className="mt-1 capitalize">{approved ? "Approved" : "Rejected"}</Badge>,
      });
    }
    if (r.returned_at) {
      events.push({
        at: r.returned_at,
        title: "Book returned",
        bookName,
        icon: <RotateCcw className="w-3 h-3 text-white" />,
        dot: "bg-muted-foreground",
        badge: <Badge variant="outline" className="mt-1">Returned</Badge>,
      });
    }
  }
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
