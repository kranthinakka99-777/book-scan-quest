import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, ArrowLeft, Mail, Phone, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { upsertMyProfile, fetchMyProfile } from "@/lib/library";

export const Route = createFileRoute("/student-auth")({
  head: () => ({
    meta: [
      { title: "Student Login — Smart AI Library" },
      { name: "description", content: "Sign in or create a student account with email or phone OTP." },
    ],
  }),
  component: StudentAuthPage,
});

type Mode = "login" | "signup";
type Channel = "email" | "phone";
type Step = "credentials" | "otp" | "details";

function StudentAuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [channel, setChannel] = useState<Channel>("email");
  const [step, setStep] = useState<Step>("credentials");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [branch, setBranch] = useState("");

  // Already signed in? Bounce to /student
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/student" });
    });
  }, [navigate]);

  const identifier = channel === "email" ? email.trim() : phone.trim();

  const resetAll = () => {
    setStep("credentials"); setOtp(""); setPassword("");
  };

  // ---- Login (password) ----
  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) { toast.error("Enter your credentials"); return; }
    setLoading(true);
    try {
      const { error } = channel === "email"
        ? await supabase.auth.signInWithPassword({ email: identifier, password })
        : await supabase.auth.signInWithPassword({ phone: identifier, password });
      if (error) throw error;
      toast.success("Welcome back!");
      navigate({ to: "/student" });
    } catch (err: any) {
      toast.error(err.message ?? "Login failed");
    } finally { setLoading(false); }
  };

  // ---- Signup step 1: send OTP ----
  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) { toast.error(`Enter your ${channel}`); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const { error } = channel === "email"
        ? await supabase.auth.signInWithOtp({
            email: identifier,
            options: { emailRedirectTo: `${window.location.origin}/student` },
          })
        : await supabase.auth.signInWithOtp({ phone: identifier });
      if (error) throw error;
      toast.success(`OTP sent to your ${channel}`);
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message ?? "Could not send OTP");
    } finally { setLoading(false); }
  };

  // ---- Signup step 2: verify OTP, set password, capture details ----
  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) { toast.error("Enter the OTP"); return; }
    setLoading(true);
    try {
      const { data, error } = channel === "email"
        ? await supabase.auth.verifyOtp({ email: identifier, token: otp.trim(), type: "email" })
        : await supabase.auth.verifyOtp({ phone: identifier, token: otp.trim(), type: "sms" });
      if (error) throw error;
      if (!data.user) throw new Error("No user returned from verification");

      // Set password so the student can later log in with credentials
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) throw pwErr;

      // If profile already exists (returning user), skip details
      const existing = await fetchMyProfile(data.user.id);
      if (existing) {
        toast.success("Verified — welcome back");
        navigate({ to: "/student" });
        return;
      }
      toast.success("Verified — finish your profile");
      setStep("details");
    } catch (err: any) {
      toast.error(err.message ?? "Verification failed");
    } finally { setLoading(false); }
  };

  // ---- Signup step 3: save profile ----
  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !rollNumber.trim() || !branch.trim()) {
      toast.error("All fields are required"); return;
    }
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) throw new Error("Session expired — please sign up again");
      await upsertMyProfile({
        user_id: user.id,
        full_name: fullName.trim().slice(0, 100),
        roll_number: rollNumber.trim().slice(0, 40),
        branch: branch.trim().slice(0, 40),
        identifier_type: channel,
        email: channel === "email" ? identifier : null,
        phone: channel === "phone" ? identifier : null,
      });
      toast.success("Profile saved!");
      navigate({ to: "/student" });
    } catch (err: any) {
      toast.error(err.message ?? "Could not save profile");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--gradient-hero)" }}>
      <Toaster />
      <Card className="w-full max-w-md p-7">
        <div className="flex items-center gap-3 mb-1">
          <BookOpen className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold">Student access</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          {mode === "login" ? "Welcome back — log in to continue." : "Create your account in 3 quick steps."}
        </p>

        {/* Mode tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-md mb-4">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); resetAll(); }}
              className={`text-sm py-1.5 rounded ${mode === m ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            >
              {m === "login" ? "Log in" : "Sign up"}
            </button>
          ))}
        </div>

        {/* Channel switch */}
        {step === "credentials" && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => setChannel("email")}
              className={`inline-flex items-center justify-center gap-2 text-sm py-2 rounded border ${channel === "email" ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted"}`}
            ><Mail className="w-4 h-4" /> Email</button>
            <button
              onClick={() => setChannel("phone")}
              className={`inline-flex items-center justify-center gap-2 text-sm py-2 rounded border ${channel === "phone" ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted"}`}
            ><Phone className="w-4 h-4" /> Phone</button>
          </div>
        )}

        {/* LOGIN form */}
        {mode === "login" && (
          <form onSubmit={doLogin} className="space-y-3">
            {channel === "email" ? (
              <Field label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" />
              </Field>
            ) : (
              <Field label="Phone (with country code)">
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+911234567890" />
              </Field>
            )}
            <Field label="Password">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Logging in…" : "Log in"}
            </Button>
          </form>
        )}

        {/* SIGNUP — credentials step */}
        {mode === "signup" && step === "credentials" && (
          <form onSubmit={sendOtp} className="space-y-3">
            {channel === "email" ? (
              <Field label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" />
              </Field>
            ) : (
              <Field label="Phone (with country code)">
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+911234567890" />
              </Field>
            )}
            <Field label="Set a password (min 8 chars)">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
            </Field>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending OTP…" : `Send OTP via ${channel}`}
            </Button>
          </form>
        )}

        {/* SIGNUP — OTP step */}
        {mode === "signup" && step === "otp" && (
          <form onSubmit={verifyOtp} className="space-y-3">
            <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> Enter the code we sent to {identifier}
            </p>
            <Field label="OTP code">
              <Input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={10} autoFocus />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Verifying…" : "Verify"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setStep("credentials")}>Back</Button>
            </div>
          </form>
        )}

        {/* SIGNUP — details step */}
        {mode === "signup" && step === "details" && (
          <form onSubmit={saveDetails} className="space-y-3">
            <Field label="Full name">
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
            </Field>
            <Field label="Roll number">
              <Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} maxLength={40} />
            </Field>
            <Field label="Branch (e.g. AIML, CSE, ECE)">
              <Input value={branch} onChange={(e) => setBranch(e.target.value)} maxLength={40} />
            </Field>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving…" : "Finish & enter library"}
            </Button>
          </form>
        )}

        <Link to="/" className="mt-5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-3 h-3" /> Back to role selection
        </Link>
      </Card>
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
