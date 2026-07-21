# FN Leagues 2.0 — Phase 12B

Phase 12B adds league galleries and media management.

## New public features

- Gallery section on every league page
- Featured gallery image
- Responsive gallery layout
- Image captions
- Click-to-expand lightbox
- Previous and next controls
- Keyboard controls:
  - Escape closes the lightbox
  - Left arrow shows the previous image
  - Right arrow shows the next image

## New admin features

A new Gallery tab allows admins to:

- Choose a league
- Drag and drop an image
- Add an optional caption
- Mark an image as featured
- Change the featured image
- Delete gallery images permanently
- Filter gallery images by league

## Required Supabase update

Open:

`phase-12b-gallery.sql`

Then:

1. Open Supabase.
2. Open SQL Editor.
3. Create a new query.
4. Paste the complete SQL file.
5. Click Run.

This creates the gallery table and its permissions.

## Storage

Gallery files use your existing public bucket:

`league-assets`

No new bucket is required.

## Update GitHub

Upload:

- admin.html
- admin.js
- league.js
- styles.css
- README.md

Keep your existing `config.js`.

Cloudflare deploys automatically after the commit.
