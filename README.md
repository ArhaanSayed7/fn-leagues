# FN Leagues 2.0 — Phase 3

Phase 3 adds full race management.

## New features

- Add races
- Edit races
- Delete races
- Assign a race to an existing league
- Add date, time and timezone
- Add event links
- Add stream links
- Mark a race as live
- Turn live status on or off from the race list
- Public homepage automatically shows live and upcoming races
- Dedicated league pages automatically show linked races

## Important

Keep your existing working `config.js`.

This ZIP does not require any new SQL if your earlier `races` table already contains:

- `league_id`
- `league_name`
- `event_name`
- `category`
- `circuit`
- `race_date`
- `race_time`
- `timezone`
- `event_url`
- `is_live`
- `stream_url`

Those fields were added during the earlier setup.

## Upload to GitHub

Upload these files:

- admin.html
- admin.js
- styles.css
- README.md

The other Phase 2 public files can remain as they are.

You may also upload all website files from this folder except:

- config.example.js
- storage-policies.sql

Do not overwrite your existing `config.js`.

## After deployment

1. Wait for Cloudflare to show a green deployment.
2. Open:
   `https://fn-leagues.pages.dev/admin.html`
3. Sign in.
4. Click **Races**.
5. Add your first race.

The league must already exist before you can assign a race to it.
