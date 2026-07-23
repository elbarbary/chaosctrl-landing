# ChaosCtrl — Landing Page

The marketing landing page for **ChaosCtrl**, an iOS "second brain" that watches everything on your plate and tells you the one thing that needs you right now — no feeds to scroll, no lists to maintain, just answers.

> *The calm at the center of your chaos.*

## About

A single-page, dependency-free landing site built with a light **liquid-glass** aesthetic: layered `backdrop-filter` panels, drifting ambient color blobs, and a floating glass product mock. The whole page is one self-contained `index.html` — no build step, no framework, no external JS.

Design imported from a [Claude Design](https://claude.ai/design) project and implemented as a production, deployable static page.

## Structure

| File | Purpose |
|------|---------|
| `index.html` | The entire landing page (inline styles, responsive) |
| `favicon.svg` | ChaosCtrl mark for browser tabs (gradient tile + swoosh) |
| `apple-touch-icon.png` | 180×180 home-screen icon for iOS |
| `og-image.png` | 1200×630 social share preview card |
| `*-source.html` | Sources the two PNGs are rendered from (see below) |

## Highlights

- **Zero dependencies** — pure HTML/CSS, only the Inter Tight web font is loaded remotely (with a system-font fallback if it fails).
- **Responsive** — collapses cleanly from a 1120px desktop layout down to mobile via CSS breakpoints, no horizontal scroll.
- **Accessible** — `<main>` landmark, `aria-hidden` on the decorative device mockups, AA-contrast text, star rating exposed as an image with a label, and `prefers-reduced-motion` support.
- **SEO + social** — title, description, canonical, absolute Open Graph + Twitter card meta with image dimensions.

## Regenerating the PNG assets

`og-image.png` and `apple-touch-icon.png` are rendered from their `*-source.html` files with headless Chrome:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=4000 \
  --screenshot=og-image.png "file://$PWD/og-source.html"
```

## Run locally

Just open the file — no server required:

```bash
open index.html
```

Or serve it:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Deploy

It's a static file, so any static host works — GitHub Pages, Cloudflare Pages, Netlify, Vercel. For **GitHub Pages**: enable Pages on the `main` branch in repo settings, and the site publishes at `https://<user>.github.io/chaosctrl-landing/`.

---

© 2026 ChaosCtrl. Made for people with a lot on their plate.
