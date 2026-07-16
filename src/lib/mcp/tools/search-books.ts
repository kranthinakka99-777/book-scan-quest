import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export default defineTool({
  name: "search_books",
  title: "Search library books",
  description:
    "Search the public library catalog by title, author, or branch. Returns matching books with rack number and availability. Publicly readable data only.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .optional()
      .describe("Optional text to match against title, author, or branch."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return { content: [{ type: "text", text: "Server not configured" }], isError: true };
    }
    const sb = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = sb
      .from("books")
      .select("id, name, author, branch, rack_number, available_copies, total_copies")
      .order("name")
      .limit(limit ?? 20);
    if (query) {
      const like = `%${query}%`;
      q = q.or(`name.ilike.${like},author.ilike.${like},branch.ilike.${like}`);
    }
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const rows = data ?? [];
    const text = rows.length
      ? rows
          .map(
            (b, i) =>
              `${i + 1}. "${b.name}" by ${b.author ?? "Unknown"} — Branch: ${b.branch ?? "N/A"}, Rack ${b.rack_number}, ${b.available_copies}/${b.total_copies} available`,
          )
          .join("\n")
      : "No books matched.";
    return { content: [{ type: "text", text }], structuredContent: { books: rows } };
  },
});