# FDH — Phase 12C

Phase 12C completes the League Showcase package and rebrands the entire
website from FN Leagues to FDH.

## Full FDH rebrand

- Website name changed to FDH
- Uploaded FDH logo used across all pages
- Black and red colour system
- Dark glass panels
- Red gradients and glow effects
- Updated favicon
- Rebranded homepage, rankings, league pages and admin dashboard
- Existing page layouts and features remain intact

The logo is stored at:

`images/fdh-logo.png`

## Phase 12C next-race features

- Premium large next-race card
- Optional race/circuit artwork
- Race artwork uploads from the admin dashboard
- Large countdown
- Live-state design when a race is marked live
- League time and timezone
- Viewer local time and timezone
- Watch Stream button
- Join Discord button
- Event Page button
- Add to Google Calendar
- Add to Outlook
- Download Apple Calendar / ICS file
- Improved mobile layout

## Required Supabase update

Open:

`phase-12c-fdh-rebrand-next-race.sql`

Then:

1. Open Supabase.
2. Open SQL Editor.
3. Create a new query.
4. Paste the full SQL file.
5. Click Run.

This adds race-artwork fields to the existing races table.

## Storage

Race artwork uses the existing public bucket:

`league-assets`

Files are stored inside:

`races/<league-id>/`

## Update GitHub

Upload all of these:

- `images/fdh-logo.png`
- `index.html`
- `app.js`
- `admin.html`
- `admin.js`
- `league.html`
- `league.js`
- `rankings.html`
- `rankings.js`
- `styles.css`
- `README.md`

Keep your existing `config.js`.

Do not upload the SQL file unless you want to retain it as documentation.
Cloudflare deploys automatically after the commit.
