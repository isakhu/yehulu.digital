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
mihreteab/
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

## 🔐 Client Admin Portal (Add Images & Videos Anytime)

Your client has full administrative access to log in and upload new images and videos anytime:

- **Portal URL**: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- **Admin Email**: `admin@yehuludigital.com` (or `admin@yehulu.digital`)
- **Default Password**: `YehuluAdmin2026!`

### Features Available to the Client:
1. **Gallery Management (`/admin/gallery`)**:
   - Upload new image assets directly from their phone or computer.
   - Enter title, category (`BRAND IDENTITY`, `COMMERCIAL`, `SOCIAL MEDIA`), client partner, and description.
   - Edit or delete existing projects anytime.
2. **Video Portfolio Management (`/admin/videos`)**:
   - Add commercial video reels, TikTok shorts, and YouTube links.
   - Upload custom video thumbnails.
3. **Inbound Messages (`/admin/messages`)**:
   - View client leads and contact form inquiries.

---

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

## ☁️ Deploying to Vercel (100% Free & Automatic)

This project is pre-configured with `vercel.json` and a serverless API engine (`api/index.js` with Vercel Blob support).

### 3-Step Vercel Setup:
1. **Import Repository**:
   - Go to [vercel.com](https://vercel.com) and click **"Add New..."** → **"Project"**.
   - Select your repository: **`isakhu/yehulu.digital`**.
   - Click **"Deploy"** (Vercel automatically detects the static assets, SPA routes, and serverless functions).
2. **Enable Free Permanent Uploads (1-Click)**:
   - In your newly created Vercel project, go to the **"Storage"** tab.
   - Click **"Create Database"** → Select **"Blob"** → Click **"Create"**.
   - Vercel automatically links the `BLOB_READ_WRITE_TOKEN` to your deployment.
3. **Done!**:
   - Your website is now live globally with high-speed CDN caching.
   - Your client can log in at `https://your-domain.vercel.app/admin/login` and upload new photos, posters, and videos anytime. All uploads persist permanently on Vercel's global CDN!

---

## 📄 License & Attribution

© 2026 **Yehulu Digital**. All rights reserved.
