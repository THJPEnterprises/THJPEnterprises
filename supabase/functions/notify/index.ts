// Edge Function: notify
// Sends order emails through Resend:
//  • event "order_placed"   → called by the stockist straight after placing an order:
//                              emails THJP (NOTIFY_EMAIL) and a confirmation to the stockist.
//  • event "status_changed" → called by an admin after updating an order: emails the stockist.
// Deploy: supabase functions deploy notify
import { caller, cors, emailShell, esc, json, money, PORTAL_URL, sendEmail, serviceClient } from "../_shared/common.ts";

const LABEL: Record<string, string> = { submitted: "Submitted", confirmed: "Confirmed", processing: "Processing", shipped: "Shipped", cancelled: "Cancelled" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  try {
    const me = await caller(req);
    if (!me) return json(req, { error: "Not signed in" }, 401);
    const { order_id, event } = await req.json();
    const admin = serviceClient();
    const { data: order } = await admin.from("orders").select("*").eq("id", order_id).single();
    if (!order) return json(req, { error: "Order not found" }, 404);

    const isAdmin = me.profile.role === "admin";
    if (!isAdmin && order.stockist_id !== me.user.id) return json(req, { error: "Not your order" }, 403);

    const { data: stockist } = await admin.from("profiles").select("*").eq("id", order.stockist_id).single();
    const { data: items } = await admin.from("order_items").select("*").eq("order_id", order.id).order("id");
    const rows = (items || []).map((i) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #DDD6C6">${esc(i.brand)} — ${esc(i.product_name)}${i.size ? " (" + esc(i.size) + ")" : ""}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #DDD6C6;text-align:right">${i.qty}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #DDD6C6;text-align:right">${money(i.unit_price_aud)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #DDD6C6;text-align:right">${money(i.line_total_aud)}</td></tr>`).join("");
    const ship = order.shipping_aud == null ? "To be confirmed" : Number(order.shipping_aud) === 0 ? "Free" : money(order.shipping_aud);
    const table = `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
        <tr style="text-align:left;color:#5C665F"><th style="padding:6px 8px">Product</th><th style="padding:6px 8px;text-align:right">Qty</th><th style="padding:6px 8px;text-align:right">Unit</th><th style="padding:6px 8px;text-align:right">Total</th></tr>${rows}</table>
      <p style="text-align:right;margin:4px 0">Products (inc. GST): <b>${money(order.total_inc_gst_aud)}</b><br>GST included: ${money(order.gst_aud)}<br>Shipping: ${ship}</p>`;
    const who = esc(stockist?.business_name || stockist?.email);
    const notifyTo = Deno.env.get("NOTIFY_EMAIL") || "info@thjpenterprises.com";

    if (event === "order_placed") {
      if (order.stockist_id !== me.user.id) return json(req, { error: "Only the stockist triggers this" }, 403);
      // Don't send twice for the same order
      if (Date.now() - new Date(order.created_at).getTime() > 10 * 60 * 1000) return json(req, { skipped: "too old" });
      await sendEmail(notifyTo, `New order ${order.order_number} — ${stockist?.business_name || stockist?.email}`, emailShell(`New order ${order.order_number}`, `
        <p><b>${who}</b> (${esc(stockist?.email)}${stockist?.state ? ", " + esc(stockist.state) : ""}) placed an order.</p>
        <p>PO number: <b>${esc(order.po_number)}</b> · Tier ${order.tier} · ${order.total_qty} units</p>${table}
        ${order.notes ? `<p><b>Notes:</b> ${esc(order.notes)}</p>` : ""}
        <p><a href="${PORTAL_URL()}admin.html">Open in the admin dashboard</a></p>`), stockist?.email);
      await sendEmail(stockist.email, `Order received — ${order.order_number}`, emailShell(`Thanks — we've received your order`, `
        <p>Hi ${who},</p><p>We've received order <b>${esc(order.order_number)}</b> (your PO ${esc(order.po_number)}). We'll confirm shipping and dispatch shortly.</p>${table}
        <p><a href="${PORTAL_URL()}orders.html">View your orders</a></p>`));
      return json(req, { sent: true });
    }

    if (event === "status_changed") {
      if (!isAdmin) return json(req, { error: "Admin only" }, 403);
      await sendEmail(stockist.email, `Order ${order.order_number}: ${LABEL[order.status] || order.status}`, emailShell(`Order ${order.order_number} is ${(LABEL[order.status] || order.status).toLowerCase()}`, `
        <p>Hi ${who},</p><p>Your order <b>${esc(order.order_number)}</b> (PO ${esc(order.po_number)}) is now <b>${esc(LABEL[order.status] || order.status)}</b>.</p>
        ${order.tracking ? `<p>Tracking: <b>${esc(order.tracking)}</b></p>` : ""}${table}
        <p><a href="${PORTAL_URL()}orders.html">View your orders</a></p>`));
      return json(req, { sent: true });
    }
    return json(req, { error: "Unknown event" }, 400);
  } catch (e) {
    console.error(e);
    return json(req, { error: "Unexpected error: " + ((e as Error)?.message || e) }, 500);
  }
});
