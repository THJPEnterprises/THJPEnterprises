// Shared helpers for THJP portal Edge Functions.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

// Only these sites may call the functions from a browser.
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ||
  "https://thjpenterprises.com,https://www.thjpenterprises.com").split(",").map((s) => s.trim());

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });
}

export const url = () => Deno.env.get("SUPABASE_URL")!;
export const serviceClient = () => createClient(url(), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

/** Returns the caller's user + profile, using THEIR token (so RLS/2FA rules apply). */
export async function caller(req: Request): Promise<{ user: { id: string; email?: string }; profile: Record<string, unknown> } | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const client: SupabaseClient = createClient(url(), Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  // profiles RLS requires a 2FA-verified session, so this also enforces 2FA
  const { data: profile } = await client.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return null;
  return { user, profile };
}

/** Sends an email through Resend. Silently skipped if RESEND_API_KEY isn't set. */
export async function sendEmail(to: string | string[], subject: string, html: string, replyTo?: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { skipped: true };
  const from = Deno.env.get("EMAIL_FROM") || "THJP Enterprises <portal@thjpenterprises.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, reply_to: replyTo || Deno.env.get("NOTIFY_EMAIL") || "info@thjpenterprises.com" }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
  return { ok: res.ok };
}

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export const money = (n: unknown) => "$" + Number(n || 0).toFixed(2);

export const PORTAL_URL = () => Deno.env.get("PORTAL_URL") || "https://thjpenterprises.com/portal/";

/** Simple branded email wrapper. */
export function emailShell(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#F2EEE4;font-family:Arial,Helvetica,sans-serif;color:#26302B">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#0A1711;color:#F2EEE4;padding:20px 24px;border-radius:12px 12px 0 0">
      <div style="font-size:12px;letter-spacing:2px;color:#D6A93D">THJP ENTERPRISES · STOCKIST PORTAL</div>
      <div style="font-size:22px;font-weight:bold;margin-top:6px">${esc(title)}</div>
    </div>
    <div style="background:#FAF8F2;padding:24px;border-radius:0 0 12px 12px;border:1px solid #DDD6C6;border-top:0">${bodyHtml}</div>
    <p style="font-size:12px;color:#5C665F;text-align:center;margin-top:16px">THJP Enterprises Pty Ltd · ABN 56 696 226 203 · PO Box 12, Mount Colah NSW 2079</p>
  </div></body></html>`;
}
