/* THJP Enterprises — Stockist Portal core
   Shared by every page in /portal/. Talks to THJP's own Supabase project
   (set in js/portal-config.js). If no project is configured yet, adding
   ?demo=1 to the address runs the portal with sample data so it can be
   previewed — nothing is saved anywhere except this browser tab. */
(function () {
  'use strict';
  var cfg = window.THJP_PORTAL || {};
  var configured = !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  var demo = false;
  var localPreview = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (!configured && localPreview) {
    try {
      if (/[?&]demo=1/.test(location.search) || location.protocol === 'file:') sessionStorage.setItem('thjp_demo', '1');
      demo = sessionStorage.getItem('thjp_demo') === '1';
    } catch (e) { demo = /[?&]demo=1/.test(location.search) || location.protocol === 'file:'; }
  }
  var sb = configured && window.supabase ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY) : null;

  /* ─────────────── helpers ─────────────── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function date(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function toast(msg, type) {
    var stack = $('#toast-stack');
    if (!stack) { stack = document.createElement('div'); stack.id = 'toast-stack'; document.body.appendChild(stack); }
    var t = document.createElement('div');
    t.className = 'toast ' + (type === 'error' ? 'toast-error' : 'toast-ok');
    t.setAttribute('role', type === 'error' ? 'alert' : 'status');
    t.textContent = msg;
    stack.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, 4800);
  }
  function tierPrice(rrp, pct) { return rrp == null ? null : Math.round(Number(rrp) * (1 - Number(pct) / 100) * 100) / 100; }
  function groupBy(list, key) {
    var out = {}, order = [];
    list.forEach(function (x) { var k = x[key] || 'Other'; if (!out[k]) { out[k] = []; order.push(k); } out[k].push(x); });
    return order.map(function (k) { return { key: k, items: out[k] }; });
  }
  var STATUS = { submitted: 'Submitted', confirmed: 'Confirmed', processing: 'Processing', shipped: 'Shipped', cancelled: 'Cancelled' };
  function statusChip(s) { return '<span class="st st-' + esc(s) + '">' + esc(STATUS[s] || s) + '</span>'; }
  function unwrap(res) { if (res.error) throw res.error; return res.data; }

  /* ─────────────── demo data (preview only) ─────────────── */
  var D = (function () {
    var KEY = 'thjp_demo_db';
    var seed = {
      me: 'u-admin',
      aal: 'aal1', enrolled: false, signedIn: false,
      tiers: [
        { tier: 1, label: 'Tier 1', discount_pct: 35, min_order_qty: 10, free_shipping: false, benefits: 'Entry-level wholesale pricing.\nMinimum order 10 units (any mix of products).\nShipping quoted per order.' },
        { tier: 2, label: 'Tier 2', discount_pct: 40, min_order_qty: 25, free_shipping: false, benefits: 'Higher-volume wholesale pricing.\nMinimum order 25 units (any mix of products).\nShipping quoted per order.' },
        { tier: 3, label: 'Gold', discount_pct: 45, min_order_qty: 50, free_shipping: true, benefits: 'High-volume wholesale pricing.\nMinimum order 50 units (any mix of products).\nFree shipping on every order.' },
        { tier: 4, label: 'Platinum', discount_pct: 50, min_order_qty: 100, free_shipping: true, benefits: 'Our top wholesale tier, reviewed by our team.\nMinimum order 100 units.\nFree shipping and priority dispatch.\nEarly access to new brands and limited runs.' }
      ],
      profiles: [
        { id: 'u-admin', email: 'info@thjpenterprises.com', business_name: 'THJP Enterprises', contact_name: 'Plummo', role: 'admin', approved: true, tier: 4, state: 'NSW', region: 'Hornsby Shire', created_at: '2026-11-01T01:00:00Z' },
        { id: 'u-1', email: 'orders@northshoretimber.example', business_name: 'North Shore Timber Supplies', contact_name: 'Sam', role: 'stockist', approved: true, tier: 3, state: 'NSW', region: 'Northern Sydney', created_at: '2026-11-02T01:00:00Z' },
        { id: 'u-2', email: 'hello@turnerstools.example', business_name: "Turner's Tools Geelong", contact_name: 'Alex', role: 'stockist', approved: false, tier: 1, state: 'VIC', region: 'Geelong', created_at: '2026-11-04T23:00:00Z' }
      ],
      products: [
        { id: 1, brand: "Vinnie's Oil", sku: 'VO-UPO-270', product_name: 'Ultra Penetrating Oil (UPO)', size: '270ml', rrp_aud: 89.95, has_sizes: false, available_sizes: null, active: true, sort_order: 10 },
        { id: 2, brand: "Vinnie's Oil", sku: 'VO-UPO-DARK-270', product_name: 'UPO — Rustic Dark', size: '270ml', rrp_aud: 89.95, has_sizes: false, active: true, sort_order: 20 },
        { id: 3, brand: "Vinnie's Oil", sku: 'VO-ETERNAL-270', product_name: 'Eternal Seal', size: '270ml', rrp_aud: 98.95, has_sizes: false, active: true, sort_order: 30 },
        { id: 4, brand: "Vinnie's Oil", sku: 'VO-UNI-270', product_name: 'Universal Monocoat (UNI)', size: '270ml', rrp_aud: 89.95, has_sizes: false, active: true, sort_order: 40 },
        { id: 5, brand: "Vinnie's Oil", sku: 'VO-HARDWAX-270', product_name: 'Hard Wax', size: '270ml', rrp_aud: 89.95, has_sizes: false, active: true, sort_order: 50 },
        { id: 6, brand: "Vinnie's Oil", sku: 'VO-BUNDLE-UPO-ES', product_name: 'Bundle — UPO + Eternal Seal', size: '2 × 270ml', rrp_aud: 188.90, has_sizes: false, active: true, sort_order: 70 },
        { id: 7, brand: "Vinnie's Oil", sku: 'VO-TEE', product_name: "Vinnie's Oil T-Shirt", size: null, rrp_aud: 39.95, has_sizes: true, available_sizes: 'S,M,L,XL,XXL', active: true, sort_order: 100 },
        { id: 8, brand: 'Group range', sku: 'GR-PEN-SLIM', product_name: 'Slimline pen kit (sample item)', size: '10 pack', rrp_aud: 49.95, has_sizes: false, active: true, sort_order: 10 },
        { id: 9, brand: 'Group range', sku: 'GR-BLANK-MIX', product_name: 'Australian native pen blanks (sample item)', size: '20 pack', rrp_aud: 69.95, has_sizes: false, active: true, sort_order: 20 }
      ],
      resources: [
        { id: 1, title: 'UPO — Safety Data Sheet', description: 'Ultra Penetrating Oil 270ml', brand: "Vinnie's Oil", category: 'sds', file_path: '#' },
        { id: 2, title: 'Trade price list (PDF)', description: 'Current wholesale price list', brand: null, category: 'price-list', file_path: '#' },
        { id: 3, title: 'Point-of-sale kit', description: 'Shelf talkers, posters and logos', brand: "Vinnie's Oil", category: 'marketing', file_path: '#' },
        { id: 4, title: 'UPO hero shot', description: '', brand: "Vinnie's Oil", category: 'product-images', file_path: '../images/web/upo.jpg' },
        { id: 5, title: 'Range on log', description: '', brand: "Vinnie's Oil", category: 'product-images', file_path: '../images/web/vinnies-range-log.jpg' },
        { id: 6, title: 'Tower on black', description: '', brand: "Vinnie's Oil", category: 'product-images', file_path: '../images/web/vinnies-tower-black.jpg' }
      ],
      orders: [
        { id: 1, order_number: 'THJP-01001', stockist_id: 'u-1', po_number: 'NST-4471', status: 'shipped', tier: 3, total_qty: 60, total_inc_gst_aud: 2968.35, gst_aud: 269.85, shipping_aud: 0, tracking: 'AusPost 7XZ123456', notes: '', created_at: '2026-11-03T02:14:00Z', updated_at: '2026-11-04T05:00:00Z', admin_notes: 'Paid 4 Nov' },
        { id: 2, order_number: 'THJP-01002', stockist_id: 'u-1', po_number: 'NST-4480', status: 'submitted', tier: 3, total_qty: 52, total_inc_gst_aud: 2632.09, gst_aud: 239.28, shipping_aud: 0, tracking: null, notes: 'Please deliver before Friday', created_at: '2026-11-05T00:40:00Z', updated_at: '2026-11-05T00:40:00Z', admin_notes: '' }
      ],
      items: [
        { id: 1, order_id: 1, brand: "Vinnie's Oil", sku: 'VO-UNI-270', product_name: 'Universal Monocoat (UNI) · 270ml', size: null, unit_price_aud: 49.47, qty: 40, line_total_aud: 1978.80 },
        { id: 2, order_id: 1, brand: "Vinnie's Oil", sku: 'VO-HARDWAX-270', product_name: 'Hard Wax · 270ml', size: null, unit_price_aud: 49.47, qty: 20, line_total_aud: 989.40 },
        { id: 3, order_id: 2, brand: "Vinnie's Oil", sku: 'VO-UPO-270', product_name: 'Ultra Penetrating Oil (UPO) · 270ml', size: null, unit_price_aud: 49.47, qty: 48, line_total_aud: 2374.56 },
        { id: 4, order_id: 2, brand: "Vinnie's Oil", sku: 'VO-TEE', product_name: "Vinnie's Oil T-Shirt", size: 'L', unit_price_aud: 21.97, qty: 4, line_total_aud: 87.88 }
      ]
    };
    function load() { try { var s = sessionStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) {} return JSON.parse(JSON.stringify(seed)); }
    var db = load();
    function save() { try { sessionStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
    function wait(v) { return new Promise(function (r) { setTimeout(function () { r(v); }, 120); }); }
    function me() { return db.profiles.find(function (p) { return p.id === db.me; }); }
    function nextId(list) { return list.reduce(function (m, x) { return Math.max(m, x.id); }, 0) + 1; }
    return { db: db, save: save, wait: wait, me: me, nextId: nextId };
  })();

  /* ─────────────── API (real Supabase or demo) ─────────────── */
  var api = {};
  var loginPath = 'login.html';

  api.session = function () {
    if (demo) return D.wait(D.db.signedIn ? { user: { id: D.db.me, email: D.me().email } } : null);
    return sb.auth.getSession().then(function (r) { return r.data.session; });
  };
  api.signIn = function (email, password) {
    if (demo) {
      var acct = D.db.profiles.find(function (p) { return p.email.toLowerCase() === String(email).toLowerCase(); });
      D.db.me = acct ? acct.id : (/admin|info@/i.test(email) ? 'u-admin' : 'u-1');
      D.db.signedIn = true; D.db.aal = 'aal1'; D.save(); return D.wait(true);
    }
    return sb.auth.signInWithPassword({ email: email, password: password }).then(function (r) {
      if (r.error) throw new Error(r.error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : r.error.message);
      return true;
    });
  };
  api.signOut = function () {
    if (demo) { D.db.signedIn = false; D.db.aal = 'aal1'; D.save(); return D.wait(true); }
    return sb.auth.signOut();
  };
  api.resetPassword = function (email) {
    if (demo) return D.wait(true);
    return sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(unwrap);
  };
  api.updatePassword = function (pw) { if (demo) return D.wait(true); return sb.auth.updateUser({ password: pw }).then(unwrap); };
  api.onRecovery = function (cb) { if (!demo) sb.auth.onAuthStateChange(function (ev) { if (ev === 'PASSWORD_RECOVERY') cb(); }); };
  api.aal = function () {
    if (demo) return D.wait(D.db.aal);
    return sb.auth.mfa.getAuthenticatorAssuranceLevel().then(function (r) { return r.data && r.data.currentLevel; });
  };
  api.verifiedFactor = function () {
    if (demo) return D.wait(D.db.enrolled ? 'demo-factor' : null);
    return sb.auth.mfa.listFactors().then(function (r) {
      if (r.error) throw r.error;
      var f = (r.data.totp || []).find(function (x) { return x.status === 'verified'; });
      return f ? f.id : null;
    });
  };
  api.enroll = function () {
    if (demo) return D.wait({ id: 'demo-factor', qr: '', secret: 'DEMO-ONLY-NOT-A-REAL-SECRET' });
    // Remove any half-finished enrolment first so a new QR can be issued
    return sb.auth.mfa.listFactors().then(function (r) {
      var stale = ((r.data && r.data.all) || []).filter(function (f) { return f.status !== 'verified'; });
      return Promise.all(stale.map(function (f) { return sb.auth.mfa.unenroll({ factorId: f.id }); }));
    }).then(function () {
      return sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'THJP portal ' + Date.now() });
    }).then(function (r) { if (r.error) throw r.error; return { id: r.data.id, qr: r.data.totp.qr_code, secret: r.data.totp.secret }; });
  };
  api.verify = function (factorId, code) {
    if (demo) { if (!/^\d{6}$/.test(code)) return Promise.reject(new Error('bad')); D.db.aal = 'aal2'; D.db.enrolled = true; D.save(); return D.wait(true); }
    return sb.auth.mfa.challengeAndVerify({ factorId: factorId, code: code }).then(unwrap);
  };

  api.myProfile = function () {
    if (demo) return D.wait(Object.assign({}, D.me()));
    return api.session().then(function (s) { return sb.from('profiles').select('*').eq('id', s.user.id).single(); }).then(function (r) {
      if (r.error) { var e = new Error(r.error.message); e.code = r.error.code; throw e; } return r.data;
    });
  };
  api.tiers = function () {
    if (demo) return D.wait(D.db.tiers.slice());
    return sb.from('tier_settings').select('*').order('tier').then(unwrap);
  };
  api.products = function (includeInactive) {
    if (demo) return D.wait(D.db.products.filter(function (p) { return includeInactive || p.active; }).sort(function (a, b) { return a.brand.localeCompare(b.brand) || a.sort_order - b.sort_order; }));
    var q = sb.from('products').select('*').order('brand').order('sort_order').order('product_name');
    if (!includeInactive) q = q.eq('active', true);
    return q.then(unwrap);
  };
  api.resources = function () {
    if (demo) return D.wait(D.db.resources.slice());
    return sb.from('resources').select('*').order('category').order('title').then(unwrap);
  };
  api.fileUrl = function (path) {
    if (/^https?:\/\//i.test(path) || demo) return Promise.resolve(path);
    return sb.storage.from('dealer-resources').createSignedUrl(path, 3600).then(function (r) { return (r.data && r.data.signedUrl) || '#'; });
  };
  api.placeOrder = function (po, notes, items) {
    if (demo) {
      var me = D.me(), tier = D.db.tiers.find(function (t) { return t.tier === me.tier; });
      var qty = items.reduce(function (s, i) { return s + i.qty; }, 0);
      if (qty < tier.min_order_qty) return Promise.reject(new Error('Minimum order for ' + tier.label + ' is ' + tier.min_order_qty + ' units'));
      var id = D.nextId(D.db.orders), total = 0;
      items.forEach(function (i) {
        var p = D.db.products.find(function (x) { return x.sku === i.sku; });
        var unit = tierPrice(p.rrp_aud, tier.discount_pct);
        total += unit * i.qty;
        D.db.items.push({ id: D.nextId(D.db.items), order_id: id, brand: p.brand, sku: p.sku, product_name: p.product_name + (p.size ? ' · ' + p.size : ''), size: i.size || null, unit_price_aud: unit, qty: i.qty, line_total_aud: Math.round(unit * i.qty * 100) / 100 });
      });
      var o = { id: id, order_number: 'THJP-0' + (1000 + id), stockist_id: me.id, po_number: po, status: 'submitted', tier: me.tier, total_qty: qty, total_inc_gst_aud: Math.round(total * 100) / 100, gst_aud: Math.round(total / 11 * 100) / 100, shipping_aud: tier.free_shipping ? 0 : null, tracking: null, notes: notes, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), admin_notes: '' };
      D.db.orders.push(o); D.save(); return D.wait(o);
    }
    return sb.rpc('place_order', { p_po_number: po, p_notes: notes, p_items: items }).then(unwrap);
  };
  api.myOrders = function () {
    if (demo) {
      var mine = D.db.orders.filter(function (o) { return o.stockist_id === D.db.me; }).sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });
      return D.wait(mine.map(function (o) { return Object.assign({}, o, { admin_notes: undefined, items: D.db.items.filter(function (i) { return i.order_id === o.id; }) }); }));
    }
    return sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).then(unwrap).then(function (rows) {
      return rows.map(function (o) { o.items = o.order_items || []; return o; });
    });
  };
  api.notify = function (orderId, event) {
    if (demo) return D.wait({ demo: true });
    return sb.functions.invoke('notify', { body: { order_id: orderId, event: event } }).catch(function (e) { console.warn('notify failed', e); });
  };

  /* admin */
  api.allOrders = function () {
    if (demo) {
      return D.wait(D.db.orders.slice().sort(function (a, b) { return b.created_at.localeCompare(a.created_at); }).map(function (o) {
        return Object.assign({}, o, { stockist: D.db.profiles.find(function (p) { return p.id === o.stockist_id; }), items: D.db.items.filter(function (i) { return i.order_id === o.id; }) });
      }));
    }
    return Promise.all([
      sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).then(unwrap),
      sb.from('profiles').select('id,email,business_name,contact_name,phone,state,region').then(unwrap),
      sb.from('order_admin_notes').select('*').then(unwrap)
    ]).then(function (r) {
      return r[0].map(function (o) {
        o.items = o.order_items || [];
        o.stockist = r[1].find(function (p) { return p.id === o.stockist_id; }) || {};
        var n = r[2].find(function (x) { return x.order_id === o.id; }); o.admin_notes = n ? n.admin_notes : '';
        return o;
      });
    });
  };
  api.updateOrder = function (id, patch, adminNotes) {
    if (demo) { var o = D.db.orders.find(function (x) { return x.id === id; }); Object.assign(o, patch, { admin_notes: adminNotes, updated_at: new Date().toISOString() }); D.save(); return D.wait(o); }
    return sb.from('orders').update(patch).eq('id', id).then(unwrap).then(function () {
      return sb.from('order_admin_notes').upsert({ order_id: id, admin_notes: adminNotes, updated_at: new Date().toISOString() }).then(unwrap);
    });
  };
  api.profiles = function () {
    if (demo) return D.wait(D.db.profiles.slice());
    return sb.from('profiles').select('*').order('approved').order('created_at', { ascending: false }).then(unwrap);
  };
  api.updateProfile = function (id, patch) {
    if (demo) { Object.assign(D.db.profiles.find(function (p) { return p.id === id; }), patch); D.save(); return D.wait(true); }
    return sb.from('profiles').update(patch).eq('id', id).then(unwrap);
  };
  function invoke(name, body) {
    return sb.functions.invoke(name, { body: body }).then(function (r) {
      if (r.error) {
        return (r.error.context && r.error.context.json ? r.error.context.json() : Promise.resolve({})).then(function (j) { throw new Error((j && j.error) || r.error.message); });
      }
      if (r.data && r.data.error) throw new Error(r.data.error);
      return r.data;
    });
  }
  api.createUser = function (payload) {
    if (demo) { D.db.profiles.push(Object.assign({ id: 'u-' + Date.now(), created_at: new Date().toISOString() }, payload, { approved: payload.approved !== false })); D.save(); return D.wait({ ok: true }); }
    return invoke('admin-create-user', payload);
  };
  api.resetMfa = function (id) { if (demo) return D.wait({ message: 'Two-factor reset (demo).' }); return invoke('admin-reset-mfa', { user_id: id }); };
  api.saveProduct = function (p) {
    if (demo) {
      if (p.id) Object.assign(D.db.products.find(function (x) { return x.id === p.id; }), p);
      else D.db.products.push(Object.assign({ id: D.nextId(D.db.products) }, p));
      D.save(); return D.wait(true);
    }
    var row = Object.assign({}, p); delete row.id; delete row.updated_at;
    return (p.id ? sb.from('products').update(row).eq('id', p.id) : sb.from('products').insert(row)).then(unwrap);
  };
  api.deleteProduct = function (id) {
    if (demo) { D.db.products = D.db.products.filter(function (x) { return x.id !== id; }); D.save(); return D.wait(true); }
    return sb.from('products').delete().eq('id', id).then(unwrap);
  };
  api.saveTier = function (t) {
    if (demo) { var x = D.db.tiers.find(function (y) { return y.tier === t.tier; }); if (x) Object.assign(x, t); else D.db.tiers.push(t); D.save(); return D.wait(true); }
    return sb.from('tier_settings').upsert(t).then(unwrap);
  };
  api.saveResource = function (r, file) {
    if (demo) {
      if (file) r.file_path = URL.createObjectURL(file);
      if (r.id) Object.assign(D.db.resources.find(function (x) { return x.id === r.id; }), r); else D.db.resources.push(Object.assign({ id: D.nextId(D.db.resources) }, r));
      D.save(); return D.wait(true);
    }
    var up = Promise.resolve();
    if (file) {
      var safe = file.name.replace(/[^\w.\-]+/g, '-').toLowerCase();
      r.file_path = (r.category || 'general') + '/' + Date.now() + '-' + safe;
      up = sb.storage.from('dealer-resources').upload(r.file_path, file, { upsert: true }).then(unwrap);
    }
    return up.then(function () {
      var row = { title: r.title, description: r.description || null, brand: r.brand || null, category: r.category, file_path: r.file_path, updated_at: new Date().toISOString() };
      return (r.id ? sb.from('resources').update(row).eq('id', r.id) : sb.from('resources').insert(row)).then(unwrap);
    });
  };
  api.deleteResource = function (id) {
    if (demo) { D.db.resources = D.db.resources.filter(function (x) { return x.id !== id; }); D.save(); return D.wait(true); }
    return sb.from('resources').delete().eq('id', id).then(unwrap);
  };

  /* ─────────────── page guard + app bar ─────────────── */
  function gate(title, msg, opts) {
    opts = opts || {};
    var g = $('#gate'); var app = $('#app');
    if (app) app.hidden = true;
    g.hidden = false;
    g.innerHTML = '<div class="gate-card"><img src="../images/thjp-badge-256.png" alt="" width="88" height="88"><h1>' + esc(title) + '</h1><p>' + msg + '</p>' +
      '<div class="gate-actions">' + (opts.retry ? '<button class="btn" onclick="location.reload()">Try again</button>' : '') +
      '<a class="btn ghost-dark" href="' + (opts.href || loginPath) + '">' + esc(opts.cta || 'Back to sign in') + '</a></div></div>';
  }

  function appBar(profile, active) {
    var links = [['index.html', 'Dashboard'], ['order.html', 'Place an order'], ['orders.html', 'My orders'], ['tiers.html', 'Tiers']];
    if (profile.role === 'admin') links.push(['admin.html', 'Admin']);
    var nav = links.map(function (l) { return '<a href="' + l[0] + '"' + (l[0] === active ? ' class="on" aria-current="page"' : '') + '>' + l[1] + '</a>'; }).join('');
    var bar = document.createElement('header');
    bar.className = 'pbar';
    bar.innerHTML = '<div class="pbar-in">' +
      '<a class="pbrand" href="index.html"><img src="../images/thjp-badge-64.png" srcset="../images/thjp-badge-256.png 3x" alt="" width="40" height="40"><span><b>THJP</b><small>Stockist portal</small></span></a>' +
      '<button class="pmenu" aria-label="Menu" aria-expanded="false">☰</button>' +
      '<nav class="pnav">' + nav + '</nav>' +
      '<div class="puser"><span>' + esc(profile.business_name || profile.email) + '</span><button class="pout">Sign out</button></div></div>' +
      (demo ? '<div class="demo-flag">Preview mode — sample data only. Nothing is saved or sent.</div>' : '');
    document.body.insertBefore(bar, document.body.firstChild);
    $('.pout', bar).addEventListener('click', function () { api.signOut().then(function () { location.href = loginPath; }); });
    $('.pmenu', bar).addEventListener('click', function (e) { var open = bar.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', String(open)); });
  }

  function idleTimer(minutes) {
    var ms = minutes * 60000, key = 'thjp_last_activity', timer, done = false;
    function mark() { try { localStorage.setItem(key, String(Date.now())); } catch (e) {} }
    function check() {
      var last = 0; try { last = Number(localStorage.getItem(key)); } catch (e) {}
      if (last && Date.now() - last >= ms) { if (!done) { done = true; api.signOut().then(function () { location.href = loginPath + '?reason=idle'; }); } return true; }
      return false;
    }
    function reset() { if (done) return; mark(); clearTimeout(timer); timer = setTimeout(check, ms); }
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, reset, { passive: true }); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && !check()) reset(); });
    window.addEventListener('focus', function () { if (!check()) reset(); });
    reset();
  }

  /** Call at the top of every signed-in page. Resolves with the profile, or shows a message and stops. */
  function guard(opts) {
    opts = opts || {};
    if (!configured && !demo) {
      gate('Portal coming soon', 'The THJP stockist portal is being set up. In the meantime please contact <a href="mailto:' + esc(cfg.CONTACT_EMAIL) + '">' + esc(cfg.CONTACT_EMAIL) + '</a> to place an order.', { href: '../pages/portal.html', cta: 'About the portal' });
      return new Promise(function () {});
    }
    return api.session().then(function (s) {
      if (!s) { location.href = loginPath; return new Promise(function () {}); }
      return api.aal();
    }).then(function (aal) {
      if (aal !== 'aal2') { location.href = loginPath; return new Promise(function () {}); }
      return api.myProfile();
    }).then(function (p) {
      if (!p.approved && p.role !== 'admin') {
        gate('Awaiting approval', 'Your account has been created and is waiting for approval from our team. We&rsquo;ll email you as soon as your trade access is active.');
        return new Promise(function () {});
      }
      if (opts.admin && p.role !== 'admin') {
        gate('Admins only', 'This area is for THJP Enterprises staff.', { href: 'index.html', cta: 'Back to dashboard' });
        return new Promise(function () {});
      }
      appBar(p, opts.active);
      $('#gate').hidden = true; $('#app').hidden = false;
      idleTimer(cfg.IDLE_MINUTES || 30);
      return p;
    }).catch(function (e) {
      if (e && e.code === 'PGRST116') gate('Account not found', 'We couldn&rsquo;t find a portal profile for your sign-in. Please contact us.');
      else gate('Can&rsquo;t reach the portal', 'We couldn&rsquo;t connect just now (' + esc(e && e.message) + '). Please wait a moment and try again.', { retry: true });
      return new Promise(function () {});
    });
  }

  window.P = { api: api, guard: guard, esc: esc, money: money, date: date, $: $, $all: $all, toast: toast, tierPrice: tierPrice, groupBy: groupBy, statusChip: statusChip, STATUS: STATUS, configured: configured, demo: demo, cfg: cfg };
})();
