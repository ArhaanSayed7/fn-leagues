# FDH — Phase 13

Phase 13 reorganizes the project and adds the premium animation and UX overhaul.

## New project structure

```text
/
├── index.html
├── league.html
├── rankings.html
├── admin.html
├── config.js
│
├── css/
│   └── styles.css
│
├── js/
│   ├── app.js
│   ├── admin.js
│   ├── league.js
│   ├── rankings.js
│   └── motion.js
│
├── images/
│   ├── logo/
│   │   └── fdh-logo.png
│   ├── leagues/
│   └── ui/
│
└── README.md
```

Your existing `config.js` remains in the repository root so your Supabase setup does not need to change.

## Branding fix

All pages now load the FDH logo from:

`images/logo/fdh-logo.png`

This fixes the missing top-left logo from Phase 12C.

## New animation features

- FDH page-loading transition
- Smooth transitions between internal pages
- Cursor-follow red lighting effect
- Magnetic buttons
- Interactive 3D card tilt
- Mouse-follow card reflections
- Improved league-card hover motion
- Improved featured-league hover motion
- Animated ranking rows and logos
- Glass reflection sweeps
- Staggered hero text animation
- Smoother section depth while scrolling
- Better admin toast animations

## Performance improvements

- Lazy-loaded non-critical images
- Asynchronous image decoding
- High-priority logo loading
- CSS containment for complex cards
- Reduced motion on mobile
- Full `prefers-reduced-motion` support
- GPU-friendly transforms

## Updating GitHub

Because Phase 13 reorganizes the folders, upload the complete project structure.

Upload:

- `index.html`
- `admin.html`
- `league.html`
- `rankings.html`
- `css/styles.css`
- `js/app.js`
- `js/admin.js`
- `js/league.js`
- `js/rankings.js`
- `js/motion.js`
- `images/logo/fdh-logo.png`
- `README.md`

Keep your existing root:

- `config.js`

You may delete these old root files after the new version is working:

- `styles.css`
- `app.js`
- `admin.js`
- `league.js`
- `rankings.js`

Do not delete `config.js`.

## Supabase

No new Supabase SQL is required for Phase 13.

Cloudflare deploys automatically after the GitHub commit.
