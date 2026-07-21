# FN Leagues 2.0 — Phase 10

Phase 10 adds stronger interactions, a full rankings page,
and admin workflow improvements.

## Public website updates

- Homepage rankings now show only the top 10 leagues
- New `rankings.html` page shows every ranked league
- Full rankings page supports:
  - Search
  - Tier filtering
  - Animated tier statistics
  - Links to league pages
- Featured league cards float, tilt and lift on hover
- League-directory cards float, tilt and lift on hover
- League logos gently animate while their card is hovered
- Reduced-motion accessibility remains supported

## Admin updates

- Search leagues
- Search rankings
- Duplicate a league
- Drag-and-drop logo uploads
- Drag-and-drop banner uploads
- Immediate image previews

## Database changes

No Supabase SQL update is required.

## Update GitHub

Upload:

- index.html
- app.js
- rankings.html
- rankings.js
- admin.html
- admin.js
- styles.css
- README.md

Keep your existing `config.js`.

Cloudflare deploys automatically after you commit the files.
