# STUDIOMORPHIK — Website

This repo is the marketing website for **STUDIOMORPHIK**, live at **https://studiomorphik.com**.

## What STUDIOMORPHIK is

A creative studio blending true photorealism with the surreal and imaginative, crafting **AI-driven video, photography, and imagery** for brands, products, and campaigns. Work spans products, campaigns, music videos, photography shoots, custom characters, landscapes, cinematic transitions, food and automotive shots, beauty, VFX, and hero films.

- **Founders:** Wissam Sader (photographer & visual artist) and Teddy Tawil (editor & motion designer).
- **Based:** working between Europe and the Middle East.
- **Selected clients:** Vice Media, KitKat.
- **Contact:** hello@studiomorphik.com

## Tech & deploy

- **Static site** — plain HTML/CSS/JS, no build step, no framework.
  - `index.html` — the entire site (single page).
  - `styles.css` — all styling.
  - `script.js` — routing, video controls, scene map/timeline behavior.
- **Hosting:** GitHub Pages from the `main` branch. Remote: `github.com:wissamsader/studiomorphik.git`.
- **Custom domain:** `studiomorphik.com` via the `CNAME` file.
- **⚠️ Push to `main` = live in production.** There is no staging. Be deliberate with commits to `main`.

## Site structure

A single-page app with a full-screen **hero showreel video** background and three hash-routed views:

- `#/` — **home** (just the showreel + header)
- `#/about` — **About** copy + selected clients (Vice, KitKat logos)
- `#/contact` — **Contact** (email `hello@studiomorphik.com` with a copy-to-clipboard button)

`about.html` and `contact.html` are tiny stubs that redirect to the matching hash route (for clean/shareable URLs). The header has About + Contact icon links, the STUDIOMORPHIK wordmark (→ home), and a mute/unmute button for the showreel.

## The showreel video

- **File:** `img/STUDIOMORPHIK_2026 showreel_FINAL_2026.mp4` (referenced URL-encoded as `img/STUDIOMORPHIK_2026%20showreel_FINAL_2026.mp4`).
- Plays as the hero background: autoplay, muted by default, loop, `playsinline`. Users can unmute via the volume button.
- **The original/source video is large and git-ignored** (`img/STUDIOMORPHIK.mp4` and `YEssS.mp4` exceed GitHub's 100MB limit). Only a web-optimized version should be committed.
- The reel is mapped into **named scenes** in `script.js` (`scenes` array) for the timeline/scene-map nav. ~151s total, in order:
  Voltage (electric neon dancers) · Elixir (green perfume bottle) · Solitude (lone man on a quiet street) · Allure (makeup at the vanity) · Underground (neon nocturnal city) · Desire (sleek headphones) · Genesis (primordial water droplets) · Inferno (forest fire) · Mirage (car on the salt-flat mirror) · Indulgence (honey pour) · Chrome (glossy supercar) · Nightfall (night street market) · Couture (studded couture look) · Nostalgia (vintage Cairo market) · Ritual (spotlit finale).
- **Mobile portrait crop:** on phones the 16:9 video is hard-cropped to fill a 9:16 frame, so `script.js` (`focusSegments`) shifts `object-position` per-shot to keep the subject in frame. Values are tuned to specific timecodes — if the video is ever re-edited or replaced, these timecodes must be re-checked.

## Brand & design

- **Background:** `#0b0c0e` (near-black). **Text:** white (`--fg: rgba(255,255,255,0.92)`).
- **Fonts:**
  - Headings / wordmark: **Integral CF Bold** (`fonts/IntegralCF-Bold.woff2`). ⚠️ This is the **"FONTSPRING DEMO"** trial version — not licensed for commercial use and may be uppercase-only. Buy the full license before relying on it.
  - Body: **Montserrat**. Mono accents: **JetBrains Mono**, **Space Mono**.
- **Scene-spectrum gradient** (used for the scene-map route): `#ff4d4d → #ff9f40 → #ffe14d → #5dff9b → #4dc3ff → #b96bff`.
- **Favicon / brand mark:** an iOS-style **squircle outline containing the scene-map "route"** (5 connected nodes), white on the dark background. Assets: `favicon.ico` (root) + `img/favicon-32/48/96/192.png`, `img/apple-touch-icon.png`, `img/logo-512.png`. Alternative favicon concepts live in the git-ignored `favicon-options/` folder.

## Copy style rules

When writing or editing site copy:
- **Avoid chained "and"s** in a sentence.
- **No em dashes.**
- Match the existing editorial, lowercase-leaning tone (e.g. mono labels like "tap to explore scenes").

About copy lives in the `<p class="about__text">` block in `index.html`.

## SEO

- `robots.txt` allows all; `sitemap.xml` lists the homepage. Canonical URL, Open Graph, and Twitter Card tags are in the `<head>` of `index.html`. OG image: `img/og-cover.jpg`.
- Favicon changes take days-to-weeks to appear in Google search results; nudge via Search Console "Request Indexing".

## Media inventory (`img/`)

- `STUDIOMORPHIK_2026 showreel_FINAL_2026.mp4` — hero showreel
- `og-cover.jpg` — social share image
- `vice-logo.svg`, `kitkat.png`, `kitkat-logo.svg` — client logos
- `favicon-*.png`, `apple-touch-icon.png`, `logo-512.png` — brand mark sizes

## Conventions

- No build/test tooling — edit the files directly and open `index.html` to preview.
- Keep everything dependency-free and static; don't introduce frameworks or a build step.
- `screenshot.jpg` and `favicon-options/` are git-ignored scratch (don't commit them).
