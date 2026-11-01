# Yehulu Digital — Creative Agency Platform

Official web platform for **Yehulu Digital** — a creative digital marketing agency focused on brand identity systems, 4K commercial video production, social media campaigns, and digital product experiences.

🔗 **Live Reference**: [https://yehulu-digitals.ai.studio/](https://yehulu-digitals.ai.studio/)  
🚀 **GitHub Repository**: [https://github.com/isakhu/yehulu.digital](https://github.com/isakhu/yehulu.digital)

---

## 🌟 Modernization & Feature Highlights

- **Floating Bottom Navigation Dock**: High-performance, viewport-fixed navigation dock with SVG iconography, active scroll-spy detection, smooth-scroll anchoring, and hover tooltips.
- **Dynamic Theme Switcher**: Dual mode (Dark default `#050505` with `#B6FF00` accent, and Light `#f6f8f4`) with persistent `localStorage` preference and zero flash of unstyled content (zero-FOUC).
- **Fullscreen Interactive Lightbox**: Click any portfolio asset across the home page or gallery to inspect full-resolution artwork with previous/next keyboard shortcuts (`←`/`→`), close on `ESC`, and swipe support.
- **30+ Client Project Archive**: Complete portfolio showcasing 37 verified client deliverables across Brand Identity, Commercial Outdoor Advertising, Social Media, and Hospitality (featuring Rori Hotel Hawassa).
- **Automated Gallery Sync Engine (`sync-gallery.js`)**: Drop any new image files into `public/uploads/projects/` and run `npm run sync` to instantly categorize and index them into `data/gallery.json`.
- **Unified Social Media Hub**: Consolidated brand channels capsule (Instagram, TikTok, WhatsApp, YouTube) in both topbar and footer.
- **Tight High-Density Studio Spacing**: Optimized vertical proportions and visual hierarchy inspired by premier design agencies.
- **Zero-Dependency Local Server**: Built with native Node.js standard libraries for lightning-fast boot and zero external npm vulnerabilities.

---

## 📂 Project Architecture

```
yehulu.digital/
├── public/
│   ├── index.html                                        # Modernized SPA entry point & floating dock
│   ├── about.html                                        # Standalone motion About page
│   ├── assets/
│   │   ├── index-BSXl1opM.js                             # React 18 client bundle
│   │   ├── index-Bs1w5tPm.css                            # Core stylesheet
│   │   ├── logopng-BhI97nKv.png                          # Official brand logo
│   │   └── yehulu_logo_png_1786399102461-DyGA8Bta.jpg    # Alternative brand asset
│   └── uploads/
│       └── projects/                                     # 34+ high-res client deliverables
├── data/
│   ├── contact-info.json                                 # Official contact numbers, socials & address
│   ├── courses.json                                      # Digital academy courses
│   ├── estimator-config.json                             # Interactive project cost calculator
│   ├── gallery.json                                      # 37 curated project case studies
│   ├── messages.json                                     # Inbound contact form submissions
│   └── videos.json                                       # 4K commercial videos & reels
├── lib/                                                  # Shared auth, account, data-store and course helpers
├── src/                                                  # Modular React components
│   ├── components/
│   │   ├── AboutSection.jsx
│   │   ├── BottomDock.jsx
│   │   └── ThemeToggle.jsx
├── server.js                                             # Local zero-dependency Node.js server
├── sync-gallery.js                                       # Automated project asset indexing script
├── package.json                                          # NPM project scripts
└── README.md
```

---

## 🔐 Client Admin Portal

The admin portal supports gallery and video management, Telegram course publishing, incoming messages, pricing settings, and administrator accounts.

- **Portal URL**: `/admin/login`
- **Initial administrator email**: `admin@yehuludigital.com` (change with `ADMIN_EMAIL`).
- **No default password is shipped with the repository.** Configure a private password hash and session secret before signing in.

### Required environment variables

Create a private `.env` file for local development or add these variables in Vercel Project Settings → Environment Variables:

- `ADMIN_EMAIL`: initial administrator email.
- `ADMIN_NAME`: initial administrator display name.
- `ADMIN_PASSWORD_HASH`: a scrypt password hash (never commit the password or hash).
- `SESSION_SECRET`: a random secret with at least 32 characters.
- `BLOB_READ_WRITE_TOKEN`: connect a Vercel Blob store so uploads, messages, course records, settings, and administrator accounts persist across serverless invocations.

Generate a password hash locally with Node.js. Replace the example password with a new password of at least 12 characters, and keep the resulting hash private:

```bash
node -e "const c=require('node:crypto');const p=process.argv[1];const s=c.randomBytes(16).toString('hex');console.log('scrypt$'+s+'$'+c.scryptSync(p,s,64).toString('hex'))" "replace-with-a-unique-password"
```

Generate a session secret:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

For local use, copy `.env.example` to `.env`, fill in the values, then run `npm start`. The local server loads `.env` automatically. Never commit `.env`.

### Administrator account and data security

- Passwords are stored as scrypt hashes, not plaintext.
- Admin sessions are signed, expire after 8 hours, and are checked by both the local server and Vercel API.
- Admin-only endpoints protect uploads, gallery/video/course changes, contact messages, pricing settings, and account management.
- Administrator accounts and CMS records are stored in a private Vercel Blob store in production.
- Public visitors can submit the contact form and view published portfolio/course content only.

**Important:** the old demo password was present in earlier repository revisions. Treat it as compromised and do not reuse it. Rotate any password that may have been used with the old version.

## 🚀 Quick Start

No heavy dependencies or build steps required. Simply run:

```bash
npm start
```
or
```bash
node server.js
```

Open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📸 Adding New Portfolio Images

To add additional photos or campaign graphics at any time:

1. Drop your `.jpg`, `.png`, or `.webp` files directly into:
   ```
   public/uploads/projects/
   ```
2. Run the sync script:
   ```bash
   npm run sync
   ```
3. Your new images will automatically appear in the project archive and Lightbox immediately!

---

## ☁️ Deploying to Vercel

1. Import `isakhu/yehulu.digital` into Vercel and deploy from the `main` branch.
2. Create a **private Vercel Blob store** and connect it to the project. Vercel should provide `BLOB_READ_WRITE_TOKEN`.
3. Add `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET` as Vercel environment variables for the Production, Preview, and Development environments as appropriate.
4. Redeploy after changing environment variables.
5. Open `/admin/login` and sign in with the configured administrator email and the password used to generate `ADMIN_PASSWORD_HASH`.

The API uses the private Blob store for mutable CMS data because Vercel Function filesystems are not a persistent database. Do not store passwords, session secrets, or Blob tokens in source files.

## 📄 License & Attribution

© 2026 **Yehulu Digital**. All rights reserved.
