# FN Leagues 2.0 — Phase 11

Phase 11 adds the Community Hub, draft publishing, and smart rankings.

## Community Hub

The homepage can now show:

- Announcement banner
- League of the Week
- Race of the Week
- Featured livestream
- Trending leagues
- Recently added leagues

There are no news cards.

## Admin Community tab

Admins can:

- Create and style announcements
- Add an announcement button and expiry
- Choose League of the Week
- Choose Race of the Week
- Add a YouTube, Twitch or Kick stream
- Select up to six trending leagues
- Control recently added leagues
- Save a private draft
- Publish all Community Hub changes at once

## Smart rankings

Rankings now automatically adjust when:

- Adding a ranked league
- Moving a league up
- Moving a league down
- Inserting a league into an occupied position
- Deleting a ranked league

You can also:

- Drag and drop rankings
- Use up/down arrow buttons
- Edit a tier without manually fixing every other position

## Required Supabase update

Open:

`phase-11-community-smart-rankings.sql`

Then:

1. Open Supabase.
2. Open SQL Editor.
3. Create a new query.
4. Paste the complete SQL file.
5. Click Run.

## Update GitHub

Upload:

- index.html
- app.js
- admin.html
- admin.js
- styles.css
- README.md

Keep your existing `config.js`.

Do not upload the SQL file to GitHub unless you want it stored as documentation.
