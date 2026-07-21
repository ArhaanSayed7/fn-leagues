# FN Leagues 2.0 — Phase 6

Phase 6 upgrades the dedicated public league pages.

## New league-page features

- Larger league banner and logo
- Featured-league badge
- Position and tier summary
- Upcoming-race and live-race totals
- Dedicated live-race section
- Next-event countdown
- Upcoming-event timeline
- Automatic viewer-timezone conversion
- Original league time underneath
- Optional Instagram, YouTube and Twitch links
- Improved mobile layout
- Richer page animations

## Required Supabase update

Open:

`phase-6-league-socials.sql`

Then:

1. Open Supabase.
2. Open SQL Editor.
3. Create a new query.
4. Paste the complete SQL file.
5. Click Run.

This adds optional social-link fields to the leagues table.

## Update GitHub

Upload:

- league.html
- league.js
- admin.html
- admin.js
- styles.css
- README.md

Keep your existing `config.js`.

You do not need to upload the SQL file to GitHub.

## Adding social links

Open the admin dashboard and edit a league.

You will now see fields for:

- Instagram
- YouTube
- Twitch

Leave any field empty if that league does not use the platform.
