import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ChatMsg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/api/library-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages } = (await request.json()) as { messages: ChatMsg[] };
          if (!Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: "messages must be an array" }), {
              status: 400, headers: { "Content-Type": "application/json" },
            });
          }

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "AI is not configured" }), {
              status: 500, headers: { "Content-Type": "application/json" },
            });
          }

          // Pull live catalog so the bot answers from real data
          const { data: books, error } = await supabaseAdmin
            .from("books")
            .select("name, author, branch, rack_number, available_copies, total_copies")
            .order("name");
          if (error) throw error;

          const catalog = (books ?? [])
            .map((b, i) =>
              `${i + 1}. "${b.name}" by ${b.author ?? "Unknown"} — Branch: ${b.branch ?? "N/A"}, Rack ${b.rack_number}, ${b.available_copies}/${b.total_copies} available`
            )
            .join("\n");

          const systemPrompt = `You are LibraryBot, a friendly assistant for the Smart AI Library.
Help students decide which book to borrow based on the topics, branch, or subject they care about.
Only recommend books from the live catalog below. If a topic is not covered, say so honestly and suggest the closest matches.
For each recommendation, mention: title, author, branch, rack number, and availability.
Keep responses short (max 5 books per reply) and use bullet points.

LIVE CATALOG (${(books ?? []).length} books):
${catalog || "(catalog is empty)"}
`;

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "system", content: systemPrompt }, ...messages],
            }),
          });

          if (!aiRes.ok) {
            if (aiRes.status === 429) {
              return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }), {
                status: 429, headers: { "Content-Type": "application/json" },
              });
            }
            if (aiRes.status === 402) {
              return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
                status: 402, headers: { "Content-Type": "application/json" },
              });
            }
            const t = await aiRes.text();
            console.error("AI gateway error:", aiRes.status, t);
            return new Response(JSON.stringify({ error: "AI service error" }), {
              status: 500, headers: { "Content-Type": "application/json" },
            });
          }

          const data = await aiRes.json();
          const reply = data?.choices?.[0]?.message?.content ?? "Sorry, I couldn't think of a reply.";
          return new Response(JSON.stringify({ reply }), {
            status: 200, headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("library-chat error:", e);
          return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
