// Edge Function: admin-reset-mfa
// Clears a user's two-factor (authenticator app) setup when they lose their phone.
// They set it up again on next sign-in. Deploy: supabase functions deploy admin-reset-mfa
import { caller, cors, json, serviceClient, url } from "../_shared/common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    const me = await caller(req);
    if (!me) return json(req, { error: "Not signed in (or two-factor not completed)" }, 401);
    if (me.profile.role !== "admin") return json(req, { error: "Admin access required" }, 403);

    const { user_id } = await req.json();
    if (!user_id) return json(req, { error: "user_id is required" }, 400);

    const admin = serviceClient();
    const { data, error } = await admin.auth.admin.getUserById(user_id);
    if (error || !data?.user) return json(req, { error: "Account not found" }, 404);

    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let removed = 0;
    for (const f of data.user.factors || []) {
      const r = await fetch(`${url()}/auth/v1/admin/users/${user_id}/factors/${f.id}`, {
        method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (r.ok) removed++;
    }
    return json(req, { removed, message: removed ? `Two-factor reset. They'll set it up again next sign-in.` : "No two-factor setup found on this account." });
  } catch (e) {
    console.error(e);
    return json(req, { error: "Unexpected error: " + ((e as Error)?.message || e) }, 500);
  }
});
