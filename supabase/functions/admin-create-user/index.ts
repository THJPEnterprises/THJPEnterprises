// Edge Function: admin-create-user
// Creates a stockist (or admin) account with a temporary password set by an admin,
// fills in their profile and (if email is set up) sends them a welcome email.
// Called from portal/admin.html. Deploy: supabase functions deploy admin-create-user
import { caller, cors, esc, emailShell, json, PORTAL_URL, sendEmail, serviceClient } from "../_shared/common.ts";

const STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT", "NZ"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    const me = await caller(req);
    if (!me) return json(req, { error: "Not signed in (or two-factor not completed)" }, 401);
    if (me.profile.role !== "admin") return json(req, { error: "Admin access required" }, 403);

    const b = await req.json();
    const email = String(b.email || "").trim().toLowerCase();
    const password = String(b.password || "");
    if (!email || !password) return json(req, { error: "Email and temporary password are required" }, 400);
    if (password.length < 10) return json(req, { error: "Temporary password must be at least 10 characters" }, 400);
    const role = b.role === "admin" ? "admin" : "stockist";
    const state = b.state ? String(b.state) : null;
    if (state && !STATES.includes(state)) return json(req, { error: "Invalid state" }, 400);
    const tier = Number(b.tier || 1);

    const admin = serviceClient();
    const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) return json(req, { error: "Could not create account: " + error.message }, 400);

    const { error: upErr } = await admin.from("profiles").update({
      business_name: b.business_name || null,
      contact_name: b.contact_name || null,
      phone: b.phone || null,
      role, tier, state, region: b.region || null,
      approved: b.approved !== false,
    }).eq("id", created.user.id);
    if (upErr) return json(req, { error: "Account created but profile update failed: " + upErr.message }, 500);

    if (b.send_welcome !== false) {
      await sendEmail(email, "Your THJP Enterprises stockist portal account", emailShell("Welcome to the stockist portal", `
        <p>Hi ${esc(b.contact_name || b.business_name || "there")},</p>
        <p>Your THJP Enterprises stockist portal account is ready. You can now see your trade pricing, place orders on account and download dealer resources.</p>
        <p><a href="${PORTAL_URL()}login.html" style="display:inline-block;background:#D6A93D;color:#0A1711;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:bold">Sign in to the portal</a></p>
        <p>Sign in with <b>${esc(email)}</b> and the temporary password we gave you. On your first sign-in you'll set up two-factor authentication with an authenticator app (such as Google Authenticator or Microsoft Authenticator).</p>
        <p>For security, this email does not contain your password. If you don't have it, reply to this email.</p>`));
    }
    return json(req, { id: created.user.id, email });
  } catch (e) {
    console.error(e);
    return json(req, { error: "Unexpected error: " + ((e as Error)?.message || e) }, 500);
  }
});
