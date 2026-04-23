import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/owner-verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { password } = (await request.json()) as { password?: string };
          const expected = process.env.OWNER_PASSWORD;
          if (!expected) {
            return new Response(JSON.stringify({ ok: false, error: "Owner password not configured" }), {
              status: 500, headers: { "Content-Type": "application/json" },
            });
          }
          if (typeof password !== "string" || password.length === 0 || password.length > 200) {
            return new Response(JSON.stringify({ ok: false }), {
              status: 400, headers: { "Content-Type": "application/json" },
            });
          }
          // Constant-time-ish comparison
          const a = new TextEncoder().encode(password);
          const b = new TextEncoder().encode(expected);
          let mismatch = a.length !== b.length ? 1 : 0;
          const len = Math.min(a.length, b.length);
          for (let i = 0; i < len; i++) mismatch |= a[i] ^ b[i];
          const ok = mismatch === 0;
          return new Response(JSON.stringify({ ok }), {
            status: ok ? 200 : 401,
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          return new Response(JSON.stringify({ ok: false }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
