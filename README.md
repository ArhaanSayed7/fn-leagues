# FN Leagues 2.0 — Phase 7

Phase 7 adds complete league session history and a countdown for every upcoming race.

## New features

- Every league page keeps a complete archive of past sessions
- History is automatically generated from race dates
- Newest completed sessions appear first
- Every upcoming race has its own countdown
- Countdowns update every second
- The next-event countdown now includes seconds
- The league summary shows how many sessions have been held
- Past sessions retain event and replay/stream links

## How history works

A race moves into Session History automatically when:

- Its scheduled date and time have passed
- It is not currently marked live

No manual archive button is needed.

## Update GitHub

Upload:

- league.js
- styles.css
- README.md

You may also upload `league.html`; it is included for convenience.

Keep your existing `config.js`.

No Supabase SQL update is required.
