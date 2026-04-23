import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const STARTER: Msg = {
  role: "assistant",
  content:
    "Hi! I'm LibraryBot 📚 Tell me what topic, subject, or branch you're interested in (e.g. \"machine learning\", \"signals for ECE\", \"data structures\") and I'll suggest books from our library.",
};

export function LibraryBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([STARTER]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/library-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Send only conversation turns (skip the static starter)
          messages: next.slice(1).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Bot is unavailable");
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I'm having trouble right now. Please try again." }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply as string }]);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full px-4 py-3 text-primary-foreground shadow-lg hover:scale-105 transition-transform"
        style={{ background: "var(--gradient-hero)" }}
      >
        <Sparkles className="w-5 h-5" />
        <span className="font-medium">Ask LibraryBot</span>
      </button>
    );
  }

  return (
    <Card className="fixed bottom-5 right-5 z-40 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-2rem))] flex flex-col shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center gap-2 text-primary-foreground">
          <Bot className="w-5 h-5" />
          <div>
            <p className="font-semibold leading-tight">LibraryBot</p>
            <p className="text-xs text-primary-foreground/80 leading-tight">Find your next read</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="text-primary-foreground/90 hover:text-primary-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/30">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-background border rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-background border rounded-2xl rounded-bl-sm px-3 py-2 text-sm inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="Ask about a topic or subject…"
          disabled={loading}
        />
        <Button onClick={send} disabled={loading || !input.trim()} size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
