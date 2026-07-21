# FN Leagues 2.0 — Phase 5

Phase 5 changes the league ranking system to tiers.

## Ranking fields

Each ranking now contains only:

- Position
- League
- Tier

Available tiers:

- S Tier
- A Tier
- B Tier
- C Tier

The old points, wins, podiums and rating fields are removed.

## Public ranking design

The public table now shows:

- Position
- League logo
- League name
- League banner behind the league identity
- Tier badge

Each tier has its own visual style.

## Required Supabase migration

Before uploading the website update:

1. Open `phase-5-ranking-migration.sql`.
2. Copy all of it.
3. Open Supabase → SQL Editor.
4. Create a new query.
5. Paste the SQL.
6. Click Run.

This adds the tier field and removes the old ranking fields.

## Upload to GitHub

Upload:

- index.html
- app.js
- admin.html
- admin.js
- league.js
- styles.css
- README.md

Keep your existing `config.js`.

You do not need to upload the SQL file to the website.

After committing, Cloudflare deploys automatically.
