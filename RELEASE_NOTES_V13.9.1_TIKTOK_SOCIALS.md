# FDH v13.9.1 — TikTok & Social Icons

## Changes
- Added a TikTok URL field to the league editor in the admin panel.
- TikTok URLs are preserved when editing or duplicating a league.
- League pages now show branded icon buttons for every linked Instagram, YouTube, Twitch, and TikTok account.
- Social links open safely in a new tab and include accessible labels.

## Required database step
Before saving TikTok links, run `SUPABASE_MIGRATION_V13.9.1_TIKTOK.sql` in the Supabase SQL Editor.

## Test checklist
1. Run the SQL migration.
2. Open Admin > Leagues and add a TikTok profile URL.
3. Save the league and reopen it to confirm the URL remains populated.
4. Open the public league page and verify the TikTok icon appears and opens the correct URL.
5. Confirm Instagram, YouTube, and Twitch icons only appear when those URLs exist.
