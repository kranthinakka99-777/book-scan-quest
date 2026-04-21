import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookOpen, GraduationCap, Briefcase, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart AI Library — Login" },
      { name: "description", content: "Smart AI Library: search books, manage racks, and track availability with QR scanning." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();

  const select = (role: "student" | "employee") => {
    localStorage.setItem("library_role", role);
    navigate({ to: role === "student" ? "/student" : "/employee" });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10 text-primary-foreground">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm mb-5 text-sm">
            <Sparkles className="w-4 h-4" />
            <span>AI-powered catalog</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight flex items-center justify-center gap-3">
            <BookOpen className="w-12 h-12" />
            Smart AI Library
          </h1>
          <p className="mt-4 text-lg text-primary-foreground/85">Choose how you want to sign in</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <button onClick={() => select("student")} className="text-left group">
            <Card className="p-7 h-full transition-all hover:-translate-y-1 hover:shadow-2xl border-2 hover:border-primary">
              <GraduationCap className="w-12 h-12 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h2 className="text-2xl font-semibold mb-2">Student</h2>
              <p className="text-muted-foreground">Search books, check availability and rack number.</p>
            </Card>
          </button>

          <button onClick={() => select("employee")} className="text-left group">
            <Card className="p-7 h-full transition-all hover:-translate-y-1 hover:shadow-2xl border-2 hover:border-accent">
              <Briefcase className="w-12 h-12 text-accent mb-4 group-hover:scale-110 transition-transform" style={{ color: "var(--accent)" }} />
              <h2 className="text-2xl font-semibold mb-2">Book map</h2>
              <p className="text-muted-foreground">Scan QR, manage books, update rack inventory.</p>
            </Card>
          </button>
        </div>
      </div>
    </div>
  );
}
