# THJP Enterprises Pty Ltd — GitHub Pages Website

Australian-owned B2B importer and distributor of premium woodworking products.  
Distributed by **THJP Enterprises Pty Ltd** · ABN: 56 696 226 203

---

## 🚀 Deployment Instructions

### Step 1 — Create a GitHub Repository
1. Log in to [github.com](https://github.com)
2. Click **+** → **New repository**
3. Name it `thjp-enterprises` (or any name you prefer)
4. Set visibility to **Public** *(required for free GitHub Pages)*
5. Leave all other options unchecked — click **Create repository**

### Step 2 — Upload the Site Files
**Option A — GitHub web interface (easiest):**
1. On your new repository page, click **uploading an existing file**
2. Drag and drop the entire contents of this folder (not the folder itself — select all files inside)
3. Make sure the structure is preserved:
   ```
   index.html        ← must be at root
   css/style.css
   js/shared.js
   pages/about.html
   pages/brands.html
   pages/products.html
   pages/contact.html
   pages/404.html
   _config.yml
   README.md
   ```
4. Add a commit message like `Initial site upload` and click **Commit changes**

**Option B — Git command line:**
```bash
cd path/to/thjp-enterprises-site
git init
git remote add origin https://github.com/YOUR_USERNAME/thjp-enterprises.git
git add .
git commit -m "Initial site upload"
git branch -M main
git push -u origin main
```

### Step 3 — Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** (top menu)
3. Scroll to **Pages** in the left sidebar
4. Under **Source**, select **Deploy from a branch**
5. Set branch to **main** and folder to **/ (root)**
6. Click **Save**
7. Wait ~2 minutes — your site will be live at:
   `https://YOUR_USERNAME.github.io/thjp-enterprises/`

---

## 🌐 Custom Domain Setup (thjpenterprises.com)

1. Complete Steps 1–3 above first
2. In **Settings → Pages → Custom domain**, type `thjpenterprises.com` and click **Save**
3. Create a file called `CNAME` in the repository root containing just:
   ```
   thjpenterprises.com
   ```
4. Log in to your domain registrar (GoDaddy, Namecheap, etc.) and update your DNS:

   | Type | Name | Value |
   |------|------|-------|
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | YOUR_USERNAME.github.io |

5. DNS changes take 10 min – 48 hours to propagate
6. Once live, tick **Enforce HTTPS** in GitHub Pages settings

---

## 📁 File Structure

```
thjp-enterprises/
├── index.html              Home page
├── css/
│   └── style.css           Global stylesheet (all pages)
├── js/
│   └── shared.js           Shared JavaScript (nav, forms, scroll)
├── pages/
│   ├── about.html          About Us
│   ├── brands.html         Our Distribution Brands
│   ├── products.html       Product Range
│   ├── contact.html        Contact Us
│   └── 404.html            Page Not Found
├── _config.yml             GitHub Pages / Jekyll config
└── README.md               This file
```

---

## ✏️ How to Update Content

**All content is plain HTML** — open any file in a text editor and edit directly.

### Updating text
Open the relevant `.html` file and find the text you want to change. Save and push to GitHub — the site updates automatically within ~1 minute.

### Adding a new brand
1. Open `pages/brands.html`
2. Find the comment `<!-- COMING SOON -->` section
3. Copy an existing `.brand-card` div block and update the content
4. Add a link to it from `pages/products.html` and `index.html` if needed

### Changing colours
All brand colours are CSS custom properties in `css/style.css` under `:root {}`:
```css
:root {
  --bark:    #2C1A0E;   /* darkest — nav background */
  --timber:  #4A2810;   /* stat strip */
  --oak:     #7A4F2C;   /* mid-brown text */
  --grain:   #C4956A;   /* amber accent — main brand highlight */
  --sand:    #E8D5BC;   /* light warm — nav text */
  --cream:   #F5EDE0;   /* section backgrounds */
  --sage:    #4A5940;   /* green accent */
}
```
Change a value here and it updates globally across every page.

### Adding hero images
The hero sections currently use SVG illustrations. To swap in real photos:
1. Upload your image to the `/images/` folder (create it if needed)
2. In the relevant hero section, replace the `<div class="hero-rings">` block with:
   ```html
   <div class="hero-full-img">
     <img src="images/your-photo.jpg" alt="Description">
   </div>
   ```
3. For page heroes, find `<div class="page-hero-bg">` and add inside it:
   ```html
   <img src="../images/your-photo.jpg" alt="Description" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.3;">
   ```

### Contact form — enabling real submissions
The contact form currently uses a `mailto:` fallback (GitHub Pages has no server).
To enable real form submissions, use **Formspree** (free tier available):
1. Sign up at [formspree.io](https://formspree.io)
2. Create a new form — copy your endpoint URL (e.g. `https://formspree.io/f/abcdefgh`)
3. In `pages/contact.html`, find `<form id="contact-form"` and add:
   ```html
   action="https://formspree.io/f/YOUR_ID" method="POST"
   ```
4. Remove the `<script>` block at the bottom of `contact.html` that handles the `mailto:` submit
5. Formspree will email all submissions to the address you registered with

---

## 🔗 External Links in This Site

| Destination | Location |
|---|---|
| vinniesoilaustralia.com | Nav, footer, products page, brands page, home |
| arborean.com.au | Contact sidebar, footer |
| instagram.com/arboreanau | Footer social link |
| pages.github.com | Footer credit |

---

## 🏢 Business Details

**THJP Enterprises Pty Ltd**  
ABN: 56 696 226 203  
Email: info@thjpenterprises.com  
Instagram: [@arboreanau](https://www.instagram.com/arboreanau/)  
Brand website: [vinniesoilaustralia.com](https://vinniesoilaustralia.com)

*B2B wholesale importer and distributor — not available direct to consumers.*

---

## ⚙️ Technical Notes

- **No build step required** — pure HTML, CSS and vanilla JavaScript
- **No frameworks or dependencies** — no Node.js, no npm, no compiling
- **Fonts** — loaded from Google Fonts CDN (Cormorant Garamond + DM Sans)
- **Icons** — all inline SVG, no external icon library
- **Images** — product images loaded from Vinnie's Oil CDN; replace URLs with locally hosted images for independence from external CDNs
- **Browser support** — all modern browsers; CSS Grid and custom properties used throughout
