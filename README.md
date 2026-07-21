# FN Leagues 2.0 — Phase 2

Phase 2 adds:

- Add, edit and delete leagues from the admin dashboard
- Upload league logos and banners
- Featured league toggle
- Dedicated public league pages
- Existing public schedule, live races and rankings
- Your existing Supabase login

## Important: preserve config.js

This ZIP deliberately does not include `config.js`.

Keep the working `config.js` already in your GitHub repository. Do not delete it.

## Before uploading Phase 2

### 1. Confirm the Storage bucket exists

In Supabase, create a public bucket named:

`league-assets`

### 2. Add Storage policies

Open `storage-policies.sql` from this download.

In Supabase:

1. Open SQL Editor.
2. Create a new query.
3. Paste the contents of `storage-policies.sql`.
4. Click Run.

## Upload to GitHub

Upload these files to the root of the repository:

- index.html
- admin.html
- app.js
- admin.js
- styles.css
- league.html
- league.js
- README.md

Do not upload `config.example.js` over your working `config.js`.

You do not need to upload `storage-policies.sql` to the website; it is only an instruction file for Supabase.

After committing, Cloudflare deploys automatically.

## Using the dashboard

Open:

`https://fn-leagues.pages.dev/admin.html`

Select **Leagues** in the sidebar.

You can:

- Add a league
- Edit an existing league
- Delete a league
- Upload a logo
- Upload a banner
- Mark it as featured

The public league page uses:

`league.html?id=LEAGUE_ID`

The website creates these links automatically.
