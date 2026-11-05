-- ═══════════════════════════════════════════════════════════════════════
-- THJP Enterprises — Stockist Portal starter products
-- Run once AFTER schema.sql. Everything here can be edited afterwards in
-- the portal's Admin → Products tab.
--
-- rrp_aud = GST-inclusive recommended retail price. Each stockist's price
-- is worked out automatically as RRP × (1 − their tier margin).
-- PLEASE CHECK EVERY RRP before inviting stockists. Products with no RRP
-- are hidden from the order form until one is set.
-- ═══════════════════════════════════════════════════════════════════════

insert into public.products (brand, sku, product_name, size, rrp_aud, has_sizes, available_sizes, sort_order, description) values
 ('Vinnie''s Oil', 'VO-UPO-270',        'Ultra Penetrating Oil (UPO)',     '270ml',    null,   false, null,             10, 'Flagship penetrating hardwax oil — 2K system base coat'),
 ('Vinnie''s Oil', 'VO-UPO-DARK-270',   'UPO — Rustic Dark',               '270ml',    89.95,  false, null,             20, 'Dark-toned penetrating oil'),
 ('Vinnie''s Oil', 'VO-ETERNAL-270',    'Eternal Seal',                    '270ml',    98.95,  false, null,             30, '2K system topcoat'),
 ('Vinnie''s Oil', 'VO-UNI-270',        'Universal Monocoat (UNI)',        '270ml',    89.95,  false, null,             40, 'One-coat hardwax oil'),
 ('Vinnie''s Oil', 'VO-HARDWAX-270',    'Hard Wax',                        '270ml',    89.95,  false, null,             50, 'Concentrated hard wax'),
 ('Vinnie''s Oil', 'VO-SOFTWAX',        'Soft Wax',                        null,       89.95,  false, null,             60, 'Maintenance wax'),
 ('Vinnie''s Oil', 'VO-BUNDLE-UPO-ES',  'Bundle — UPO + Eternal Seal',     '2 × 270ml', 188.90, false, null,            70, 'Premium 2K system'),
 ('Vinnie''s Oil', 'VO-BUNDLE-UPO-HW',  'Bundle — UPO + Hard Wax',         '2 × 270ml', 179.95, false, null,            80, 'Classic 2K combo'),
 ('Vinnie''s Oil', 'VO-BUNDLE-BASE',    'Oil Base Series (starter system)', null,      458.75, false, null,             90, 'Curated starter system'),
 ('Vinnie''s Oil', 'VO-TEE',            'Vinnie''s Oil T-Shirt',           null,       null,   true,  'S,M,L,XL,XXL',  100, 'Branded apparel'),
 ('Vinnie''s Oil', 'VO-CAP',            'Vinnie''s Oil Cap',               null,       null,   false, null,            110, 'Branded apparel');

-- Example of adding another brand later (Admin → Products does the same):
-- insert into public.products (brand, sku, product_name, size, rrp_aud) values ('Arborean', 'AR-PEN-SLIM', 'Slimline pen kit', '10 pack', 49.95);

-- Public Safety Data Sheets (already public on vinniesoilaustralia.com)
insert into public.resources (title, description, brand, category, file_path) values
 ('UPO — Safety Data Sheet',            'Ultra Penetrating Oil 270ml', 'Vinnie''s Oil', 'sds', 'https://vinniesoilaustralia.com/SDS/Safetysheet%20Vinnie''s%20Oil%20UPO.pdf'),
 ('UPO Rustic Dark — Safety Data Sheet', 'UPO Rustic Dark 270ml',      'Vinnie''s Oil', 'sds', 'https://vinniesoilaustralia.com/SDS/Safetysheet%20Vinnie''s%20Oil%20UPO%20DARK.pdf'),
 ('UNI — Safety Data Sheet',            'Universal Monocoat 270ml',    'Vinnie''s Oil', 'sds', 'https://vinniesoilaustralia.com/SDS/Safetysheet%20Vinnie''s%20Oil%20UNI.pdf'),
 ('Hard & Soft Wax — Safety Data Sheet', 'Vinnie''s Wax range',        'Vinnie''s Oil', 'sds', 'https://vinniesoilaustralia.com/SDS/Safetysheet%20Vinnie''s%20Wax.pdf');
