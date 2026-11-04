#!/usr/bin/env python3
"""Assemble static pages: shared header/footer + page bodies -> ../ (GitHub Pages ready)."""
import pathlib, re

HERE = pathlib.Path(__file__).parent
OUT = HERE.parent

V = "{{ROOT}}images/web/"   # optimised copies of the Vinnie's Oil product photos
A = "https://arborean.com.au/cdn/shop/files/"

ICONS = {
 "arrow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
 "ext": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>',
 "globe": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/></svg>',
 "ship": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17l2 4h14l2-4H3zM5 17V9h14v8M9 9V5h6v4"/></svg>',
 "check": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
 "net": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5v4M12 11.5L6.5 17M12 11.5l5.5 5.5"/></svg>',
 "chat": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5z"/><path d="M8 9.5h8M8 12.5h5"/></svg>',
 "mail": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
 "insta": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/></svg>',
 "star": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z"/></svg>',
 "flag": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg>',
 "clock": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 "info": '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
 "phone": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2"/></svg>',
 "linkedin": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.5M12 17v-4a2 2 0 014 0v4M12 10v7"/></svg>',
 "pin": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-12a7 7 0 0114 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
 "doc": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
 "lock": '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
 "box": '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7l9-4 9 4v10l-9 4-9-4V7z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>',
}

MARK = '<img class="brand-badge" src="{root}images/thjp-badge-64.png" srcset="{root}images/thjp-badge-64.png 1x, {root}images/thjp-badge-256.png 3x" width="46" height="46" alt="">'


# ===================== SITE SETTINGS — fill these in, then run: python3 _build/build.py =====================
SETTINGS = {
    "FORMSPREE_ID": "",  # Formspree form ID — the part after formspree.io/f/ (e.g. "xyzabcde"). Empty = form opens visitor's email app.
    "PHONE":     "",   # e.g. "+61 2 0000 0000" — shown in footer, contact page and Google data. Empty = hidden.
    "ADDRESS":   "PO Box 12, Mount Colah NSW 2079",   # e.g. "PO Box 12, Mount Colah NSW 2079" — empty = hidden.
    "LINKEDIN":  "",   # e.g. "https://www.linkedin.com/company/thjp-enterprises" — empty = hidden.
    "CF_TOKEN":  "",   # Cloudflare Web Analytics token (free, cookie-free). Empty = no analytics.
}
# ==========================================================================================================

NAV = [("index.html", "Home", ""), ("about.html", "About", "pages/"), ("brands.html", "Brands", "pages/"),
       ("products.html", "Range", "pages/"), ("resources.html", "Resources", "pages/"), ("contact.html", "Contact", "pages/")]

def href(root, file, sub):
    if file == "index.html":
        return f"{root}index.html"
    return f"{root}{sub}{file}"

def header(root, light=False):
    links = "".join(f'<li><a href="{href(root,f,s)}" data-page="{f}">{t}</a></li>' for f, t, s in NAV)
    mlinks = "".join(f'<a href="{href(root,f,s)}" data-page="{f}">{t}</a>' for f, t, s in NAV)
    cls = "site-header on-light" if light else "site-header"
    return f'''<a class="skip" href="#main">Skip to content</a>
<header class="{cls}">
  <div class="wrap nav">
    <a class="brand" href="{root}index.html" aria-label="THJP Enterprises home">{MARK.format(root=root)}<span class="brand-text"><b>THJP</b><span>ENTERPRISES</span></span></a>
    <nav aria-label="Main"><ul class="nav-links">{links}</ul></nav>
    <a class="btn nav-cta" href="{root}pages/contact.html?type=retailer">Trade enquiries {ICONS['arrow']}</a>
    <button class="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span><span></span></button>
  </div>
</header>
<div class="mobile-menu" id="mobile-menu">{mlinks}<a class="btn" href="{root}pages/contact.html?type=retailer">Trade enquiries {ICONS['arrow']}</a></div>'''

def footer(root):
    S = SETTINGS
    extra_contact = ''
    if S["PHONE"]: extra_contact += f'\n        <li><a href="tel:{S["PHONE"].replace(" ", "")}">{S["PHONE"]}</a></li>'
    if S["ADDRESS"]: extra_contact += f'\n        <li>{S["ADDRESS"]}</li>'
    li_link = f'\n        <li><a href="{S["LINKEDIN"]}" target="_blank" rel="noopener">LinkedIn ↗</a></li>' if S["LINKEDIN"] else ''
    return f'''<footer class="site-footer">
  <div class="wrap">
    <div class="wordmark" aria-hidden="true">THJP</div>
    <div class="foot-top">
      <div>
        <a class="brand" href="{root}index.html">{MARK.format(root=root)}<span class="brand-text"><b>THJP</b><span>ENTERPRISES</span></span></a>
        <div class="stars mt-s" aria-hidden="true">★★★★★</div>
        <p class="about">Australian-owned importer, brand manager and trade distributor. We land world-class woodcraft brands and supply them through a network of specialist retailers across Australia&nbsp;&amp;&nbsp;New&nbsp;Zealand.</p>
      </div>
      <div><h4>Company</h4><ul>
        <li><a href="{root}pages/about.html">About</a></li>
        <li><a href="{root}pages/brands.html">Brand portfolio</a></li>
        <li><a href="{root}pages/products.html">Product range</a></li>
        <li><a href="{root}pages/resources.html">Trade resources</a></li>
        <li><a href="{root}pages/contact.html">Contact</a></li>
        <li><a href="{root}pages/privacy.html">Privacy policy</a></li></ul></div>
      <div><h4>Work with us</h4><ul>
        <li><a href="{root}pages/contact.html?type=retailer">Become a stockist</a></li>
        <li><a href="{root}pages/contact.html?type=brand">Distribute your brand</a></li>
        <li><a href="{root}pages/contact.html?type=wholesale">Existing accounts</a></li>
        <li><a href="mailto:info@thjpenterprises.com">info@thjpenterprises.com</a></li>{extra_contact}</ul></div>
      <div><h4>Group brands</h4><ul>
        <li><a href="https://vinniesoilaustralia.com" target="_blank" rel="noopener">Vinnie&rsquo;s Oil Australia ↗</a></li>
        <li><a href="https://arborean.com.au" target="_blank" rel="noopener">Arborean ↗</a></li>
        <li><a href="https://www.instagram.com/arboreanau/" target="_blank" rel="noopener">@arboreanau ↗</a></li>{li_link}</ul></div>
    </div>
    <div class="foot-bottom">
      <span>&copy; <span data-year>2026</span> THJP Enterprises Pty Ltd · ABN 56 696 226 203</span>
      <span>Trade &amp; wholesale only — we do not sell direct to the public</span>
    </div>
  </div>
</footer>'''

SITE = "https://thjpenterprises.com/"
import time
VER = time.strftime("%Y%m%d%H%M")  # cache-buster so visitors always get the latest CSS/JS
import json as _json
def org_ld():
    S = SETTINGS
    d = {"@context":"https://schema.org","@type":"Organization","name":"THJP Enterprises Pty Ltd","url":SITE,
         "logo":SITE+"images/thjp-badge-640.png","email":"info@thjpenterprises.com",
         "description":"Australian-owned importer, brand manager and trade distributor of premium woodcraft brands.",
         "taxID":"56 696 226 203","areaServed":["AU","NZ"],
         "brand":[{"@type":"Brand","name":"Vinnie's Oil Australia","url":"https://vinniesoilaustralia.com"},{"@type":"Brand","name":"Arborean","url":"https://arborean.com.au"}],
         "sameAs":["https://vinniesoilaustralia.com","https://arborean.com.au","https://www.instagram.com/arboreanau/"]}
    if S["PHONE"]: d["telephone"] = S["PHONE"]
    if S["ADDRESS"]: d["address"] = S["ADDRESS"]
    if S["LINKEDIN"]: d["sameAs"].append(S["LINKEDIN"])
    return '<script type="application/ld+json">' + _json.dumps(d, ensure_ascii=False) + '</script>'

def extra_channels():
    S = SETTINGS; h = ''
    if S["PHONE"]: h += f'<a class="channel" href="tel:{S["PHONE"].replace(" ", "")}"><span class="ico">{ICONS["phone"]}</span><span><small>Phone</small><b>{S["PHONE"]}</b></span></a>\n'
    if S["LINKEDIN"]: h += f'<a class="channel" href="{S["LINKEDIN"]}" target="_blank" rel="noopener"><span class="ico">{ICONS["linkedin"]}</span><span><small>LinkedIn</small><b>THJP Enterprises</b></span></a>\n'
    if S["ADDRESS"]: h += f'<div class="channel"><span class="ico">{ICONS["pin"]}</span><span><small>Postal address</small><b>{S["ADDRESS"]}</b></span></div>\n'
    return h

def page(name, title, desc, root, body, light=False):
    body = re.sub(r"\{\{icon:(\w+)\}\}", lambda m: ICONS[m.group(1)], body)
    body = body.replace("{{V}}", V).replace("{{A}}", A).replace("{{ROOT}}", root)
    canon = '' if name == '404.html' else f'<link rel="canonical" href="{SITE}{'' if name == 'index.html' else name}">\n<meta property="og:url" content="{SITE}{'' if name == 'index.html' else name}">'
    if name == '404.html': canon = '<meta name="robots" content="noindex">'
    ld = org_ld() if name == 'index.html' else ''
    if SETTINGS["CF_TOKEN"]:
        ld += '\n<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'{"token": "' + SETTINGS["CF_TOKEN"] + '"}\'></script>'
    body = body.replace("<!--EXTRA_CHANNELS-->", extra_channels()).replace("{{FORMSPREE_ID}}", SETTINGS["FORMSPREE_ID"])
    return f'''<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#0A1711">
{canon}
<meta property="og:type" content="website">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:site_name" content="THJP Enterprises">
<link rel="icon" type="image/png" href="{root}images/thjp-badge-64.png">
<link rel="apple-touch-icon" href="{root}images/thjp-badge-256.png">
<meta property="og:image" content="https://thjpenterprises.com/images/thjp-badge-640.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,100..125,400..900;1,100..125,400..900&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{root}css/style.css?v={VER}">
{ld}
</head>
<body>
{header(root, light)}
<main id="main">
{body}
</main>
{footer(root)}
<script src="{root}js/shared.js?v={VER}"></script>
</body>
</html>
'''

PAGES = [
 ("index.html", "", "THJP Enterprises — Importer & Distributor of Premium Woodcraft Brands",
  "THJP Enterprises Pty Ltd is an Australian-owned importer, brand manager and trade distributor of premium woodworking finishes, tools and supplies — supplying specialist retailers across Australia and New Zealand."),
 ("pages/about.html", "../", "About — THJP Enterprises",
  "Australian-owned importer and trade distributor. How THJP Enterprises sources, lands and supplies premium woodcraft brands to specialist retailers."),
 ("pages/brands.html", "../", "Brand Portfolio — THJP Enterprises",
  "The THJP Enterprises brand portfolio: Vinnie's Oil Australia, Arborean, and the next international brands we are bringing to Australia."),
 ("pages/products.html", "../", "Product Range — THJP Enterprises",
  "The trade range distributed by THJP Enterprises — Vinnie's Oil hardwax oils and waxes, plus woodturning, pen-making, hand tool and workshop categories."),
 ("pages/resources.html", "../", "Trade Resources — THJP Enterprises",
  "Safety Data Sheets, application guides, catalogues and trade price lists for THJP Enterprises stockists."),
 ("pages/privacy.html", "../", "Privacy Policy — THJP Enterprises",
  "How THJP Enterprises Pty Ltd collects, uses and protects personal information."),
 ("pages/contact.html", "../", "Trade Enquiries — THJP Enterprises",
  "Apply to become a stockist, discuss Australian distribution for your brand, or contact THJP Enterprises about an existing trade account."),
 ("404.html", "/", "Page not found — THJP Enterprises", "This page could not be found."),
]

for out, root, title, desc in PAGES:
    src = HERE / "bodies" / pathlib.Path(out).name
    html = page(out, title, desc, root, src.read_text(), light=False)
    (OUT / out).parent.mkdir(parents=True, exist_ok=True)
    (OUT / out).write_text(html)
    print("built", out)

import datetime
today = datetime.date.today().isoformat()
urls = "".join(f"  <url><loc>{SITE}{'' if o == 'index.html' else o}</loc><lastmod>{today}</lastmod></url>\n" for o, *_ in PAGES if o != "404.html")
(OUT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
(OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE}sitemap.xml\n")
